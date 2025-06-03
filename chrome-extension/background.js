/* global chrome */

console.log('InterviewAce transcription background script loaded');

let isCapturing = false;
let offscreenCreated = false;
let currentTabId = null;

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('=== EXTENSION ICON CLICKED ===');
  
  try {
    if (!isCapturing) {
      await startTranscription(tab);
    } else {
      await stopTranscription(tab);
    }
  } catch (error) {
    console.error('Error toggling transcription:', error);
    showErrorNotification(error.message);
  }
});

async function startTranscription(tab) {
  console.log('Starting transcription for tab:', tab.id);
  currentTabId = tab.id;
  
  try {
    // Ensure content script is injected
    await ensureContentScript(tab.id);
    
    // Clean up any existing offscreen first
    await cleanupOffscreen();
    
    // Create new offscreen document
    await createOffscreen();
    
    // Wait for offscreen to be ready
    await waitForOffscreenReady();
    
    // Get stream ID
    console.log('Getting stream ID for tab:', tab.id);
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    });
    
    if (!streamId) {
      throw new Error('Failed to get media stream ID - tab may not have audio or permission denied');
    }
    
    console.log('Got stream ID:', streamId);
    
    // Start transcription in offscreen
    const response = await sendMessageToOffscreen({
      type: 'start-transcription',
      streamId: streamId
    });
    
    if (!response?.success) {
      throw new Error(response?.error || 'Failed to start transcription in offscreen');
    }
    
    // Notify content script
    await notifyContentScript(tab.id, 'transcriptionStarted');
    
    isCapturing = true;
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#34a853' });
    console.log('✅ Transcription started successfully');
    
  } catch (error) {
    console.error('❌ Error starting transcription:', error);
    currentTabId = null;
    isCapturing = false;
    await cleanupOffscreen();
    throw error;
  }
}

async function stopTranscription(tab) {
  console.log('Stopping transcription...');
  
  try {
    if (offscreenCreated) {
      await sendMessageToOffscreen({
        type: 'stop-transcription'
      });
    }
    
    await notifyContentScript(tab.id, 'transcriptionStopped');
    
    isCapturing = false;
    currentTabId = null;
    chrome.action.setBadgeText({ text: '' });
    console.log('✅ Transcription stopped');
    
  } catch (error) {
    console.error('❌ Error stopping transcription:', error);
  } finally {
    await cleanupOffscreen();
  }
}

async function ensureContentScript(tabId) {
  try {
    // Test if content script is already injected
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    console.log('Content script already injected');
  } catch (error) {
    console.log('Content script not found, injecting...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      console.log('✅ Content script injected successfully');
      
      // Wait a moment for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (injectError) {
      console.warn('❌ Could not inject content script:', injectError.message);
      // Don't throw here - transcription can work without content script
    }
  }
}

async function notifyContentScript(tabId, action) {
  if (!tabId) return;
  
  try {
    await chrome.tabs.sendMessage(tabId, { action });
    console.log(`✅ Content script notified: ${action}`);
  } catch (error) {
    console.warn(`Could not notify content script (${action}):`, error.message);
    // Don't throw - this is not critical for transcription functionality
  }
}

async function createOffscreen() {
  try {
    console.log('Creating offscreen document...');
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording audio from tab for local transcription'
    });
    
    offscreenCreated = true;
    console.log('✅ Offscreen document created');
  } catch (error) {
    console.error('Error creating offscreen document:', error);
    offscreenCreated = false;
    throw error;
  }
}

async function cleanupOffscreen() {
  try {
    if (offscreenCreated) {
      console.log('Cleaning up offscreen document...');
      await chrome.offscreen.closeDocument();
      console.log('✅ Offscreen document closed');
    }
  } catch (error) {
    console.warn('Error cleaning up offscreen:', error);
  } finally {
    offscreenCreated = false;
  }
}

async function waitForOffscreenReady() {
  console.log('Waiting for offscreen to be ready...');
  
  for (let i = 0; i < 10; i++) {
    try {
      const response = await sendMessageToOffscreen({ type: 'ping' }, 1000);
      if (response?.success) {
        console.log('✅ Offscreen is ready');
        return;
      }
    } catch (error) {
      console.log(`Ping attempt ${i + 1} failed:`, error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  throw new Error('Offscreen document failed to become ready after 10 attempts');
}

async function sendMessageToOffscreen(message, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (!offscreenCreated) {
      reject(new Error('Offscreen document not created'));
      return;
    }
    
    const timeout = setTimeout(() => {
      reject(new Error(`Message timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    
    chrome.runtime.sendMessage(message, (response) => {
      clearTimeout(timeout);
      
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      resolve(response);
    });
  });
}

async function showErrorNotification(message) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'InterviewAce Transcription Error',
      message: message
    });
  } catch (error) {
    console.warn('Could not show notification:', error);
  }
}

// Handle messages from offscreen document
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('🔔 Background received message:', message);
  console.log('📋 Message details:', {
    type: message.type,
    text: message.text ? `"${message.text.substring(0, 50)}..."` : 'undefined',
    timestamp: message.timestamp,
    source: message.source
  });
  
  if (message.type === 'transcription-result') {
    if (message.text && message.text.trim()) {
      console.log('📢 Forwarding transcription to content script:', message.text);
      console.log('🎯 Target tab ID:', currentTabId);
      
      if (currentTabId) {
        try {
          const response = await chrome.tabs.sendMessage(currentTabId, {
            action: 'transcriptionResult',
            text: message.text,
            timestamp: message.timestamp || Date.now()
          });
          console.log('✅ Transcription forwarded to content script, response:', response);
        } catch (error) {
          console.error('❌ Error forwarding transcription to content script:', error);
        }
      } else {
        console.warn('⚠️ No current tab ID to forward transcription to');
      }
    } else {
      console.warn('⚠️ Received empty transcription text');
    }
  }
  
  sendResponse({success: true});
  return true;
});

// Clean up when extension is disabled/reloaded
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension suspending, cleaning up...');
  cleanupOffscreen();
});
