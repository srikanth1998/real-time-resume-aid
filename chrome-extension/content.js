/* global chrome */
let extensionStatus = 'disconnected';
let floatingTrigger = null;
let manualTriggerButton = null;

// Create a manual trigger button for starting transcription
function createManualTriggerButton() {
  if (manualTriggerButton) return manualTriggerButton;
  
  manualTriggerButton = document.createElement('div');
  manualTriggerButton.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 120px;
    height: 40px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 2147483647;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    transition: all 0.3s ease;
    font-size: 12px;
    color: white;
    font-weight: 600;
    backdrop-filter: blur(10px);
    opacity: 0.9;
    border: 1px solid rgba(255,255,255,0.2);
  `;
  
  manualTriggerButton.innerHTML = '🎤 Start Recording';
  manualTriggerButton.title = 'Click to start audio transcription';
  
  // Hover effects
  manualTriggerButton.addEventListener('mouseenter', () => {
    manualTriggerButton.style.opacity = '1';
    manualTriggerButton.style.transform = 'scale(1.05) translateY(-2px)';
    manualTriggerButton.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
  });
  
  manualTriggerButton.addEventListener('mouseleave', () => {
    manualTriggerButton.style.opacity = '0.9';
    manualTriggerButton.style.transform = 'scale(1) translateY(0px)';
    manualTriggerButton.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
  });
  
  // Click handler for manual transcription start
  manualTriggerButton.addEventListener('click', () => {
    console.log('🖱️ Manual trigger button clicked');
    handleManualTranscriptionStart();
  });
  
  document.documentElement.appendChild(manualTriggerButton);
  return manualTriggerButton;
}

// Create a subtle floating trigger element
function createFloatingTrigger() {
  if (floatingTrigger) return floatingTrigger;
  
  floatingTrigger = document.createElement('div');
  floatingTrigger.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: rgba(52, 168, 83, 0.9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 2147483647;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
    font-size: 18px;
    backdrop-filter: blur(10px);
    opacity: 0.7;
  `;
  
  floatingTrigger.innerHTML = '🎤';
  floatingTrigger.title = 'Start InterviewAce Transcription';
  
  // Hover effects
  floatingTrigger.addEventListener('mouseenter', () => {
    floatingTrigger.style.opacity = '1';
    floatingTrigger.style.transform = 'scale(1.1)';
  });
  
  floatingTrigger.addEventListener('mouseleave', () => {
    floatingTrigger.style.opacity = '0.7';
    floatingTrigger.style.transform = 'scale(1)';
  });
  
  // Click handler
  floatingTrigger.addEventListener('click', () => {
    console.log('🖱️ Manual transcription trigger clicked');
    handleManualStart();
  });
  
  document.documentElement.appendChild(floatingTrigger);
  return floatingTrigger;
}

function handleManualTranscriptionStart() {
  console.log('🚀 Manual transcription start requested via button');
  
  // Update button state to show it's starting
  if (manualTriggerButton) {
    manualTriggerButton.innerHTML = '⏳ Starting...';
    manualTriggerButton.style.background = 'linear-gradient(135deg, #ffa726 0%, #ff9800 100%)';
  }
  
  // Send message to background script to start transcription with current tab
  chrome.runtime.sendMessage({
    action: 'manual-start-transcription',
    timestamp: Date.now(),
    forceStart: true // Force start even if auto-detection failed
  }).then(response => {
    if (response?.success) {
      console.log('✅ Manual transcription started successfully');
      updateButtonState('active');
      updateTriggerState('active');
    } else {
      console.error('❌ Failed to start manual transcription:', response?.error);
      updateButtonState('error');
    }
  }).catch(error => {
    console.error('❌ Error starting manual transcription:', error);
    updateButtonState('error');
  });
}

function handleManualStart() {
  console.log('🚀 Manual transcription start requested');
  
  // Send message to background script to start transcription
  chrome.runtime.sendMessage({
    action: 'manual-start-transcription',
    tabId: getCurrentTabId(),
    timestamp: Date.now()
  }).then(response => {
    if (response?.success) {
      console.log('✅ Manual transcription started successfully');
      updateTriggerState('active');
    } else {
      console.error('❌ Failed to start manual transcription:', response?.error);
    }
  }).catch(error => {
    console.error('❌ Error starting manual transcription:', error);
  });
}

function getCurrentTabId() {
  // Helper to get current tab ID (will be provided by background script)
  return new URLSearchParams(window.location.search).get('tabId') || 'unknown';
}

function updateButtonState(state) {
  if (!manualTriggerButton) return;
  
  switch (state) {
    case 'active':
      manualTriggerButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)';
      manualTriggerButton.innerHTML = '🔴 Recording';
      manualTriggerButton.title = 'Transcription Active - Click to stop';
      break;
    case 'processing':
      manualTriggerButton.style.background = 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';
      manualTriggerButton.innerHTML = '🟡 Processing';
      manualTriggerButton.title = 'Processing Audio...';
      break;
    case 'stopped':
      manualTriggerButton.style.background = 'linear-gradient(135deg, #757575 0%, #424242 100%)';
      manualTriggerButton.innerHTML = '⚪ Stopped';
      manualTriggerButton.title = 'Transcription Stopped';
      break;
    case 'error':
      manualTriggerButton.style.background = 'linear-gradient(135deg, #f44336 0%, #c62828 100%)';
      manualTriggerButton.innerHTML = '❌ Error';
      manualTriggerButton.title = 'Error - Click to retry';
      break;
    default:
      manualTriggerButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      manualTriggerButton.innerHTML = '🎤 Start Recording';
      manualTriggerButton.title = 'Click to start audio transcription';
  }
}

function updateTriggerState(state) {
  if (!floatingTrigger) return;
  
  switch (state) {
    case 'active':
      floatingTrigger.style.background = 'rgba(25, 118, 210, 0.9)';
      floatingTrigger.innerHTML = '🔵';
      floatingTrigger.title = 'InterviewAce Transcription Active';
      break;
    case 'processing':
      floatingTrigger.style.background = 'rgba(255, 193, 7, 0.9)';
      floatingTrigger.innerHTML = '🟡';
      floatingTrigger.title = 'Processing Audio...';
      break;
    case 'stopped':
      floatingTrigger.style.background = 'rgba(117, 117, 117, 0.9)';
      floatingTrigger.innerHTML = '⚪';
      floatingTrigger.title = 'Transcription Stopped';
      break;
    default:
      floatingTrigger.style.background = 'rgba(52, 168, 83, 0.9)';
      floatingTrigger.innerHTML = '🎤';
      floatingTrigger.title = 'Start InterviewAce Transcription';
  }
}

function hideTrigger() {
  if (floatingTrigger) {
    floatingTrigger.style.display = 'none';
  }
}

function showTrigger() {
  if (floatingTrigger) {
    floatingTrigger.style.display = 'flex';
  } else {
    createFloatingTrigger();
  }
}

function hideButton() {
  if (manualTriggerButton) {
    manualTriggerButton.style.display = 'none';
  }
}

function showButton() {
  if (manualTriggerButton) {
    manualTriggerButton.style.display = 'flex';
  } else {
    createManualTriggerButton();
  }
}

// No banner creation - extension operates invisibly in auto-mode with manual trigger
function updateBannerStatus(status, sessionId = null) {
  extensionStatus = status;
  // Only log status changes, no visual feedback except trigger state
  console.log(`🔇 InterviewAce extension status (AUTO-MODE): ${status}${sessionId ? ' (Session: ' + sessionId.substring(0, 8) + '...)' : ''}`);
  
  // Update trigger state based on status
  updateTriggerState(status === 'transcribing' ? 'active' : status);
  updateButtonState(status === 'transcribing' ? 'active' : status);
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
    showTrigger(); // Show manual trigger when session is ready
    showButton(); // Show manual button when session is ready
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
    showTrigger(); // Show trigger again when stopped
    showButton(); // Show button again when stopped
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
  
  // Show manual triggers after initialization
  setTimeout(() => {
    showTrigger();
    showButton();
  }, 2000);
};

// Notify when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', notifyAppReady);
} else {
  notifyAppReady();
}

// Also notify when page is fully loaded
window.addEventListener('load', notifyAppReady);

// Hide triggers when user scrolls (to avoid interference)
let scrollTimeout;
window.addEventListener('scroll', () => {
  if (floatingTrigger) {
    floatingTrigger.style.opacity = '0.3';
  }
  if (manualTriggerButton) {
    manualTriggerButton.style.opacity = '0.6';
  }
  
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    if (floatingTrigger) {
      floatingTrigger.style.opacity = '0.7';
    }
    if (manualTriggerButton) {
      manualTriggerButton.style.opacity = '0.9';
    }
  }, 1000);
});
