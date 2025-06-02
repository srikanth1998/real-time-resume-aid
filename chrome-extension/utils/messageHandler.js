
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
    
    if (msg.action === 'toggle') {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          const state = this.captureManager.getState();
          if (state.isCapturing) {
            await this.captureManager.stopCapture();
          } else {
            await this.captureManager.startCapture(tab.id);
          }
        }
      } catch (error) {
        console.error('Error handling toggle:', error);
      }
    }
    
    // Handle audio data from offscreen
    if (msg.type === 'audio-data') {
      await this.captureManager.handleAudioData(msg.audioData);
    }
    
    // Handle messages from offscreen document
    if (msg.type === 'offscreen-stopped') {
      console.log('Received offscreen-stopped message');
      await this.captureManager.stopCapture();
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
