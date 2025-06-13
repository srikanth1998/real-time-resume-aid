
/* global chrome */
import { PlatformDetector } from './platformDetector.js';

/**
 * Handles audio activity detection and monitoring
 */
export class AudioDetector {
  static async hasAudioActivity(tabId) {
    const isChromeExtensionContext = () => {
      return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    };

    if (!isChromeExtensionContext()) return false;
    
    try {
      const tab = await chrome.tabs.get(tabId);
      
      // Check if we can capture this tab
      if (!PlatformDetector.canCaptureTab(tab.url)) {
        console.log('⚠️ Cannot capture tab:', tab.url);
        return false;
      }
      
      return tab.audible || false;
    } catch (error) {
      console.warn('Could not check audio activity for tab:', tabId, error);
      return false;
    }
  }

  static async checkAllTabsForAudio(sessionManager, badgeManager, startTranscriptionCallback) {
    const sessionState = sessionManager.getState();
    if (!sessionState.currentSessionId) return;
    
    try {
      const tabs = await chrome.tabs.query({});
      console.log('🔍 Checking all tabs for audio activity...');
      
      for (const tab of tabs) {
        // Skip if we can't capture this tab
        if (!PlatformDetector.canCaptureTab(tab.url)) {
          console.log('⚠️ Skipping non-capturable tab:', tab.url);
          continue;
        }
        
        // Additional safety check - ensure tab has proper URL and is not a Chrome page
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
          console.log('⚠️ Skipping Chrome internal tab:', tab.url);
          continue;
        }
        
        const hasAudio = await this.hasAudioActivity(tab.id);
        const isKnownAudioSource = PlatformDetector.isAudioSourceTab(tab.url);
        
        if (hasAudio || (isKnownAudioSource && tab.audible)) {
          console.log('🔊 FOUND AUDIO TAB - AUTO-STARTING IMMEDIATELY:', { 
            tabId: tab.id, 
            url: tab.url, 
            audible: hasAudio, 
            knownSource: isKnownAudioSource 
          });
          
          // AUTO-GRANT PERMISSION AND START IMMEDIATELY - NO USER INTERACTION
          if (!sessionState.permissionGranted) {
            sessionManager.grantPermission();
            console.log('🔓 AUTO-GRANTED PERMISSION FOR DISCOVERED AUDIO TAB');
          }
          
          console.log('🚀 AUTO-STARTING TRANSCRIPTION FOR DISCOVERED AUDIO TAB');
          try {
            await startTranscriptionCallback(tab);
            console.log('✅ AUTO-STARTED transcription for discovered audio tab:', tab.id);
            return tab.id; // Return the meeting tab ID on success
          } catch (error) {
            console.error('❌ Error auto-starting transcription for discovered tab:', error);
            // Continue checking other tabs if this one failed
            continue;
          }
        }
      }
      
      console.log('🔍 No audio activity found in current tabs');
      return null;
    } catch (error) {
      console.error('Error checking tabs for audio:', error);
      return null;
    }
  }
}
