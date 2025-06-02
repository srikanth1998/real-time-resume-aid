
/* global chrome */

console.log('InterviewAce transcription background script loaded');

let isCapturing = false;
let offscreenCreated = false;

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
    // Show error to user
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'transcriptionError',
        error: error.message
      });
    } catch (e) {
      console.warn('Could not notify content script of error:', e.message);
    }
  }
});

async function startTranscription(tab) {
  console.log('Starting transcription for tab:', tab.id);
  
  try {
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
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'transcriptionStarted'
      });
    } catch (e) {
      console.warn('Could not notify content script:', e.message);
    }
    
    isCapturing = true;
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#34a853' });
    console.log('✅ Transcription started successfully');
    
  } catch (error) {
    console.error('❌ Error starting transcription:', error);
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
    
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'transcriptionStopped'
      });
    } catch (e) {
      console.warn('Could not notify content script:', e.message);
    }
    
    isCapturing = false;
    chrome.action.setBadgeText({ text: '' });
    console.log('✅ Transcription stopped');
    
  } catch (error) {
    console.error('❌ Error stopping transcription:', error);
  } finally {
    await cleanupOffscreen();
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

// Handle messages from offscreen document
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.type === 'transcription-result') {
    if (message.text && message.text.trim()) {
      console.log('Forwarding transcription:', message.text);
      
      try {
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        if (tabs[0]) {
          await chrome.tabs.sendMessage(tabs[0].id, {
            action: 'transcriptionResult',
            text: message.text,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.warn('Could not forward transcription to content script:', error);
      }
    }
  }
  
  sendResponse({success: true});
  return true;
});
