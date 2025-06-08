
/* global chrome */
let banner;
let extensionStatus = 'disconnected';

function ensureBanner() {
  if (banner) return banner;
  banner = document.createElement('div');
  banner.style.cssText =
    'position:fixed;bottom:24px;right:24px;max-width:360px;padding:12px 16px;'
  + 'font:14px/1.4 sans-serif;color:#fff;background:#34a853;border-radius:12px;'
  + 'box-shadow:0 4px 12px rgba(0,0,0,.35);z-index:2147483647;transition:all 0.3s ease;';
  banner.textContent = '🎤 InterviewAce - Ready for independent transcription';
  banner.hidden = true;
  document.documentElement.appendChild(banner);
  return banner;
}

function updateBannerStatus(status, sessionId = null) {
  const b = ensureBanner();
  extensionStatus = status;
  
  switch (status) {
    case 'transcribing':
      b.style.background = '#34a853';
      b.textContent = `🎤 InterviewAce - Recording (Independent Mode)${sessionId ? ' - Session: ' + sessionId.substring(0, 8) + '...' : ''}`;
      break;
    case 'processing':
      b.style.background = '#1976d2';
      b.textContent = '🧠 InterviewAce - Processing speech (Independent)...';
      break;
    case 'stopped':
      b.style.background = '#757575';
      b.textContent = '⏹️ InterviewAce - Transcription stopped';
      break;
    case 'session-ready':
      b.style.background = '#1976d2';
      b.textContent = `📱 InterviewAce - Session ready${sessionId ? ' - ' + sessionId.substring(0, 8) + '...' : ''}`;
      break;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🔔 CONTENT SCRIPT RECEIVED MESSAGE:', message);
  
  // Handle ping messages from background script
  if (message.action === 'ping') {
    console.log('🏓 Responding to ping from background');
    sendResponse({ success: true });
    return true;
  }
  
  const { action, text, timestamp, sessionId } = message;
  const b = ensureBanner();
  
  if (action === 'setSessionId') {
    console.log('🎯 Session ID set for independent operation:', sessionId);
    updateBannerStatus('session-ready', sessionId);
    b.hidden = false;
    setTimeout(() => {
      if (extensionStatus === 'session-ready') {
        b.hidden = true;
      }
    }, 3000);
    sendResponse({ success: true });
  }
  
  if (action === 'transcriptionStarted') {
    console.log('🎬 Starting independent transcription mode');
    updateBannerStatus('transcribing', sessionId);
    b.hidden = false;
    sendResponse({ success: true });
  }
  
  if (action === 'transcriptionStopped') {
    console.log('🛑 Stopping transcription (independent mode continues)');
    updateBannerStatus('stopped');
    setTimeout(() => {
      b.hidden = true;
    }, 2000);
    sendResponse({ success: true });
  }
  
  // Handle transcription results - note these still work for local feedback
  if (action === 'transcriptionResult' && text && text.trim()) {
    console.log('📢 PROCESSING TRANSCRIPTION RESULT (INDEPENDENT MODE)');
    console.log('📝 Transcribed text:', text);
    console.log('🎯 Session ID:', sessionId);
    
    // Show processing status briefly
    updateBannerStatus('processing');
    setTimeout(() => {
      if (extensionStatus === 'processing') {
        updateBannerStatus('transcribing', sessionId);
      }
    }, 1500);
    
    // Send transcription to web application (if present)
    const messageData = {
      action: 'processTranscription',
      text: text,
      source: 'interviewace-extension-independent',
      timestamp: timestamp || Date.now(),
      sessionId: sessionId,
      type: 'independent-transcription'
    };
    
    console.log('📨 Posting independent transcription message:', messageData);
    window.postMessage(messageData, '*');
    
    // Also dispatch custom event
    console.log('🎯 Dispatching independent transcription event');
    const transcriptionEvent = new CustomEvent('extensionTranscription', {
      detail: { 
        text: text,
        timestamp: timestamp || Date.now(),
        sessionId: sessionId,
        type: 'independent-transcription'
      }
    });
    window.dispatchEvent(transcriptionEvent);
    console.log('✅ Independent transcription processed - sent to Supabase for cross-device sync');
    
    sendResponse({ success: true });
  }
  
  return true;
});

// Listen for messages from the web application
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.action === 'interviewAppReady') {
    console.log('🎯 INTERVIEW APP READY - INDEPENDENT MODE ACTIVE');
    console.log('📢 Notifying app of independent transcription capabilities...');
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension-independent',
      capabilities: ['localTranscription', 'crossDeviceSync', 'independentOperation', 'sessionPersistence'],
      timestamp: Date.now()
    }, '*');
    console.log('✅ Extension ready message posted with independent operation capabilities');
  }
  
  if (event.data.action === 'testConnection') {
    console.log('🧪 TEST CONNECTION - INDEPENDENT MODE');
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension-independent',
      capabilities: ['localTranscription', 'crossDeviceSync', 'independentOperation', 'sessionPersistence'],
      timestamp: Date.now()
    }, '*');
    console.log('✅ Test connection response sent with independent capabilities');
  }
});

// Notify web app that extension is loaded with independent capabilities
console.log('🚀 INTERVIEWACE INDEPENDENT TRANSCRIPTION EXTENSION LOADED');
console.log('🌐 Page URL:', window.location.href);
window.postMessage({
  action: 'extensionReady',
  source: 'interviewace-extension-independent',
  capabilities: ['localTranscription', 'crossDeviceSync', 'independentOperation', 'sessionPersistence'],
  timestamp: Date.now()
}, '*');
console.log('✅ Initial extension ready message posted with independent operation capabilities');
