
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
    
    // Send transcription to web application with multiple approaches for reliability
    const messageData = {
      action: 'processTranscription',
      text: text,
      source: 'interviewace-extension-auto',
      timestamp: timestamp || Date.now(),
      sessionId: sessionId,
      type: 'auto-transcription'
    };
    
    console.log('📨 Posting auto-transcription message:', messageData);
    
    // Method 1: Window postMessage (primary)
    try {
      window.postMessage(messageData, '*');
      console.log('✅ PostMessage sent successfully');
    } catch (error) {
      console.error('❌ PostMessage failed:', error);
    }
    
    // Method 2: Custom event dispatch (backup)
    try {
      const transcriptionEvent = new CustomEvent('extensionTranscription', {
        detail: { 
          text: text,
          timestamp: timestamp || Date.now(),
          sessionId: sessionId,
          type: 'auto-transcription'
        }
      });
      window.dispatchEvent(transcriptionEvent);
      console.log('✅ Custom event dispatched successfully');
    } catch (error) {
      console.error('❌ Custom event dispatch failed:', error);
    }
    
    // Method 3: Direct function call if available (additional backup)
    try {
      if (window.handleExtensionTranscription && typeof window.handleExtensionTranscription === 'function') {
        window.handleExtensionTranscription(text, sessionId, timestamp);
        console.log('✅ Direct function call successful');
      }
    } catch (error) {
      console.error('❌ Direct function call failed:', error);
    }
    
    console.log('✅ Auto-transcription processed - sent to app for display');
    
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

// Enhanced app ready detection
const notifyAppReady = () => {
  console.log('🚀 INTERVIEWACE AUTO-TRANSCRIPTION EXTENSION LOADED');
  console.log('🌐 Page URL:', window.location.href);
  
  // Send multiple ready messages to ensure delivery
  const readyMessage = {
    action: 'extensionReady',
    source: 'interviewace-extension-auto',
    capabilities: ['localTranscription', 'crossDeviceSync', 'autoOperation', 'sessionPersistence'],
    timestamp: Date.now()
  };
  
  // Send immediately
  window.postMessage(readyMessage, '*');
  
  // Send again after a short delay to catch late-loading apps
  setTimeout(() => {
    window.postMessage(readyMessage, '*');
    console.log('✅ Extension ready message re-sent for reliability');
  }, 1000);
  
  // Also expose a global function for direct access
  window.extensionReady = true;
  window.extensionCapabilities = ['localTranscription', 'crossDeviceSync', 'autoOperation', 'sessionPersistence'];
  
  console.log('✅ Extension ready state established');
};

// Notify when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', notifyAppReady);
} else {
  notifyAppReady();
}

// Also notify when page is fully loaded
window.addEventListener('load', notifyAppReady);
