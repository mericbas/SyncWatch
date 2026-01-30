// SyncWatch Content Script - Works in all frames
(function() {
  'use strict';

  // Check if already initialized
  if (window.syncWatchInitialized) return;
  window.syncWatchInitialized = true;

  const isTopFrame = window === window.top;
  
  // State (only used in top frame for connection management)
  let state = {
    connectionStatus: 'disconnected',
    hasVideo: false,
    roomCode: null,
    peerConnected: false,
    isHost: false
  };

  let peer = null;
  let connection = null;
  let videoElement = null;
  let ignoreEvents = false;

  // ============ VIDEO DETECTION ============
  
  function findVideo() {
    const videos = document.querySelectorAll('video');
    if (videos.length === 0) return null;

    // Find largest video
    let largest = null;
    let maxArea = 0;
    
    videos.forEach(v => {
      const rect = v.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > maxArea && area > 1000) { // Min 1000px area
        maxArea = area;
        largest = v;
      }
    });

    return largest;
  }

  function initVideo() {
    videoElement = findVideo();
    
    if (videoElement) {
      console.log('[SyncWatch] Video found in', isTopFrame ? 'top frame' : 'iframe');
      state.hasVideo = true;
      attachVideoListeners();
      
      // Notify top frame if we're in an iframe
      if (!isTopFrame) {
        window.top.postMessage({ type: 'SYNCWATCH_VIDEO_FOUND', hasVideo: true }, '*');
      }
    } else {
      // Retry for dynamic videos
      setTimeout(initVideo, 2000);
    }
  }

  function attachVideoListeners() {
    if (!videoElement) return;

    videoElement.addEventListener('play', () => {
      if (ignoreEvents) return;
      sendVideoAction({ type: 'play', time: videoElement.currentTime });
    });

    videoElement.addEventListener('pause', () => {
      if (ignoreEvents) return;
      sendVideoAction({ type: 'pause', time: videoElement.currentTime });
    });

    videoElement.addEventListener('seeked', () => {
      if (ignoreEvents) return;
      sendVideoAction({ type: 'seek', time: videoElement.currentTime });
    });

    videoElement.addEventListener('ratechange', () => {
      if (ignoreEvents) return;
      sendVideoAction({ type: 'rate', rate: videoElement.playbackRate });
    });

    console.log('[SyncWatch] Video listeners attached');
  }

  // ============ VIDEO CONTROL ============

  function controlVideo(action) {
    if (!videoElement) {
      // Forward to iframes
      document.querySelectorAll('iframe').forEach(iframe => {
        try {
          iframe.contentWindow.postMessage({ type: 'SYNCWATCH_CONTROL', action }, '*');
        } catch (e) {}
      });
      return;
    }

    ignoreEvents = true;
    
    switch (action.type) {
      case 'play':
        if (action.time !== undefined) videoElement.currentTime = action.time;
        videoElement.play().catch(() => {});
        break;
      case 'pause':
        if (action.time !== undefined) videoElement.currentTime = action.time;
        videoElement.pause();
        break;
      case 'seek':
        videoElement.currentTime = action.time;
        break;
      case 'rate':
        videoElement.playbackRate = action.rate;
        break;
      case 'sync':
        videoElement.currentTime = action.time;
        videoElement.playbackRate = action.rate || 1;
        if (action.paused) {
          videoElement.pause();
        } else {
          videoElement.play().catch(() => {});
        }
        break;
    }

    setTimeout(() => { ignoreEvents = false; }, 200);
  }

  function getVideoState() {
    if (!videoElement) return null;
    return {
      time: videoElement.currentTime,
      rate: videoElement.playbackRate,
      paused: videoElement.paused
    };
  }

  // ============ P2P CONNECTION (Top Frame Only) ============

  function sendVideoAction(action) {
    if (isTopFrame) {
      // Send to peer
      if (connection && connection.open) {
        connection.send(action);
        console.log('[SyncWatch] Sent:', action);
      }
    } else {
      // Forward to top frame
      window.top.postMessage({ type: 'SYNCWATCH_VIDEO_ACTION', action }, '*');
    }
  }

  function createRoom(roomCode) {
    if (!isTopFrame) return;

    state.roomCode = roomCode;
    state.isHost = true;
    state.connectionStatus = 'connecting';

    peer = new Peer(roomCode, { debug: 0 });

    peer.on('open', (id) => {
      console.log('[SyncWatch] Room created:', id);
      state.connectionStatus = 'connected';
      updatePopup();
    });

    peer.on('connection', (conn) => {
      console.log('[SyncWatch] Peer connecting...');
      connection = conn;
      setupConnection();
    });

    peer.on('error', (err) => {
      console.error('[SyncWatch] Peer error:', err);
      if (err.type === 'unavailable-id') {
        // Generate new code and retry
        const newCode = roomCode + Math.random().toString(36).slice(-2);
        state.roomCode = newCode;
        leaveRoom();
        setTimeout(() => createRoom(newCode), 100);
        updatePopup();
      }
    });

    updatePopup();
  }

  function joinRoom(roomCode) {
    if (!isTopFrame) return;

    state.roomCode = roomCode;
    state.isHost = false;
    state.connectionStatus = 'connecting';

    peer = new Peer({ debug: 0 });

    peer.on('open', () => {
      console.log('[SyncWatch] Connecting to room:', roomCode);
      connection = peer.connect(roomCode, { reliable: true });
      setupConnection();
    });

    peer.on('error', (err) => {
      console.error('[SyncWatch] Peer error:', err);
      if (err.type === 'peer-unavailable') {
        alert('Oda bulunamadı. Kodu kontrol edin.');
        leaveRoom();
      }
    });

    updatePopup();
  }

  function setupConnection() {
    connection.on('open', () => {
      console.log('[SyncWatch] Connected!');
      state.peerConnected = true;
      updatePopup();
      showNotification('Bağlantı kuruldu!');

      // Request sync if joining
      if (!state.isHost) {
        connection.send({ type: 'requestSync' });
      }
    });

    connection.on('data', (data) => {
      console.log('[SyncWatch] Received:', data);

      if (data.type === 'requestSync') {
        const vs = getVideoStateFromAnyFrame();
        if (vs) {
          connection.send({ type: 'sync', ...vs });
        }
      } else {
        // Forward control to video (top frame or iframes)
        controlVideo(data);
      }
    });

    connection.on('close', () => {
      console.log('[SyncWatch] Connection closed');
      state.peerConnected = false;
      updatePopup();
      showNotification('Bağlantı kesildi');
    });
  }

  function leaveRoom() {
    if (connection) { connection.close(); connection = null; }
    if (peer) { peer.destroy(); peer = null; }
    state = {
      connectionStatus: 'disconnected',
      hasVideo: state.hasVideo,
      roomCode: null,
      peerConnected: false,
      isHost: false
    };
    updatePopup();
  }

  function syncNow() {
    const vs = getVideoStateFromAnyFrame();
    if (vs && connection && connection.open) {
      connection.send({ type: 'sync', ...vs });
      showNotification('Senkronize edildi!');
    }
  }

  function getVideoStateFromAnyFrame() {
    // Try local first
    if (videoElement) {
      return getVideoState();
    }
    // Will be handled via postMessage for iframes
    return null;
  }

  // ============ UI & MESSAGING ============

  function updatePopup() {
    chrome.runtime.sendMessage({
      action: 'stateUpdate',
      state: {
        ...state,
        hasVideo: videoElement !== null || state.hasVideo
      }
    }).catch(() => {});
  }

  function showNotification(message) {
    if (!isTopFrame) return;
    
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 999999;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white; padding: 16px 24px; border-radius: 12px;
      font-family: Arial, sans-serif; font-size: 14px; font-weight: bold;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
    `;
    el.textContent = '🎬 ' + message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ============ MESSAGE HANDLERS ============

  // From popup (via chrome.runtime)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!isTopFrame) {
      // In iframe, only handle video state requests
      if (msg.action === 'getVideoState' && videoElement) {
        sendResponse(getVideoState());
      }
      return true;
    }

    switch (msg.action) {
      case 'getState':
        state.hasVideo = videoElement !== null;
        sendResponse(state);
        break;
      case 'createRoom':
        createRoom(msg.roomCode);
        sendResponse({ success: true });
        break;
      case 'joinRoom':
        joinRoom(msg.roomCode);
        sendResponse({ success: true });
        break;
      case 'leaveRoom':
        leaveRoom();
        sendResponse({ success: true });
        break;
      case 'syncNow':
        syncNow();
        sendResponse({ success: true });
        break;
    }
    return true;
  });

  // From iframes (via postMessage)
  window.addEventListener('message', (event) => {
    if (!event.data || !event.data.type?.startsWith('SYNCWATCH_')) return;

    switch (event.data.type) {
      case 'SYNCWATCH_VIDEO_FOUND':
        if (isTopFrame) {
          state.hasVideo = true;
          updatePopup();
        }
        break;
      case 'SYNCWATCH_VIDEO_ACTION':
        if (isTopFrame && event.data.action) {
          sendVideoAction(event.data.action);
        }
        break;
      case 'SYNCWATCH_CONTROL':
        if (!isTopFrame && event.data.action) {
          controlVideo(event.data.action);
        }
        break;
    }
  });

  // ============ INIT ============

  // Watch for dynamic videos
  const observer = new MutationObserver(() => {
    if (!videoElement) initVideo();
  });
  observer.observe(document.body || document.documentElement, { 
    childList: true, 
    subtree: true 
  });

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideo);
  } else {
    initVideo();
  }

  console.log('[SyncWatch] Loaded in', isTopFrame ? 'top frame' : 'iframe');
})();
