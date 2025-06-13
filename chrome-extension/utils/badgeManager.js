
/* global chrome */

/**
 * Manages extension badge states and UI feedback (informational only)
 */
export class BadgeManager {
  static isChromeExtensionContext() {
    return typeof chrome !== 'undefined' && 
           chrome.runtime && 
           chrome.runtime.id;
  }

  static setBadgeForPermissionRequest() {
    // NO LONGER USED - PERMISSION IS AUTO-GRANTED
    console.log('🔔 Badge permission request skipped - auto-granting permission instead');
  }

  static setBadgeForActiveCapture() {
    if (!this.isChromeExtensionContext() || !chrome.action) {
      console.warn('Chrome action API not available - cannot set badge');
      return;
    }
    
    try {
      console.log('✅ SETTING BADGE - ACTIVE CAPTURE');
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#34a853' }); // Green for active
      chrome.action.setTitle({ title: 'Audio capture is active - transcription running automatically' });
      console.log('✅ Badge set to show active capture');
    } catch (error) {
      console.error('Error setting badge for active capture:', error);
    }
  }

  static clearBadge() {
    if (!this.isChromeExtensionContext() || !chrome.action) {
      console.warn('Chrome action API not available - cannot clear badge');
      return;
    }
    
    try {
      console.log('🧹 CLEARING BADGE');
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setTitle({ title: 'InterviewAce Audio Transcription - Fully Automatic' });
      console.log('🧹 Badge cleared');
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }
}
