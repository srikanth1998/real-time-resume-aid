
/* global chrome, QRCode */

let currentSessionId = null;
let qrCodeInstance = null;

// DOM elements
const statusEl = document.getElementById('status');
const qrCodeEl = document.getElementById('qrcode');
const sessionInfoEl = document.getElementById('sessionInfo');
const sessionIdDisplayEl = document.getElementById('sessionIdDisplay');
const manualSessionIdEl = document.getElementById('manualSessionId');
const connectBtn = document.getElementById('connectBtn');
const generateNewBtn = document.getElementById('generateNewBtn');
const toggleBtn = document.getElementById('toggleBtn');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded');
  
  // Load existing session ID from storage
  const result = await chrome.storage.local.get(['sessionId']);
  if (result.sessionId) {
    currentSessionId = result.sessionId;
    updateUIWithSession(currentSessionId);
  } else {
    generateNewSession();
  }
  
  // Set up event listeners
  connectBtn.addEventListener('click', handleManualConnect);
  generateNewBtn.addEventListener('click', generateNewSession);
  toggleBtn.addEventListener('click', handleToggleTranscription);
  
  // Check current transcription status
  checkTranscriptionStatus();
});

// Generate a new session ID
function generateNewSession() {
  console.log('Generating new session ID');
  currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  saveSessionId(currentSessionId);
  updateUIWithSession(currentSessionId);
  statusEl.textContent = 'New session generated. Scan QR code with your phone.';
}

// Save session ID to Chrome storage
async function saveSessionId(sessionId) {
  await chrome.storage.local.set({ sessionId: sessionId });
  console.log('Session ID saved:', sessionId);
}

// Update UI with session information
function updateUIWithSession(sessionId) {
  console.log('Updating UI with session:', sessionId);
  
  // Show session info
  sessionIdDisplayEl.textContent = sessionId;
  sessionInfoEl.style.display = 'block';
  
  // Generate QR code
  const mobileUrl = `https://ab5cf0d4-af48-4db4-a29e-6081af8c9b49.lovableproject.com/mobile-companion?session_id=${sessionId}`;
  generateQRCode(mobileUrl);
  
  // Enable transcription button
  toggleBtn.disabled = false;
  
  // Send session ID to background script
  chrome.runtime.sendMessage({
    action: 'setSessionId',
    sessionId: sessionId
  }).catch(err => console.warn('Could not send session ID to background:', err));
}

// Generate QR code using a simpler approach
function generateQRCode(url) {
  console.log('Generating QR code for URL:', url);
  
  try {
    // Clear existing QR code
    qrCodeEl.innerHTML = '';
    
    // Check if QRCode is available
    if (typeof QRCode === 'undefined') {
      console.error('QRCode library not loaded');
      showFallbackUrl(url);
      return;
    }
    
    // Create QR code instance with simple configuration
    qrCodeInstance = new QRCode(qrCodeEl, {
      text: url,
      width: 200,
      height: 200,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    
    statusEl.textContent = 'QR code ready. Scan with your phone to connect.';
    console.log('QR code generated successfully');
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    showFallbackUrl(url);
  }
}

// Show fallback URL if QR code generation fails
function showFallbackUrl(url) {
  statusEl.textContent = 'QR code failed to load. Use URL below or manual entry.';
  
  // Create fallback URL display
  const urlDiv = document.createElement('div');
  urlDiv.style.cssText = 'font-size: 10px; word-break: break-all; border: 1px solid #ddd; padding: 8px; margin: 8px 0; background: #f9f9f9; border-radius: 4px;';
  urlDiv.innerHTML = `<strong>Mobile URL:</strong><br>${url}`;
  qrCodeEl.appendChild(urlDiv);
}

// Handle manual session ID connection
async function handleManualConnect() {
  const manualSessionId = manualSessionIdEl.value.trim();
  
  if (!manualSessionId) {
    statusEl.textContent = 'Please enter a session ID';
    return;
  }
  
  console.log('Connecting to manual session ID:', manualSessionId);
  currentSessionId = manualSessionId;
  await saveSessionId(currentSessionId);
  updateUIWithSession(currentSessionId);
  manualSessionIdEl.value = '';
  statusEl.textContent = 'Connected to session: ' + manualSessionId.substring(0, 10) + '...';
}

// Handle transcription toggle
async function handleToggleTranscription() {
  console.log('Toggle transcription clicked');
  
  if (!currentSessionId) {
    statusEl.textContent = 'No session ID. Generate or enter one first.';
    return;
  }
  
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      statusEl.textContent = 'No active tab found';
      return;
    }
    
    // Send message to background script to toggle transcription
    const response = await chrome.runtime.sendMessage({
      action: 'toggle',
      sessionId: currentSessionId,
      tabId: tab.id
    });
    
    if (response && response.success) {
      statusEl.textContent = response.isCapturing ? 'Transcription started' : 'Transcription stopped';
      toggleBtn.textContent = response.isCapturing ? 'Stop Transcription' : 'Start Transcription';
    } else {
      statusEl.textContent = 'Error toggling transcription';
    }
    
  } catch (error) {
    console.error('Error toggling transcription:', error);
    statusEl.textContent = 'Error: ' + error.message;
  }
  
  // Close popup
  window.close();
}

// Check current transcription status
async function checkTranscriptionStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
    if (response) {
      toggleBtn.textContent = response.isCapturing ? 'Stop Transcription' : 'Start Transcription';
      if (response.isCapturing) {
        statusEl.textContent = 'Transcription active';
      }
    }
  } catch (error) {
    console.warn('Could not get transcription status:', error);
  }
}
