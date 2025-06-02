/* global chrome */
import { CaptureManager } from './utils/captureManager.js';
import { MessageHandler } from './utils/messageHandler.js';

console.log('InterviewAce background script loaded');

// Initialize managers
const captureManager = new CaptureManager();
const messageHandler = new MessageHandler(captureManager);

/* ---------- UI triggers ---------- */

// toolbar-icon click
chrome.action.onClicked.addListener(async (tab) => {
  await messageHandler.handleIconClick(tab);
});

// Message handling
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  await messageHandler.handleMessage(msg, sender, sendResponse);
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
});
