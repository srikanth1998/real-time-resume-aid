
/* global chrome */

/**
 * Handles incoming messages from background script and web application
 */
export class MessageHandler {
  constructor(transcriptionHandler, uiManager) {
    this.transcriptionHandler = transcriptionHandler;
    this.uiManager = uiManager;
  }

  setupChromeMessageListener() {
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
        this.transcriptionHandler.updateBannerStatus('session-ready', sessionId);
        this.uiManager.showTrigger(); // Show manual trigger when session is ready
        this.uiManager.showButton(); // Show manual button when session is ready
        sendResponse({ success: true });
      }
      
      if (action === 'transcriptionStarted') {
        console.log('🎬 Starting auto-transcription mode');
        this.transcriptionHandler.updateBannerStatus('transcribing', sessionId);
        sendResponse({ success: true });
      }
      
      if (action === 'transcriptionStopped') {
        console.log('🛑 Stopping auto-transcription (session remains active)');
        this.transcriptionHandler.updateBannerStatus('stopped');
        this.uiManager.showTrigger(); // Show trigger again when stopped
        this.uiManager.showButton(); // Show button again when stopped
        sendResponse({ success: true });
      }
      
      // Handle transcription results - completely silent operation
      if (action === 'transcriptionResult' && text && text.trim()) {
        this.transcriptionHandler.processTranscriptionResult(text, sessionId, timestamp);
        sendResponse({ success: true });
      }
      
      return true;
    });
  }

  setupWindowMessageListener() {
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
  }
}
