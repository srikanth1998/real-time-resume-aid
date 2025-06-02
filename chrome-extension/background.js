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
    await cleanupOffscreen();
    await createOffscreen();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const pingSuccess = await testOffscreenCommunication();
    if (!pingSuccess) {
      throw new Error('Failed to establish communication with offscreen document');
    }
    
    console.log('🎯 Getting stream ID for tab:', tab.id);
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    });
    
    if (!streamId) {
      throw new Error('Failed to get media stream ID - tab may not have audio or permission denied');
    }
    
    console.log('✅ Got stream ID:', streamId);
    
    const response = await sendMessageToOffscreen({
      type: 'start-transcription',
      streamId: streamId
    });
    
    console.log('📨 Offscreen response:', response);
    
    if (!response?.success) {
      const errorMessage = response?.error || 'Unknown error from offscreen';
      const errorName = response?.errorName || 'UnknownError';
      const errorDetails = response?.errorDetails || {};
      
      console.error('❌ Offscreen error details:', errorDetails);
      console.error('❌ Error name:', errorName);
      console.error('❌ Error message:', errorMessage);
      
      // Show more specific error messages
      let userFriendlyMessage = '';
      if (errorMessage.includes('Permission denied') || errorMessage.includes('not-allowed')) {
        userFriendlyMessage = 'Permission denied. Please allow microphone access and try again.';
      } else if (errorMessage.includes('No audio tracks')) {
        userFriendlyMessage = 'No audio found on this tab. Make sure the tab is playing audio.';
      } else if (errorMessage.includes('Stream is not active')) {
        userFriendlyMessage = 'Tab audio stream is not active. Try refreshing the tab.';
      } else if (errorMessage.includes('MediaRecorder')) {
        userFriendlyMessage = 'Audio recording not supported. Try updating your browser.';
      } else {
        userFriendlyMessage = `Transcription failed: ${errorMessage}`;
      }
      
      throw new Error(userFriendlyMessage);
    }
    
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
    
    // Show user-friendly error in content script
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'transcriptionError',
        error: error.message
      });
    } catch (e) {
      console.warn('Could not notify content script of error:', e.message);
    }
  }
}

async function stopTranscription(tab) {
  console.log('Stopping transcription...');
  
  try {
    await sendMessageToOffscreen({
      type: 'stop-transcription'
    });
    
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
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    
    if (existingContexts.length > 0) {
      console.log('Offscreen document already exists, closing it first');
      await chrome.offscreen.closeDocument();
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
      reject(new Error('Message timeout after 5 seconds'));
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
