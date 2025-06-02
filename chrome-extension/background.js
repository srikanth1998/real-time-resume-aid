
/* global chrome */
import TranscriptionService from './transcription/transcriptionService.js';

console.log('InterviewAce transcription background script loaded');

let isCapturing = false;
let transcriptionService = null;

// Initialize transcription service
async function initializeTranscription() {
  if (!transcriptionService) {
    transcriptionService = new TranscriptionService();
    await transcriptionService.initialize();
  }
}

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
    // Initialize transcription service
    await initializeTranscription();
    
    // Start tab capture
    const streamId = await chrome.tabCapture.capture({
      audio: true,
      video: false
    });
    
    if (!streamId) {
      throw new Error('Failed to capture tab audio');
    }
    
    // Create offscreen document for audio processing
    await createOffscreen();
    
    // Send start message to offscreen
    await chrome.runtime.sendMessage({
      type: 'start-transcription',
      streamId: streamId
    });
    
    // Notify content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'transcriptionStarted'
    });
    
    isCapturing = true;
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

// Handle messages
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.type === 'audio-data') {
    // Process audio data for transcription
    if (transcriptionService && message.audioData) {
      try {
        const text = await transcriptionService.transcribeAudio(message.audioData);
        
        if (text && text.trim()) {
          console.log('Transcribed text:', text);
          
          // Send transcription to content script
          const tabs = await chrome.tabs.query({active: true, currentWindow: true});
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'transcriptionResult',
              text: text,
              timestamp: Date.now()
            });
          }
        }
      } catch (error) {
        console.error('Error processing transcription:', error);
      }
    }
  }
  
  sendResponse({success: true});
  return true;
});
