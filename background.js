// Background Service Worker
// Manages communication between popup and all content scripts (including iframes)

let activeTabId = null;
let roomState = {
  roomCode: null,
  isHost: false,
  peerConnected: false
};

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[SyncWatch BG] Message received:', message, 'from:', sender);

  if (message.target === 'background') {
    handleBackgroundMessage(message, sender, sendResponse);
    return true;
  }

  // Forward messages between popup and content scripts
  if (message.target === 'content') {
    forwardToAllFrames(message);
  }

  return true;
});

async function handleBackgroundMessage(message, sender, sendResponse) {
  switch (message.action) {
    case 'getActiveTab':
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      sendResponse({ tabId: tab?.id });
      break;

    case 'findVideo':
      // Ask all frames if they have a video
      const tabId = message.tabId;
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId, allFrames: true },
          func: () => {
            const videos = document.querySelectorAll('video');
            if (videos.length > 0) {
              return { hasVideo: true, frameId: window.frameId };
            }
            return { hasVideo: false };
          }
        });
        
        const frameWithVideo = results.find(r => r.result?.hasVideo);
        sendResponse({ found: !!frameWithVideo, frameId: frameWithVideo?.frameId });
      } catch (e) {
        console.error('[SyncWatch BG] Error finding video:', e);
        sendResponse({ found: false, error: e.message });
      }
      break;

    case 'stateUpdate':
      roomState = { ...roomState, ...message.state };
      break;
  }
}

async function forwardToAllFrames(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  } catch (e) {
    console.error('[SyncWatch BG] Error forwarding message:', e);
  }
}

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  console.log('[SyncWatch BG] Port connected:', port.name);
});
