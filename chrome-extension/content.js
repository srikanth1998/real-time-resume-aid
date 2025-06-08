
/* global chrome */
let extensionStatus = 'disconnected';

// No banner creation - extension operates invisibly in auto-mode
function updateBannerStatus(status, sessionId = null) {
  extensionStatus = status;
  // Only log status changes, no visual feedback
  console.log(`🔇 InterviewAce extension status (AUTO-MODE): ${status}${sessionId ? ' (Session: ' + sessionId.substring(0, 8) + '...)' : ''}`);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🔔 CONTENT SCRIPT RECEIVED MESSAGE (AUTO-MODE):', message);
  
  // Handle ping messages from background script
  if (message.action === 'ping') {
    console.log('🏓 Responding to ping from background (auto-mode)');
    sendResponse({ success: true });
    return true;
  }
  
  const { action, text, timestamp, sessionId } = message;
  
  if (action === 'setSessionId') {
    console.log('🎯 Session ID set for auto operation:', sessionId);
    updateBannerStatus('session-ready', sessionId);
    sendResponse({ success: true });
  }
  
  if (action === 'transcriptionStarted') {
    console.log('🎬 Starting auto-transcription mode');
    updateBannerStatus('transcribing', sessionId);
    sendResponse({ success: true });
  }
  
  if (action === 'transcriptionStopped') {
    console.log('🛑 Stopping auto-transcription (session remains active)');
    updateBannerStatus('stopped');
    sendResponse({ success: true });
  }
  
  // Handle transcription results - completely silent operation
  if (action === 'transcriptionResult' && text && text.trim()) {
    console.log('📢 PROCESSING AUTO-TRANSCRIPTION RESULT');
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
      source: 'interviewace-extension-auto',
      timestamp: timestamp || Date.now(),
      sessionId: sessionId,
      type: 'auto-transcription'
    };
    
    console.log('📨 Posting auto-transcription message:', messageData);
    window.postMessage(messageData, '*');
    
    // Also dispatch custom event
    console.log('🎯 Dispatching auto-transcription event');
    const transcriptionEvent = new CustomEvent('extensionTranscription', {
      detail: { 
        text: text,
        timestamp: timestamp || Date.now(),
        sessionId: sessionId,
        type: 'auto-transcription'
      }
    });
    window.dispatchEvent(transcriptionEvent);
    console.log('✅ Auto-transcription processed - sent to Supabase for cross-device sync');
    
    sendResponse({ success: true });
  }
  
  return true;
});

// Listen for messages from the web application
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.action === 'interviewAppReady') {
    console.log('🎯 INTERVIEW APP READY - AUTO-MODE ACTIVE');
    console.log('📢 Notifying app of auto-transcription capabilities...');
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension-auto',
      capabilities: ['localTranscription', 'crossDeviceSync', 'autoOperation', 'sessionPersistence'],
      timestamp: Date.now()
    }, '*');
    console.log('✅ Extension ready message posted with auto-operation capabilities');
  }
  
  if (event.data.action === 'testConnection') {
    console.log('🧪 TEST CONNECTION - AUTO-MODE');
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension-auto',
      capabilities: ['localTranscription', 'crossDeviceSync', 'autoOperation', 'sessionPersistence'],
      timestamp: Date.now()
    }, '*');
    console.log('✅ Test connection response sent with auto capabilities');
  }
});

// Notify web app that extension is loaded with auto capabilities
console.log('🚀 INTERVIEWACE AUTO-TRANSCRIPTION EXTENSION LOADED');
console.log('🌐 Page URL:', window.location.href);
window.postMessage({
  action: 'extensionReady',
  source: 'interviewace-extension-auto',
  capabilities: ['localTranscription', 'crossDeviceSync', 'autoOperation', 'sessionPersistence'],
  timestamp: Date.now()
}, '*');
console.log('✅ Initial extension ready message posted with auto-operation capabilities');
