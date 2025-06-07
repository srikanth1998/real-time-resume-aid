
/* global chrome */
let banner;
let extensionStatus = 'disconnected';

function ensureBanner() {
  if (banner) return banner;
  banner = document.createElement('div');
  banner.style.cssText =
    'position:fixed;bottom:24px;right:24px;max-width:340px;padding:12px 16px;'
  + 'font:14px/1.4 sans-serif;color:#fff;background:#34a853;border-radius:12px;'
  + 'box-shadow:0 4px 12px rgba(0,0,0,.35);z-index:2147483647;transition:all 0.3s ease;';
  banner.textContent = '🎤 InterviewAce - Extension connected and ready';
  banner.hidden = true;
  document.documentElement.appendChild(banner);
  return banner;
}

function updateBannerStatus(status) {
  const b = ensureBanner();
  extensionStatus = status;
  
  switch (status) {
    case 'connected':
      b.style.background = '#34a853';
      b.textContent = '🎤 InterviewAce - Extension connected and ready';
      break;
    case 'transcribing':
      b.style.background = '#34a853';
      b.textContent = '🎤 InterviewAce - Audio capture active, transcribing...';
      break;
    case 'processing':
      b.style.background = '#1976d2';
      b.textContent = '🧠 InterviewAce - Processing speech...';
      break;
    case 'stopped':
      b.style.background = '#757575';
      b.textContent = '⏹️ InterviewAce - Transcription stopped';
      break;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🔔 CONTENT SCRIPT RECEIVED MESSAGE:', message);
  console.log('📋 Message details:', {
    action: message.action,
    text: message.text ? `"${message.text.substring(0, 50)}..."` : 'undefined',
    timestamp: message.timestamp
  });
  
  // Handle ping messages from background script
  if (message.action === 'ping') {
    console.log('🏓 Responding to ping from background');
    sendResponse({ success: true });
    return true;
  }
  
  const { action, text, timestamp } = message;
  const b = ensureBanner();
  
  if (action === 'transcriptionStarted') {
    console.log('🎬 Showing transcription banner');
    updateBannerStatus('transcribing');
    b.hidden = false;
    sendResponse({ success: true });
  }
  
  if (action === 'transcriptionStopped') {
    console.log('🛑 Hiding transcription banner');
    updateBannerStatus('stopped');
    setTimeout(() => {
      b.hidden = true;
    }, 2000);
    sendResponse({ success: true });
  }
  
  // Handle transcription results and forward to web application
  if (action === 'transcriptionResult' && text && text.trim()) {
    console.log('📢 PROCESSING TRANSCRIPTION RESULT FROM BACKGROUND');
    console.log('📝 Transcribed text:', text);
    console.log('⏰ Timestamp:', timestamp);
    
    // Show processing status briefly
    updateBannerStatus('processing');
    setTimeout(() => {
      if (extensionStatus === 'processing') {
        updateBannerStatus('transcribing');
      }
    }, 1000);
    
    // Send transcription to web application using multiple methods for reliability
    const messageData = {
      action: 'processTranscription',
      text: text,
      source: 'interviewace-extension',
      timestamp: timestamp || Date.now(),
      type: 'real-time-transcription'
    };
    
    console.log('📨 Posting window message:', messageData);
    window.postMessage(messageData, '*');
    
    // Also dispatch custom event
    console.log('🎯 Dispatching extensionTranscription event');
    const transcriptionEvent = new CustomEvent('extensionTranscription', {
      detail: { 
        text: text,
        timestamp: timestamp || Date.now(),
        type: 'real-time-transcription'
      }
    });
    window.dispatchEvent(transcriptionEvent);
    console.log('✅ Extension transcription event dispatched');
    
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open for async response
});

// Listen for messages from the web application
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.action === 'interviewAppReady') {
    console.log('🎯 INTERVIEW APP READY MESSAGE RECEIVED');
    console.log('📢 Notifying that extension is ready...');
    
    // Show connected banner
    updateBannerStatus('connected');
    ensureBanner().hidden = false;
    
    // Notify app that extension is ready
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension',
      capabilities: ['localTranscription', 'privacyFocused', 'audioPassthrough'],
      timestamp: Date.now()
    }, '*');
    console.log('✅ Extension ready message posted');
  }
  
  if (event.data.action === 'testConnection') {
    console.log('🧪 TEST CONNECTION MESSAGE RECEIVED');
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension',
      capabilities: ['localTranscription', 'privacyFocused', 'audioPassthrough'],
      timestamp: Date.now()
    }, '*');
    console.log('✅ Test connection response sent');
  }
});

// Notify web app that extension is loaded
console.log('🚀 INTERVIEWACE EXTENSION LOADED');
console.log('🌐 Page URL:', window.location.href);

// Extract session ID from URL and log it
function extractSessionIdFromURL() {
  try {
    const url = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      console.log('✅ Content script detected session ID:', sessionId);
      return sessionId;
    } else {
      console.log('⚠️ No session ID found in URL');
      return null;
    }
  } catch (error) {
    console.error('Error extracting session ID:', error);
    return null;
  }
}

const sessionId = extractSessionIdFromURL();
if (sessionId) {
  console.log('📍 Current session ID:', sessionId);
}

// Initial extension ready message
window.postMessage({
  action: 'extensionReady',
  source: 'interviewace-extension',
  capabilities: ['localTranscription', 'privacyFocused', 'audioPassthrough'],
  sessionId: sessionId, // Include session ID in the message
  timestamp: Date.now()
}, '*');
console.log('✅ Initial extension ready message posted with session ID:', sessionId);
