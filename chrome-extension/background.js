
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
    // Create offscreen document for audio processing and transcription
    await createOffscreen();
    
    // Get stream ID using the correct API
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    });
    
    if (!streamId) {
      throw new Error('Failed to get media stream ID');
    }
    
    console.log('Got stream ID:', streamId);
    
    // Send start message to offscreen with stream ID
    const response = await chrome.runtime.sendMessage({
      type: 'start-transcription',
      streamId: streamId
    });
    
    console.log('Offscreen response:', response);
    
    if (!response?.success) {
      const errorMessage = response?.error || 'Unknown error from offscreen';
      const errorDetails = response?.details || {};
      console.error('Offscreen error details:', errorDetails);
      throw new Error(`Offscreen error: ${errorMessage}`);
    }
    
    // Notify content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'transcriptionStarted'
    });
    
    isCapturing = true;
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#34a853' });
    console.log('✅ Transcription started');
    
  } catch (error) {
    console.error('❌ Error starting transcription:', error);
    isCapturing = false;
  }
}

async function stopTranscription(tab) {
  console.log('Stopping transcription...');
  
  try {
    // Send stop message to offscreen
    await chrome.runtime.sendMessage({
      type: 'stop-transcription'
    });
    
    // Notify content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'transcriptionStopped'
    });
    
    isCapturing = false;
    chrome.action.setBadgeText({ text: '' });
    console.log('✅ Transcription stopped');
    
  } catch (error) {
    console.error('❌ Error stopping transcription:', error);
  }
}

async function createOffscreen() {
  const existingContexts = await chrome.runtime.getContexts({});
  const offscreenDocument = existingContexts.find(
    (c) => c.contextType === 'OFFSCREEN_DOCUMENT'
  );

  if (!offscreenDocument) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording audio from tab for local transcription'
    });
  }
}

// Handle messages from offscreen document
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.type === 'transcription-result') {
    // Forward transcription to content script
    if (message.text && message.text.trim()) {
      console.log('Forwarding transcription:', message.text);
      
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'transcriptionResult',
          text: message.text,
          timestamp: Date.now()
        });
      }
    }
  }
  
  sendResponse({success: true});
  return true;
});
