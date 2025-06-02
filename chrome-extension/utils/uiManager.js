
/* global chrome */

/**
 * Manages UI updates like badge and notifications
 */
export class UIManager {
  static setRecordingBadge() {
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
  }

  static clearBadge() {
    chrome.action.setBadgeText({ text: '' });
  }

  static async notifyContentScript(tabId, action) {
    if (!tabId) return;
    
    try {
      console.log(`Notifying content script of ${action}`);
      await chrome.tabs.sendMessage(tabId, { action });
      console.log('Content script notified successfully');
    } catch (err) {
      console.warn(`Failed to notify content script (this is okay if no content script is loaded):`, err);
    }
  }

  static async injectContentScript(tabId) {
    try {
      console.log('Attempting to inject content script...');
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      console.log('✅ Content script injected successfully');
      return true;
    } catch (injectErr) {
      console.warn('❌ Could not inject content script:', injectErr.message);
      return false;
    }
  }
}
