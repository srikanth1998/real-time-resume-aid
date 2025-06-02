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
    this.maxBufferSize = 50; // Reduced buffer size for faster processing
    this.lastAudioTime = 0;
    console.log('CaptureManager initialized');
  }

  async ensureOffscreen() {
    return await OffscreenManager.ensureOffscreen();
  }

  async startCapture(tabId) {
    try {
      console.log('=== STARTING REAL-TIME AUDIO CAPTURE ===');
      console.log('Starting capture for tab:', tabId);
      
      // Check if we're already capturing
      if (this.isCapturing) {
        console.log('Already capturing, stopping current capture first');
        await this.stopCapture();
        // Small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      console.log('Ensuring offscreen document...');
      await this.ensureOffscreen();
      
      // Test offscreen communication with retry
      let pingSuccess = false;
      for (let i = 0; i < 3; i++) {
        try {
          const pingResponse = await chrome.runtime.sendMessage({ type: 'ping' });
          if (pingResponse?.success) {
            pingSuccess = true;
            break;
          }
        } catch (pingError) {
          console.warn(`Ping attempt ${i + 1} failed:`, pingError);
          if (i < 2) await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (!pingSuccess) {
        throw new Error('Failed to establish offscreen communication after retries');
      }
      console.log('✅ Offscreen communication verified');

      // ask Chrome for a stream-ID for that tab
      console.log('Requesting media stream ID for tab:', tabId);
      const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
      console.log('Got stream ID:', streamId);

      if (!streamId) {
        throw new Error('Failed to get media stream ID');
      }

      // kick the off-screen page for real-time processing
      console.log('Sending offscreen-start message for REAL-TIME capture');
      const response = await chrome.runtime.sendMessage({ 
        type: 'offscreen-start', 
        streamId: streamId,
        realTime: true // Flag for real-time processing
      });
      console.log('Offscreen start response:', response);

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to start offscreen capture');
      }

      this.isCapturing = true;
      this.currentTabId = tabId;
      this.lastAudioTime = Date.now();
      
      console.log('Notifying content script of REAL-TIME capture start...');
      await UIManager.notifyContentScript(tabId, 'captureStarted');
      
      UIManager.setRecordingBadge();
      console.log('=== REAL-TIME AUDIO CAPTURE STARTED SUCCESSFULLY ===');
      
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
      console.log('=== STOPPING REAL-TIME AUDIO CAPTURE ===');
      
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
      this.audioBuffer = [];
      UIManager.clearBadge();
      console.log('=== REAL-TIME AUDIO CAPTURE STOPPED ===');
    }
  }

  async handleAudioData(audioData) {
    const now = Date.now();
    console.log('=== RECEIVED REAL-TIME AUDIO DATA ===');
    console.log('Audio data length:', audioData?.length);
    console.log('Current tab ID:', this.currentTabId);
    console.log('Is capturing:', this.isCapturing);
    console.log('Time since last audio:', now - this.lastAudioTime, 'ms');
    
    this.lastAudioTime = now;
    
    // Immediately try to send to current tab's content script
    if (this.currentTabId && this.isCapturing && audioData && audioData.length > 0) {
      try {
        console.log('🚀 REAL-TIME: Forwarding audio to content script immediately...');
        await chrome.tabs.sendMessage(this.currentTabId, {
          action: 'audioData',
          audioData: audioData,
          timestamp: now,
          realTime: true
        });
        console.log('✅ REAL-TIME audio forwarded successfully');
      } catch (err) {
        console.warn('❌ Content script not available for real-time audio:', err.message);
        
        // Minimal buffering for real-time experience
        this.audioBuffer.push({ audioData, timestamp: now });
        
        // Keep only recent audio (last 5 segments)
        if (this.audioBuffer.length > 5) {
          this.audioBuffer = this.audioBuffer.slice(-5);
        }
        
        // Try to inject content script if it's not loaded
        const injected = await UIManager.injectContentScript(this.currentTabId);
        
        if (injected && this.audioBuffer.length > 0) {
          console.log('Sending recent buffered audio data, items:', this.audioBuffer.length);
          for (const bufferedItem of this.audioBuffer) {
            try {
              await chrome.tabs.sendMessage(this.currentTabId, {
                action: 'audioData',
                audioData: bufferedItem.audioData,
                timestamp: bufferedItem.timestamp,
                realTime: true,
                buffered: true
              });
            } catch (bufferErr) {
              console.warn('Error sending buffered audio:', bufferErr);
            }
          }
          this.audioBuffer = []; // Clear buffer after sending
          console.log('✅ Buffered real-time audio sent successfully');
        }
      }
    } else {
      console.warn('❌ Cannot forward real-time audio: currentTabId=', this.currentTabId, 'isCapturing=', this.isCapturing, 'audioDataLength=', audioData?.length);
    }
  }

  getState() {
    return {
      isCapturing: this.isCapturing,
      currentTabId: this.currentTabId,
      lastAudioTime: this.lastAudioTime
    };
  }
}
