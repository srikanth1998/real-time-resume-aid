
/* global chrome */
import { OffscreenManager } from './offscreenManager.js';
import { UIManager } from './uiManager.js';

/**
 * Manages audio capture lifecycle and state
 */
export class CaptureManager {
  constructor() {
    this.isCapturing = false;
    this.currentTabId = null;
    this.audioBuffer = [];
    this.maxBufferSize = 1000;
    console.log('CaptureManager initialized');
  }

  async ensureOffscreen() {
    return await OffscreenManager.ensureOffscreen();
  }

  async startCapture(tabId) {
    try {
      console.log('=== STARTING AUDIO CAPTURE ===');
      console.log('Starting capture for tab:', tabId);
      
      // Check if we're already capturing
      if (this.isCapturing) {
        console.log('Already capturing, stopping current capture first');
        await this.stopCapture();
        // Small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('Ensuring offscreen document...');
      await this.ensureOffscreen();
      
      // Test offscreen communication
      try {
        const pingResponse = await chrome.runtime.sendMessage({ type: 'ping' });
        if (!pingResponse?.success) {
          throw new Error('Offscreen document not responding to ping');
        }
        console.log('✅ Offscreen communication verified');
      } catch (pingError) {
        console.error('❌ Offscreen communication test failed:', pingError);
        throw new Error('Failed to communicate with offscreen document');
      }

      // ask Chrome for a stream-ID for that tab
      console.log('Requesting media stream ID for tab:', tabId);
      const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
      console.log('Got stream ID:', streamId);

      if (!streamId) {
        throw new Error('Failed to get media stream ID');
      }

      // kick the off-screen page
      console.log('Sending offscreen-start message with streamId:', streamId);
      const response = await chrome.runtime.sendMessage({ 
        type: 'offscreen-start', 
        streamId: streamId 
      });
      console.log('Offscreen start response:', response);

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to start offscreen capture');
      }

      this.isCapturing = true;
      this.currentTabId = tabId;
      
      console.log('Notifying content script of capture start...');
      await UIManager.notifyContentScript(tabId, 'captureStarted');
      
      UIManager.setRecordingBadge();
      console.log('=== AUDIO CAPTURE STARTED SUCCESSFULLY ===');
      
    } catch (err) {
      console.error('=== CAPTURE FAILED ===', err);
      // Ensure we reset state if capture failed
      this.isCapturing = false;
      this.currentTabId = null;
      UIManager.clearBadge();
      
      // Try to clean up any partial setup
      try {
        await chrome.runtime.sendMessage({ type: 'offscreen-stop' });
      } catch (cleanupErr) {
        console.warn('Error during cleanup:', cleanupErr);
      }
      
      throw err;
    }
  }

  async stopCapture() {
    try {
      console.log('=== STOPPING AUDIO CAPTURE ===');
      
      try {
        const response = await chrome.runtime.sendMessage({ type: 'offscreen-stop' });
        console.log('Offscreen stop response:', response);
      } catch (err) {
        console.warn('Error sending stop message to offscreen:', err);
      }
      
      if (this.currentTabId) {
        await UIManager.notifyContentScript(this.currentTabId, 'captureStopped');
      }
    } catch (err) {
      console.error('Error in stopCapture:', err);
    } finally {
      // Always reset state even if errors occurred
      this.isCapturing = false;
      this.currentTabId = null;
      UIManager.clearBadge();
      console.log('=== AUDIO CAPTURE STOPPED ===');
    }
  }

  async handleAudioData(audioData) {
    console.log('=== RECEIVED AUDIO DATA FROM OFFSCREEN ===');
    console.log('Audio data length:', audioData?.length);
    console.log('Current tab ID:', this.currentTabId);
    console.log('Is capturing:', this.isCapturing);
    
    // Try to send to current tab's content script
    if (this.currentTabId && this.isCapturing && audioData && audioData.length > 0) {
      try {
        console.log('Attempting to forward audio to content script...');
        await chrome.tabs.sendMessage(this.currentTabId, {
          action: 'audioData',
          audioData: audioData
        });
        console.log('✅ Audio data forwarded to content script successfully');
      } catch (err) {
        console.warn('❌ Content script not available, buffering audio data:', err.message);
        
        // Buffer audio data if content script isn't available
        this.audioBuffer.push(audioData);
        
        // Keep buffer size manageable
        if (this.audioBuffer.length > this.maxBufferSize) {
          this.audioBuffer = this.audioBuffer.slice(-this.maxBufferSize);
        }
        
        // Try to inject content script if it's not loaded
        const injected = await UIManager.injectContentScript(this.currentTabId);
        
        if (injected && this.audioBuffer.length > 0) {
          console.log('Sending buffered audio data, items:', this.audioBuffer.length);
          for (const bufferedAudio of this.audioBuffer) {
            try {
              await chrome.tabs.sendMessage(this.currentTabId, {
                action: 'audioData',
                audioData: bufferedAudio
              });
            } catch (bufferErr) {
              console.warn('Error sending buffered audio:', bufferErr);
            }
          }
          this.audioBuffer = []; // Clear buffer after sending
          console.log('✅ Buffered audio data sent successfully');
        }
      }
    } else {
      console.warn('❌ Cannot forward audio: currentTabId=', this.currentTabId, 'isCapturing=', this.isCapturing, 'audioDataLength=', audioData?.length);
    }
  }

  getState() {
    return {
      isCapturing: this.isCapturing,
      currentTabId: this.currentTabId
    };
  }
}
