/* global chrome */
let isCapturing   = false;
let currentTabId  = null;

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
    console.log('Starting capture for tab:', tabId);
    
    // Check if we're already capturing
    if (isCapturing) {
      console.log('Already capturing, stopping current capture first');
      await stopCapture();
      // Small delay to ensure everything is cleaned up
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await ensureOffscreen();

    // ask Chrome for a stream-ID for that tab
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
    console.log('Got stream ID:', streamId);

    // kick the off-screen page
    const response = await chrome.runtime.sendMessage({ type: 'offscreen-start', streamId });
    console.log('Offscreen start response:', response);

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to start offscreen capture');
    }

    isCapturing = true;
    currentTabId = tabId;
    
    // Notify content script
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'captureStarted' });
    } catch (err) {
      console.warn('Failed to notify content script (this is okay if no content script is loaded):', err);
    }
    
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
    console.log('Capture started successfully');
    
  } catch (err) {
    console.error('Capture failed:', err);
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
    console.log('Stopping capture');
    
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
    console.log('Capture stopped and state reset');
  }
}

/* ---------- UI triggers ---------- */

// toolbar-icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked, tab:', tab.id);
  try {
    if (isCapturing) {
      await stopCapture();
    } else {
      await startCapture(tab.id);
    }
  } catch (error) {
    console.error('Error handling icon click:', error);
  }
});

// popup "Start / Stop"
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  console.log('Background received message:', msg);
  
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
