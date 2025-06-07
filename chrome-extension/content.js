
/* global chrome */
let banner;
let extensionStatus = 'disconnected';
let currentSessionId = null;

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

// Extract session ID from current page URL
function extractSessionIdFromURL() {
  try {
    const url = window.location.href;
    console.log('🔍 CONTENT SCRIPT: Extracting session ID from URL:', url);
    
    // Method 1: Query parameter session_id
    if (url.includes('session_id=')) {
      const match = url.match(/[?&]session_id=([^&#+]*)/);
      if (match && match[1]) {
        const sessionId = decodeURIComponent(match[1]);
        console.log('✅ CONTENT SCRIPT: Found session_id in query params:', sessionId);
        return sessionId;
      }
    }
    
    // Method 2: Query parameter sessionId (camelCase)
    if (url.includes('sessionId=')) {
      const match = url.match(/[?&]sessionId=([^&#+]*)/);
      if (match && match[1]) {
        const sessionId = decodeURIComponent(match[1]);
        console.log('✅ CONTENT SCRIPT: Found sessionId in query params:', sessionId);
        return sessionId;
      }
    }
    
    // Method 3: URL object parsing
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id') || urlParams.get('sessionId');
      if (sessionId) {
        console.log('✅ CONTENT SCRIPT: Extracted session ID from URL params:', sessionId);
        return sessionId;
      }
    } catch (urlError) {
      console.warn('CONTENT SCRIPT: Error parsing URL params:', urlError);
    }
    
    // Method 4: Check path for session ID like /interview/session-id
    try {
      const pathParts = window.location.pathname.split('/').filter(part => part.length > 0);
      console.log('🔍 CONTENT SCRIPT: Path parts:', pathParts);
      
      const interviewIndex = pathParts.findIndex(part => part.toLowerCase().includes('interview'));
      if (interviewIndex !== -1 && pathParts[interviewIndex + 1]) {
        const sessionId = pathParts[interviewIndex + 1];
        console.log('✅ CONTENT SCRIPT: Extracted session ID from path:', sessionId);
        return sessionId;
      }
    } catch (pathError) {
      console.warn('CONTENT SCRIPT: Error parsing URL path:', pathError);
    }
    
    console.log('❌ CONTENT SCRIPT: No session ID found in URL');
    return null;
  } catch (error) {
    console.error('CONTENT SCRIPT: Error extracting session ID:', error);
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🔔 CONTENT SCRIPT RECEIVED MESSAGE:', message);
  console.log('📋 Message details:', {
    action: message.action,
    text: message.text ? `"${message.text.substring(0, 50)}..."` : 'undefined',
    timestamp: message.timestamp,
    sessionId: message.sessionId || currentSessionId
  });
  
  // Handle ping messages from background script
  if (message.action === 'ping') {
    console.log('🏓 Responding to ping from background');
    sendResponse({ success: true });
    return true;
  }
  
  // Handle session ID setting from background script
  if (message.action === 'setSessionId') {
    currentSessionId = message.sessionId;
    console.log('🎯 CONTENT SCRIPT: Session ID set to:', currentSessionId);
    sendResponse({ success: true });
    return true;
  }
  
  const { action, text, timestamp, sessionId } = message;
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
    console.log('🎯 Session ID from message:', sessionId);
    console.log('🎯 Current session ID:', currentSessionId);
    
    // Use session ID from message or current session ID
    const finalSessionId = sessionId || currentSessionId;
    console.log('🎯 Final session ID for forwarding:', finalSessionId);
    
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
      sessionId: finalSessionId,
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
        sessionId: finalSessionId,
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
    
    // Include current session ID in response
    const sessionId = currentSessionId || extractSessionIdFromURL();
    if (sessionId && !currentSessionId) {
      currentSessionId = sessionId;
    }
    
    // Notify app that extension is ready
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension',
      capabilities: ['localTranscription', 'privacyFocused', 'audioPassthrough'],
      sessionId: currentSessionId,
      timestamp: Date.now()
    }, '*');
    console.log('✅ Extension ready message posted with session ID:', currentSessionId);
  }
  
  if (event.data.action === 'testConnection') {
    console.log('🧪 TEST CONNECTION MESSAGE RECEIVED');
    const sessionId = currentSessionId || extractSessionIdFromURL();
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension',
      capabilities: ['localTranscription', 'privacyFocused', 'audioPassthrough'],
      sessionId: sessionId,
      timestamp: Date.now()
    }, '*');
    console.log('✅ Test connection response sent with session ID:', sessionId);
  }
});

// Notify web app that extension is loaded
console.log('🚀 INTERVIEWACE EXTENSION LOADED');
console.log('🌐 Page URL:', window.location.href);

// Extract session ID from URL and set it
currentSessionId = extractSessionIdFromURL();
if (currentSessionId) {
  console.log('📍 Current session ID detected:', currentSessionId);
} else {
  console.log('⚠️ No session ID found in current URL');
}

// Initial extension ready message
window.postMessage({
  action: 'extensionReady',
  source: 'interviewace-extension',
  capabilities: ['localTranscription', 'privacyFocused', 'audioPassthrough'],
  sessionId: currentSessionId,
  timestamp: Date.now()
}, '*');
console.log('✅ Initial extension ready message posted with session ID:', currentSessionId);
