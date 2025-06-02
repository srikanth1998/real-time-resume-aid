
/* global chrome */

console.log('InterviewAce transcription background script loaded');

let isCapturing = false;

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
  }
});

async function startTranscription(tab) {
  console.log('Starting transcription...');
  
  try {
    // First, ensure we have a clean slate
    await cleanupOffscreen();
    
    // Create offscreen document
    await createOffscreen();
    
    // Wait a bit for offscreen to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test communication
    const pingSuccess = await testOffscreenCommunication();
    if (!pingSuccess) {
      throw new Error('Failed to establish communication with offscreen document');
    }
    
    // Get stream ID using the correct API
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    });
    
    if (!streamId) {
      throw new Error('Failed to get media stream ID');
    }
    
    console.log('Got stream ID:', streamId);
    
    // Send start message to offscreen with stream ID
    const response = await sendMessageToOffscreen({
      type: 'start-transcription',
      streamId: streamId
    });
    
    console.log('Offscreen response:', response);
    
    if (!response?.success) {
      const errorMessage = response?.error || 'Unknown error from offscreen';
      console.error('Offscreen error details:', response?.details);
      throw new Error(`Offscreen error: ${errorMessage}`);
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
    console.log('✅ Transcription started');
    
  } catch (error) {
    console.error('❌ Error starting transcription:', error);
    isCapturing = false;
    await cleanupOffscreen();
  }
}

async function stopTranscription(tab) {
  console.log('Stopping transcription...');
  
  try {
    // Send stop message to offscreen
    await sendMessageToOffscreen({
      type: 'stop-transcription'
    });
    
    // Notify content script
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
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    
    if (existingContexts.length > 0) {
      console.log('Offscreen document already exists, closing it first');
      await chrome.offscreen.closeDocument();
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('Creating new offscreen document...');
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording audio from tab for local transcription'
    });
    
    console.log('✅ Offscreen document created');
  } catch (error) {
    console.error('Error creating offscreen document:', error);
    throw error;
  }
}

async function cleanupOffscreen() {
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    
    if (existingContexts.length > 0) {
      console.log('Cleaning up existing offscreen document...');
      await chrome.offscreen.closeDocument();
      console.log('✅ Offscreen document closed');
    }
  } catch (error) {
    console.warn('Error cleaning up offscreen:', error);
  }
}

async function testOffscreenCommunication() {
  try {
    console.log('Testing offscreen communication...');
    const response = await sendMessageToOffscreen({ type: 'ping' });
    const success = response?.success === true;
    console.log('Ping test result:', success);
    return success;
  } catch (error) {
    console.error('Ping test failed:', error);
    return false;
  }
}

async function sendMessageToOffscreen(message) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Message timeout'));
    }, 5000);
    
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
    // Forward transcription to content script
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
