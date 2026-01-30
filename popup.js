// DOM Elements
const statusEl = document.getElementById('status');
const statusTextEl = statusEl.querySelector('.status-text');
const videoStatusEl = document.getElementById('videoStatus');
const videoStatusTextEl = document.getElementById('videoStatusText');
const mainMenuEl = document.getElementById('mainMenu');
const roomInfoEl = document.getElementById('roomInfo');
const syncControlsEl = document.getElementById('syncControls');
const roomCodeEl = document.getElementById('roomCode');
const roomCodeInput = document.getElementById('roomCodeInput');
const peerStatusEl = document.getElementById('peerStatus');

// Buttons
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const syncNowBtn = document.getElementById('syncNowBtn');

// Generate unique room code with timestamp
function generateRoomCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Add timestamp suffix for uniqueness
  const timestamp = Date.now().toString(36).slice(-4);
  return code + timestamp;
}

// Send message to content script
async function sendToContent(action, data = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    return chrome.tabs.sendMessage(tab.id, { action, ...data });
  }
}

// Update UI based on state
function updateUI(state) {
  // Connection status
  statusEl.className = 'status ' + state.connectionStatus;
  switch (state.connectionStatus) {
    case 'disconnected':
      statusTextEl.textContent = 'Bağlı değil';
      break;
    case 'connecting':
      statusTextEl.textContent = 'Bağlanıyor...';
      break;
    case 'connected':
      statusTextEl.textContent = 'Bağlı';
      break;
  }

  // Video status
  if (state.hasVideo) {
    videoStatusEl.className = 'video-status found';
    videoStatusTextEl.textContent = '✓ Video bulundu';
  } else {
    videoStatusEl.className = 'video-status not-found';
    videoStatusTextEl.textContent = '✗ Video bulunamadı';
  }

  // Room state
  if (state.roomCode) {
    mainMenuEl.classList.add('hidden');
    roomInfoEl.classList.remove('hidden');
    roomCodeEl.textContent = state.roomCode;

    if (state.peerConnected) {
      peerStatusEl.className = 'peer-status connected';
      peerStatusEl.innerHTML = '✓ Arkadaşın bağlandı!';
      syncControlsEl.classList.remove('hidden');
    } else {
      peerStatusEl.className = 'peer-status';
      peerStatusEl.innerHTML = '<span>Arkadaşın bekleniyor...</span>';
      syncControlsEl.classList.add('hidden');
    }
  } else {
    mainMenuEl.classList.remove('hidden');
    roomInfoEl.classList.add('hidden');
    syncControlsEl.classList.add('hidden');
  }
}

// Show toast notification
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}

// Initialize popup
async function init() {
  try {
    const state = await sendToContent('getState');
    if (state) {
      updateUI(state);
    }
  } catch (error) {
    console.log('Content script not ready');
  }
}

// Event Listeners
createRoomBtn.addEventListener('click', async () => {
  const roomCode = generateRoomCode();
  await sendToContent('createRoom', { roomCode });
  
  // Update UI immediately
  updateUI({
    connectionStatus: 'connecting',
    hasVideo: true,
    roomCode: roomCode,
    peerConnected: false
  });
});

joinRoomBtn.addEventListener('click', async () => {
  const roomCode = roomCodeInput.value.trim().toLowerCase();
  if (roomCode.length < 6) {
    showToast('Geçerli bir oda kodu girin');
    return;
  }
  
  await sendToContent('joinRoom', { roomCode });
  
  // Update UI immediately
  updateUI({
    connectionStatus: 'connecting',
    hasVideo: true,
    roomCode: roomCode,
    peerConnected: false
  });
});

copyCodeBtn.addEventListener('click', async () => {
  const code = roomCodeEl.textContent;
  await navigator.clipboard.writeText(code);
  showToast('Kod kopyalandı!');
});

leaveRoomBtn.addEventListener('click', async () => {
  await sendToContent('leaveRoom');
  updateUI({
    connectionStatus: 'disconnected',
    hasVideo: true,
    roomCode: null,
    peerConnected: false
  });
});

syncNowBtn.addEventListener('click', async () => {
  await sendToContent('syncNow');
  showToast('Senkronize edildi!');
});

// Listen for state updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'stateUpdate') {
    updateUI(message.state);
  }
});

// Initialize
init();
