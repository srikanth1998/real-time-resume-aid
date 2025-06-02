/* global chrome */
import { CaptureManager } from './utils/captureManager.js';
import { MessageHandler } from './utils/messageHandler.js';

console.log('InterviewAce background script loaded');

// Initialize managers
const captureManager = new CaptureManager();
const messageHandler = new MessageHandler(captureManager);

/* ---------- Connection testing ---------- */
async function testOffscreenConnection() {
  try {
    console.log('Testing offscreen connection...');
    const response = await chrome.runtime.sendMessage({ type: 'ping' });
    console.log('Offscreen connection test result:', response);
    return response?.success === true;
  } catch (error) {
    console.warn('Offscreen connection test failed:', error);
    return false;
  }
}

/* ---------- UI triggers ---------- */

// toolbar-icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('=== EXTENSION ICON CLICKED ===');
  
  // Test connection before proceeding
  const connectionOk = await testOffscreenConnection();
  if (!connectionOk) {
    console.log('Offscreen connection failed, ensuring offscreen document...');
    try {
      await messageHandler.captureManager.ensureOffscreen();
      // Wait a bit for initialization
      await new Promise(resolve => setTimeout(resolve, 500));
      const retryConnection = await testOffscreenConnection();
      if (!retryConnection) {
        console.error('Failed to establish offscreen connection after retry');
        return;
      }
    } catch (error) {
      console.error('Error ensuring offscreen connection:', error);
      return;
    }
  }
  
  await messageHandler.handleIconClick(tab);
});

// Message handling
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Handle messages asynchronously
  messageHandler.handleMessage(msg, sender, sendResponse);
  return true; // Keep message channel open for async response
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
});
