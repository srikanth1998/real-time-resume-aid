
/* global chrome */
let isCapturing   = false;
let currentTabId  = null;
let audioBuffer = [];
let maxBufferSize = 1000; // Limit buffer size

console.log('InterviewAce background script loaded');

/* ---------- helpers ---------- */
async function ensureOffscreen () {
  try {
    if (await chrome.offscreen.hasDocument?.()) {
      console.log('Offscreen document already exists');
      return;
    }
    console.log('Creating offscreen document');
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Process tab audio in hidden page'
    });
    console.log('Offscreen document created successfully');
  } catch (error) {
    console.error('Error creating offscreen document:', error);
    throw error;
  }
}

async function startCapture (tabId) {
  try {
    console.log('=== STARTING AUDIO CAPTURE ===');
    console.log('Starting capture for tab:', tabId);
    
    // Check if we're already capturing
    if (isCapturing) {
      console.log('Already capturing, stopping current capture first');
      await stopCapture();
      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await ensureOffscreen();

    // ask Chrome for a stream-ID for that tab
    console.log('Requesting media stream ID for tab:', tabId);
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
    console.log('Got stream ID:', streamId);

    // kick the off-screen page
    console.log('Sending offscreen-start message with streamId:', streamId);
    const response = await chrome.runtime.sendMessage({ type: 'offscreen-start', streamId });
    console.log('Offscreen start response:', response);

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to start offscreen capture');
    }

    isCapturing = true;
    currentTabId = tabId;
    
    // Notify content script
    try {
      console.log('Notifying content script of capture start');
      await chrome.tabs.sendMessage(tabId, { action: 'captureStarted' });
      console.log('Content script notified successfully');
    } catch (err) {
      console.warn('Failed to notify content script (this is okay if no content script is loaded):', err);
    }
    
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
    console.log('=== AUDIO CAPTURE STARTED SUCCESSFULLY ===');
    
  } catch (err) {
    console.error('=== CAPTURE FAILED ===', err);
    // Ensure we reset state if capture failed
    isCapturing = false;
    currentTabId = null;
    chrome.action.setBadgeText({ text: '' });
    
    // Try to clean up any partial setup
    try {
      await chrome.runtime.sendMessage({ type: 'offscreen-stop' });
    } catch (cleanupErr) {
      console.warn('Error during cleanup:', cleanupErr);
    }
    
    throw err;
  }
}

async function stopCapture () {
  try {
    console.log('=== STOPPING AUDIO CAPTURE ===');
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'offscreen-stop' });
      console.log('Offscreen stop response:', response);
    } catch (err) {
      console.warn('Error sending stop message to offscreen:', err);
    }
    
    if (currentTabId) {
      try {
        await chrome.tabs.sendMessage(currentTabId, { action: 'captureStopped' });
      } catch (err) {
        console.warn('Error notifying content script of stop:', err);
      }
    }
  } catch (err) {
    console.error('Error in stopCapture:', err);
  } finally {
    // Always reset state even if errors occurred
    isCapturing = false;
    currentTabId = null;
    chrome.action.setBadgeText({ text: '' });
    console.log('=== AUDIO CAPTURE STOPPED ===');
  }
}

/* ---------- UI triggers ---------- */

// toolbar-icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('=== EXTENSION ICON CLICKED ===');
  console.log('Tab ID:', tab.id, 'URL:', tab.url);
  try {
    if (isCapturing) {
      console.log('Currently capturing, will stop');
      await stopCapture();
    } else {
      console.log('Not capturing, will start');
      await startCapture(tab.id);
    }
  } catch (error) {
    console.error('Error handling icon click:', error);
  }
});

// popup "Start / Stop"
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  console.log('=== BACKGROUND RECEIVED MESSAGE ===', msg);
  
  if (msg.action === 'toggle') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        if (isCapturing) {
          await stopCapture();
        } else {
          await startCapture(tab.id);
        }
      }
    } catch (error) {
      console.error('Error handling toggle:', error);
    }
  }
  
  // Handle audio data from offscreen
  if (msg.type === 'audio-data') {
    console.log('=== RECEIVED AUDIO DATA FROM OFFSCREEN ===');
    console.log('Audio data length:', msg.audioData?.length);
    console.log('Current tab ID:', currentTabId);
    console.log('Is capturing:', isCapturing);
    
    // Try to send to current tab's content script
    if (currentTabId && isCapturing) {
      try {
        console.log('Attempting to forward audio to content script...');
        await chrome.tabs.sendMessage(currentTabId, {
          action: 'audioData',
          audioData: msg.audioData
        });
        console.log('✅ Audio data forwarded to content script successfully');
      } catch (err) {
        console.warn('❌ Content script not available, buffering audio data:', err.message);
        
        // Buffer audio data if content script isn't available
        audioBuffer.push(msg.audioData);
        
        // Keep buffer size manageable
        if (audioBuffer.length > maxBufferSize) {
          audioBuffer = audioBuffer.slice(-maxBufferSize);
        }
        
        // Try to inject content script if it's not loaded
        try {
          console.log('Attempting to inject content script...');
          await chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            files: ['content.js']
          });
          console.log('✅ Content script injected successfully');
          
          // Try sending buffered audio data
          if (audioBuffer.length > 0) {
            console.log('Sending buffered audio data, items:', audioBuffer.length);
            for (const bufferedAudio of audioBuffer) {
              await chrome.tabs.sendMessage(currentTabId, {
                action: 'audioData',
                audioData: bufferedAudio
              });
            }
            audioBuffer = []; // Clear buffer after sending
            console.log('✅ Buffered audio data sent successfully');
          }
        } catch (injectErr) {
          console.warn('❌ Could not inject content script:', injectErr.message);
        }
      }
    } else {
      console.warn('❌ Cannot forward audio: currentTabId=', currentTabId, 'isCapturing=', isCapturing);
    }
  }
  
  // Handle messages from offscreen document
  if (msg.type === 'offscreen-stopped') {
    console.log('Received offscreen-stopped message');
    await stopCapture();
  }
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
});
