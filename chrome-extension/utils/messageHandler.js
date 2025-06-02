
/* global chrome */

/**
 * Handles message routing and processing
 */
export class MessageHandler {
  constructor(captureManager) {
    this.captureManager = captureManager;
  }

  async handleMessage(msg, sender, sendResponse) {
    console.log('=== BACKGROUND RECEIVED MESSAGE ===', msg);
    
    try {
      if (msg.action === 'toggle') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          const state = this.captureManager.getState();
          if (state.isCapturing) {
            await this.captureManager.stopCapture();
          } else {
            await this.captureManager.startCapture(tab.id);
          }
        }
        if (sendResponse) sendResponse({ success: true });
        return;
      }
      
      // Handle audio data from offscreen
      if (msg.type === 'audio-data') {
        await this.captureManager.handleAudioData(msg.audioData);
        if (sendResponse) sendResponse({ success: true });
        return;
      }
      
      // Handle messages from offscreen document
      if (msg.type === 'offscreen-stopped') {
        console.log('Received offscreen-stopped message');
        await this.captureManager.stopCapture();
        if (sendResponse) sendResponse({ success: true });
        return;
      }
      
      // Handle ping/pong for connection testing
      if (msg.type === 'ping') {
        if (sendResponse) sendResponse({ success: true, message: 'pong' });
        return;
      }
      
    } catch (error) {
      console.error('Error in message handler:', error);
      if (sendResponse) sendResponse({ success: false, error: error.message });
    }
  }

  async handleIconClick(tab) {
    console.log('=== EXTENSION ICON CLICKED ===');
    console.log('Tab ID:', tab.id, 'URL:', tab.url);
    try {
      const state = this.captureManager.getState();
      if (state.isCapturing) {
        console.log('Currently capturing, will stop');
        await this.captureManager.stopCapture();
      } else {
        console.log('Not capturing, will start');
        await this.captureManager.startCapture(tab.id);
      }
    } catch (error) {
      console.error('Error handling icon click:', error);
    }
  }
}
