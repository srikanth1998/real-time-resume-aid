
/* global chrome */

/**
 * Manages extension badge states and UI feedback
 */
export class BadgeManager {
  static isChromeExtensionContext() {
    return typeof chrome !== 'undefined' && 
           chrome.runtime && 
           chrome.runtime.id && 
           chrome.action &&
           typeof chrome.action.setBadgeText === 'function';
  }

  static setBadgeForPermissionRequest() {
    if (!this.isChromeExtensionContext()) {
      console.warn('Chrome action API not available - cannot set badge');
      return;
    }
    
    try {
      console.log('🔔 SETTING BADGE - REQUESTING PERMISSION');
      chrome.action.setBadgeText({ text: 'CLICK' });
      chrome.action.setBadgeBackgroundColor({ color: '#ff9500' }); // Orange for attention
      chrome.action.setTitle({ title: 'Click to enable audio capture for your interview' });
      console.log('🔔 Badge set to request permission - user should click extension icon');
    } catch (error) {
      console.error('Error setting badge for permission request:', error);
    }
  }

  static setBadgeForActiveCapture() {
    if (!this.isChromeExtensionContext()) {
      console.warn('Chrome action API not available - cannot set badge');
      return;
    }
    
    try {
      console.log('✅ SETTING BADGE - ACTIVE CAPTURE');
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#34a853' }); // Green for active
      chrome.action.setTitle({ title: 'Audio capture is active - click to stop' });
      console.log('✅ Badge set to show active capture');
    } catch (error) {
      console.error('Error setting badge for active capture:', error);
    }
  }

  static clearBadge() {
    if (!this.isChromeExtensionContext()) {
      console.warn('Chrome action API not available - cannot clear badge');
      return;
    }
    
    try {
      console.log('🧹 CLEARING BADGE');
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setTitle({ title: 'InterviewAce Audio Transcription' });
      console.log('🧹 Badge cleared');
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }
}
