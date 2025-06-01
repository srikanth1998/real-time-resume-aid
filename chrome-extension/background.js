/* global chrome */
let isCapturing   = false;
let currentTabId  = null;

/* ---------- helpers ---------- */
async function ensureOffscreen () {
  if (await chrome.offscreen.hasDocument?.()) return;
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL('offscreen.html'),
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Process tab audio in hidden page'
  });
}

async function startCapture (tabId) {
  try {
    // Check if we're already capturing
    if (isCapturing) {
      console.log('[InterviewAce] Already capturing, stopping current capture first');
      await stopCapture();
      // Small delay to ensure everything is cleaned up
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await ensureOffscreen();

    // ask Chrome for a stream-ID for that tab
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });

    // kick the off-screen page
    await chrome.runtime.sendMessage({ type: 'offscreen-start', streamId })
      .catch(err => {
        // Handle case where offscreen document might not be ready yet
        console.warn('[InterviewAce] Message to offscreen failed:', err);
        throw new Error('Failed to communicate with offscreen document');
      });

    isCapturing = true;
    currentTabId = tabId;
    
    // Wrap in try/catch as the tab might not have a content script loaded
    try {
      chrome.tabs.sendMessage(tabId, { action: 'captureStarted' });
    } catch (err) {
      console.warn('[InterviewAce] Failed to notify content script:', err);
      // Not critical, continue anyway
    }
    
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
  } catch (err) {
    console.error('[InterviewAce] capture failed:', err);
    // Ensure we reset state if capture failed
    isCapturing = false;
    currentTabId = null;
    chrome.action.setBadgeText({ text: '' });
    // Try to clean up any partial setup
    try {
      await chrome.runtime.sendMessage({ type: 'offscreen-stop' });
    } catch {}
  }
}

async function stopCapture () {
  try {
    await chrome.runtime.sendMessage({ type: 'offscreen-stop' })
      .catch(err => {
        console.warn('[InterviewAce] Error sending stop message:', err);
        // Continue cleanup anyway
      });
    
    if (currentTabId) {
      try {
        chrome.tabs.sendMessage(currentTabId, { action: 'captureStopped' });
      } catch (err) {
        console.warn('[InterviewAce] Error notifying content script of stop:', err);
      }
    }
  } catch (err) {
    console.error('[InterviewAce] Error in stopCapture:', err);
  } finally {
    // Always reset state even if errors occurred
    isCapturing = false;
    currentTabId = null;
    chrome.action.setBadgeText({ text: '' });
  }
}

/* ---------- UI triggers ---------- */

// toolbar-icon click
chrome.action.onClicked.addListener(({ id }) =>
  isCapturing ? stopCapture() : startCapture(id)
);

// popup “Start / Stop”
chrome.runtime.onMessage.addListener((msg, _s, _r) => {
  if (msg.action === 'toggle') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) =>
      isCapturing ? stopCapture() : startCapture(tab.id)
    );
  }
});

// off-screen page tells us it stopped on error / hang-up
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'offscreen-stopped') stopCapture();
});
