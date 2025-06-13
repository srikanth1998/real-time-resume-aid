
/* global chrome */

/**
 * Handles transcription-related operations
 */
export class TranscriptionHandler {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.extensionStatus = 'disconnected';
  }

  handleManualTranscriptionStart() {
    console.log('🚀 Manual transcription start requested via button');
    
    // Update button state to show it's starting
    this.uiManager.updateButtonState('processing');
    if (this.uiManager.manualTriggerButton) {
      this.uiManager.manualTriggerButton.innerHTML = '⏳ Starting...';
      this.uiManager.manualTriggerButton.style.background = 'linear-gradient(135deg, #ffa726 0%, #ff9800 100%)';
    }
    
    // Send message to background script to start transcription with current tab
    chrome.runtime.sendMessage({
      action: 'manual-start-transcription',
      timestamp: Date.now(),
      forceStart: true // Force start even if auto-detection failed
    }).then(response => {
      if (response?.success) {
        console.log('✅ Manual transcription started successfully');
        this.uiManager.updateButtonState('active');
        this.uiManager.updateTriggerState('active');
      } else {
        console.error('❌ Failed to start manual transcription:', response?.error);
        this.uiManager.updateButtonState('error');
      }
    }).catch(error => {
      console.error('❌ Error starting manual transcription:', error);
      this.uiManager.updateButtonState('error');
    });
  }

  handleManualStart() {
    console.log('🚀 Manual transcription start requested');
    
    // Send message to background script to start transcription
    chrome.runtime.sendMessage({
      action: 'manual-start-transcription',
      tabId: this.getCurrentTabId(),
      timestamp: Date.now()
    }).then(response => {
      if (response?.success) {
        console.log('✅ Manual transcription started successfully');
        this.uiManager.updateTriggerState('active');
      } else {
        console.error('❌ Failed to start manual transcription:', response?.error);
      }
    }).catch(error => {
      console.error('❌ Error starting manual transcription:', error);
    });
  }

  getCurrentTabId() {
    // Helper to get current tab ID (will be provided by background script)
    return new URLSearchParams(window.location.search).get('tabId') || 'unknown';
  }

  updateBannerStatus(status, sessionId = null) {
    this.extensionStatus = status;
    // Only log status changes, no visual feedback except trigger state
    console.log(`🔇 InterviewAce extension status (AUTO-MODE): ${status}${sessionId ? ' (Session: ' + sessionId.substring(0, 8) + '...)' : ''}`);
    
    // Update trigger state based on status
    this.uiManager.updateTriggerState(status === 'transcribing' ? 'active' : status);
    this.uiManager.updateButtonState(status === 'transcribing' ? 'active' : status);
  }

  processTranscriptionResult(text, sessionId, timestamp) {
    console.log('📢 PROCESSING AUTO-TRANSCRIPTION RESULT');
    console.log('📝 Transcribed text:', text);
    console.log('🎯 Session ID:', sessionId);
    
    this.updateBannerStatus('processing');
    setTimeout(() => {
      if (this.extensionStatus === 'processing') {
        this.updateBannerStatus('transcribing', sessionId);
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
  }
}
