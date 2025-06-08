
/* global chrome */
let extensionStatus = 'disconnected';

// No banner creation - extension operates invisibly
function updateBannerStatus(status, sessionId = null) {
  extensionStatus = status;
  // Only log status changes, no visual feedback
  console.log(`🔇 InterviewAce extension status: ${status}${sessionId ? ' (Session: ' + sessionId.substring(0, 8) + '...)' : ''}`);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🔔 CONTENT SCRIPT RECEIVED MESSAGE (SILENT MODE):', message);
  
  // Handle ping messages from background script
  if (message.action === 'ping') {
    console.log('🏓 Responding to ping from background (silent)');
    sendResponse({ success: true });
    return true;
  }
  
  const { action, text, timestamp, sessionId } = message;
  
  if (action === 'setSessionId') {
    console.log('🎯 Session ID set for silent operation:', sessionId);
    updateBannerStatus('session-ready', sessionId);
    sendResponse({ success: true });
  }
  
  if (action === 'transcriptionStarted') {
    console.log('🎬 Starting silent transcription mode');
    updateBannerStatus('transcribing', sessionId);
    sendResponse({ success: true });
  }
  
  if (action === 'transcriptionStopped') {
    console.log('🛑 Stopping transcription (silent mode continues)');
    updateBannerStatus('stopped');
    sendResponse({ success: true });
  }
  
  // Handle transcription results - completely silent operation
  if (action === 'transcriptionResult' && text && text.trim()) {
    console.log('📢 PROCESSING TRANSCRIPTION RESULT (SILENT MODE)');
    console.log('📝 Transcribed text:', text);
    console.log('🎯 Session ID:', sessionId);
    
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
      source: 'interviewace-extension-silent',
      timestamp: timestamp || Date.now(),
      sessionId: sessionId,
      type: 'silent-transcription'
    };
    
    console.log('📨 Posting silent transcription message:', messageData);
    window.postMessage(messageData, '*');
    
    // Also dispatch custom event
    console.log('🎯 Dispatching silent transcription event');
    const transcriptionEvent = new CustomEvent('extensionTranscription', {
      detail: { 
        text: text,
        timestamp: timestamp || Date.now(),
        sessionId: sessionId,
        type: 'silent-transcription'
      }
    });
    window.dispatchEvent(transcriptionEvent);
    console.log('✅ Silent transcription processed - sent to Supabase for cross-device sync');
    
    sendResponse({ success: true });
  }
  
  return true;
});

// Listen for messages from the web application
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.action === 'interviewAppReady') {
    console.log('🎯 INTERVIEW APP READY - SILENT MODE ACTIVE');
    console.log('📢 Notifying app of silent transcription capabilities...');
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension-silent',
      capabilities: ['localTranscription', 'crossDeviceSync', 'silentOperation', 'sessionPersistence'],
      timestamp: Date.now()
    }, '*');
    console.log('✅ Extension ready message posted with silent operation capabilities');
  }
  
  if (event.data.action === 'testConnection') {
    console.log('🧪 TEST CONNECTION - SILENT MODE');
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension-silent',
      capabilities: ['localTranscription', 'crossDeviceSync', 'silentOperation', 'sessionPersistence'],
      timestamp: Date.now()
    }, '*');
    console.log('✅ Test connection response sent with silent capabilities');
  }
});

// Notify web app that extension is loaded with silent capabilities
console.log('🚀 INTERVIEWACE SILENT TRANSCRIPTION EXTENSION LOADED');
console.log('🌐 Page URL:', window.location.href);
window.postMessage({
  action: 'extensionReady',
  source: 'interviewace-extension-silent',
  capabilities: ['localTranscription', 'crossDeviceSync', 'silentOperation', 'sessionPersistence'],
  timestamp: Date.now()
}, '*');
console.log('✅ Initial extension ready message posted with silent operation capabilities');
