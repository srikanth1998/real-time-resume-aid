
/* global chrome */
import { BadgeManager } from './badgeManager.js';

/**
 * Manages transcription lifecycle and offscreen communication
 */
export class TranscriptionManager {
  constructor() {
    this.isCapturing = false;
    this.offscreenCreated = false;
    this.currentTabId = null;
  }

  async startTranscription(tab, sessionManager) {
    const isChromeExtensionContext = () => {
      return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    };

    if (!isChromeExtensionContext()) {
      console.warn('Chrome extension context not available');
      return;
    }

    const sessionState = sessionManager.getState();
    console.log('🚀 AUTO-STARTING SILENT TRANSCRIPTION FOR TAB:', tab.id);
    console.log('🎯 USING PERSISTED SESSION ID:', sessionState.currentSessionId);
    
    if (!sessionState.currentSessionId) {
      console.warn('⚠️ No session ID available - need to visit interview page first');
      return;
    }
    
    this.currentTabId = tab.id;
    
    try {
      await this.ensureContentScript(tab.id);
      await this.cleanupOffscreen();
      await this.createOffscreen();
      await this.waitForOffscreenReady();
      
      console.log('Getting stream ID for tab:', tab.id);
      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: tab.id
      });
      
      if (!streamId) {
        throw new Error('Failed to get media stream ID - tab may not have audio or permission denied');
      }

      console.log('Got stream ID:', streamId);
      
      const response = await this.sendMessageToOffscreen({
        type: 'start-transcription',
        streamId: streamId,
        sessionId: sessionState.currentSessionId
      });
      
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to start transcription in offscreen');
      }
      
      await this.notifyContentScript(tab.id, 'transcriptionStarted');
      
      this.isCapturing = true;
      BadgeManager.setBadgeForActiveCapture();
      console.log('✅ AUTO-TRANSCRIPTION started successfully for tab:', tab.id, 'session:', sessionState.currentSessionId);
      
    } catch (error) {
      console.error('❌ Error starting auto-transcription:', error);
      this.currentTabId = null;
      this.isCapturing = false;
      BadgeManager.clearBadge();
      await this.cleanupOffscreen();
      throw error;
    }
  }

  async stopTranscription(tab) {
    const isChromeExtensionContext = () => {
      return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    };

    if (!isChromeExtensionContext()) return;

    console.log('🛑 AUTO-STOPPING silent transcription...');
    
    try {
      if (this.offscreenCreated) {
        await this.sendMessageToOffscreen({
          type: 'stop-transcription'
        });
      }
      
      await this.notifyContentScript(tab.id, 'transcriptionStopped');
      
      this.isCapturing = false;
      this.currentTabId = null;
      BadgeManager.clearBadge();
      
      console.log('✅ AUTO-TRANSCRIPTION stopped - session remains available');
      
    } catch (error) {
      console.error('❌ Error stopping auto-transcription:', error);
    } finally {
      await this.cleanupOffscreen();
    }
  }

  // Helper methods for offscreen management
  async ensureContentScript(tabId) {
    const isChromeExtensionContext = () => {
      return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    };

    if (!isChromeExtensionContext()) return;

    try {
      await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      console.log('Content script already injected for tab:', tabId);
    } catch (error) {
      console.log('Content script not found for tab:', tabId, ', injecting...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        console.log('✅ Content script injected successfully for tab:', tabId);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (injectError) {
        console.warn('❌ Could not inject content script:', injectError.message);
      }
    }
  }

  async notifyContentScript(tabId, action) {
    const isChromeExtensionContext = () => {
      return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    };

    if (!tabId || !isChromeExtensionContext()) return;
    
    try {
      await chrome.tabs.sendMessage(tabId, { action });
      console.log(`✅ Content script notified (tab ${tabId}): ${action}`);
    } catch (error) {
      console.warn(`Could not notify content script (${action}):`, error.message);
    }
  }

  async createOffscreen() {
    const isChromeExtensionContext = () => {
      return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    };

    if (!isChromeExtensionContext()) return;

    try {
      console.log('Creating offscreen document...');
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Recording audio from tab for local transcription'
      });
      
      this.offscreenCreated = true;
      console.log('✅ Offscreen document created');
    } catch (error) {
      console.error('Error creating offscreen document:', error);
      this.offscreenCreated = false;
      throw error;
    }
  }

  async cleanupOffscreen() {
    const isChromeExtensionContext = () => {
      return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    };

    if (!isChromeExtensionContext()) return;

    try {
      if (this.offscreenCreated) {
        console.log('Cleaning up offscreen document...');
        await chrome.offscreen.closeDocument();
        console.log('✅ Offscreen document closed');
      }
    } catch (error) {
      console.warn('Error cleaning up offscreen:', error);
    } finally {
      this.offscreenCreated = false;
    }
  }

  async waitForOffscreenReady() {
    const isChromeExtensionContext = () => {
      return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    };

    if (!isChromeExtensionContext()) return;

    console.log('Waiting for offscreen to be ready...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    for (let i = 0; i < 30; i++) {
      try {
        console.log(`Ping attempt ${i + 1}...`);
        const response = await this.sendMessageToOffscreen({ type: 'ping' }, 3000);
        if (response?.success) {
          console.log('✅ Offscreen is ready');
          return;
        } else {
          console.log(`Ping attempt ${i + 1} got invalid response:`, response);
        }
      } catch (error) {
        console.log(`Ping attempt ${i + 1} failed:`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error('Offscreen document failed to become ready after 30 attempts');
  }

  async sendMessageToOffscreen(message, timeoutMs = 15000) {
    const isChromeExtensionContext = () => {
      return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    };

    if (!isChromeExtensionContext()) {
      throw new Error('Chrome extension context not available');
    }

    return new Promise((resolve, reject) => {
      if (!this.offscreenCreated) {
        reject(new Error('Offscreen document not created'));
        return;
      }
      
      const timeout = setTimeout(() => {
        reject(new Error(`Message timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      
      try {
        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          resolve(response);
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  getState() {
    return {
      isCapturing: this.isCapturing,
      currentTabId: this.currentTabId,
      offscreenCreated: this.offscreenCreated
    };
  }
}
