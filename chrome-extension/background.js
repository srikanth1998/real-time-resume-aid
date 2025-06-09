
/* global chrome */

import { SessionManager } from './utils/sessionManager.js';
import { BadgeManager } from './utils/badgeManager.js';
import { PlatformDetector } from './utils/platformDetector.js';
import { AudioDetector } from './utils/audioDetector.js';
import { TranscriptionManager } from './utils/transcriptionManager.js';
import { SupabaseApi } from './utils/supabaseApi.js';

console.log('InterviewAce silent transcription background script loaded');

// Initialize managers
const sessionManager = new SessionManager();
const transcriptionManager = new TranscriptionManager();
let meetingTabId = null;

// Check if Chrome APIs are available before using them
const isChromeExtensionContext = () => {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
};

// Load session ID from storage on startup and when extension starts
if (isChromeExtensionContext()) {
  chrome.runtime.onStartup?.addListener(async () => {
    await sessionManager.loadPersistedSession();
  });

  chrome.runtime.onInstalled?.addListener(async () => {
    await sessionManager.loadPersistedSession();
  });
}

// Auto-start when visiting interview pages or detecting audio activity
if (isChromeExtensionContext() && chrome.tabs) {
  chrome.tabs.onUpdated?.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      console.log('🎯 TAB UPDATED:', tabId, tab.url);
      
      // Handle interview session pages first
      if (PlatformDetector.isInterviewTab(tab.url)) {
        console.log('🎯 DETECTED INTERVIEW PAGE (AUTO-MODE)');
        
        const urlSessionId = sessionManager.extractSessionId(tab.url);
        console.log('🔍 URL SESSION ID:', urlSessionId);
        
        if (urlSessionId) {
          await sessionManager.setSessionId(urlSessionId);
          console.log('✅ SESSION ID AUTO-PERSISTED:', urlSessionId);
          
          try {
            await transcriptionManager.ensureContentScript(tabId);
            await chrome.tabs.sendMessage(tabId, {
              action: 'setSessionId',
              sessionId: urlSessionId
            });
            console.log('📡 Session context auto-established');
            
            // Now check all tabs for existing audio activity
            setTimeout(() => {
              AudioDetector.checkAllTabsForAudio(
                sessionManager, 
                BadgeManager, 
                (tab) => transcriptionManager.startTranscription(tab, sessionManager)
              ).then(foundTabId => {
                if (foundTabId) meetingTabId = foundTabId;
              });
            }, 2000);
            
          } catch (error) {
            console.error('Error auto-setting up session context:', error);
          }
        }
        return; // Don't process as audio tab
      }
      
      // Handle any tab with audio activity if we have a session
      const sessionState = sessionManager.getState();
      const transcriptionState = transcriptionManager.getState();
      
      if (sessionState.currentSessionId && !transcriptionState.isCapturing && PlatformDetector.canCaptureTab(tab.url)) {
        const hasAudio = await AudioDetector.hasAudioActivity(tabId);
        const isKnownAudioSource = PlatformDetector.isAudioSourceTab(tab.url);
        
        if (hasAudio || isKnownAudioSource) {
          console.log('🔊 DETECTED AUDIO ACTIVITY:', { 
            tabId, 
            url: tab.url, 
            audible: hasAudio, 
            knownSource: isKnownAudioSource,
            session: sessionState.currentSessionId 
          });
          
          meetingTabId = tabId;
          
          // Check permission before starting
          if (sessionState.permissionGranted) {
            console.log('🚀 Permission already granted - AUTO-STARTING TRANSCRIPTION');
            setTimeout(async () => {
              try {
                await transcriptionManager.startTranscription(tab, sessionManager);
                console.log('✅ AUTO-STARTED transcription for audio tab:', tabId);
              } catch (error) {
                console.error('❌ Error auto-starting transcription:', error);
              }
            }, 2000);
          } else {
            console.log('🔔 REQUESTING PERMISSION VIA BADGE...');
            BadgeManager.setBadgeForPermissionRequest();
          }
        }
      }
    }
    
    // Also check for audio state changes
    const sessionState = sessionManager.getState();
    const transcriptionState = transcriptionManager.getState();
    
    if (changeInfo.audible !== undefined && sessionState.currentSessionId && !transcriptionState.isCapturing && PlatformDetector.canCaptureTab(tab.url)) {
      if (changeInfo.audible) {
        console.log('🔊 AUDIO STARTED on tab:', tabId, 'URL:', tab.url);
        meetingTabId = tabId;
        
        if (sessionState.permissionGranted) {
          setTimeout(async () => {
            try {
              await transcriptionManager.startTranscription(tab, sessionManager);
              console.log('✅ AUTO-STARTED transcription for audible tab:', tabId);
            } catch (error) {
              console.error('❌ Error auto-starting transcription on audio change:', error);
            }
          }, 1000);
        } else {
          console.log('🔔 REQUESTING PERMISSION VIA BADGE...');
          BadgeManager.setBadgeForPermissionRequest();
        }
      }
    }
  });

  // Auto-stop when leaving audio tabs
  chrome.tabs.onRemoved?.addListener(async (tabId) => {
    const transcriptionState = transcriptionManager.getState();
    if (tabId === meetingTabId && transcriptionState.isCapturing) {
      console.log('🛑 AUDIO TAB CLOSED - AUTO-STOPPING TRANSCRIPTION');
      await transcriptionManager.stopTranscription({ id: meetingTabId });
      meetingTabId = null;
    }
  });

  // Track tab focus changes for active audio detection
  chrome.tabs.onActivated?.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      const sessionState = sessionManager.getState();
      const transcriptionState = transcriptionManager.getState();
      
      // If we have a session and user switches to an audio tab, auto-start
      if (sessionState.currentSessionId && !transcriptionState.isCapturing && PlatformDetector.canCaptureTab(tab.url)) {
        const hasAudio = await AudioDetector.hasAudioActivity(activeInfo.tabId);
        const isKnownAudioSource = PlatformDetector.isAudioSourceTab(tab.url);
        
        if (hasAudio || isKnownAudioSource) {
          console.log('🎯 FOCUSED ON AUDIO TAB');
          meetingTabId = activeInfo.tabId;
          
          if (sessionState.permissionGranted) {
            console.log('🚀 Permission granted - AUTO-STARTING TRANSCRIPTION');
            setTimeout(async () => {
              try {
                await transcriptionManager.startTranscription(tab, sessionManager);
                console.log('✅ AUTO-STARTED transcription on focus:', activeInfo.tabId);
              } catch (error) {
                console.error('❌ Error auto-starting on focus:', error);
              }
            }, 1000);
          } else {
            console.log('🔔 REQUESTING PERMISSION VIA BADGE...');
            BadgeManager.setBadgeForPermissionRequest();
          }
        }
      }
    } catch (error) {
      console.warn('Could not get tab info on activation:', error);
    }
  });
}

// Handle extension icon click (MAIN PERMISSION MECHANISM)
if (isChromeExtensionContext() && chrome.action) {
  chrome.action.onClicked?.addListener(async (tab) => {
    console.log('=== EXTENSION ICON CLICKED ===');
    console.log('Tab ID:', tab.id, 'URL:', tab.url);
    
    const sessionState = sessionManager.getState();
    const transcriptionState = transcriptionManager.getState();
    
    console.log('Current session ID:', sessionState.currentSessionId);
    console.log('Current permission status:', sessionState.permissionGranted);
    console.log('Currently capturing:', transcriptionState.isCapturing);
    
    try {
      if (!transcriptionState.isCapturing) {
        // Grant permission when icon is clicked
        if (!sessionState.permissionGranted) {
          console.log('🔓 GRANTING PERMISSION via icon click');
          sessionManager.grantPermission();
        }
        
        // Find the best tab to capture
        let targetTab = tab;
        
        // If we have a known meeting tab, use that instead
        if (meetingTabId && meetingTabId !== tab.id) {
          try {
            const meetingTab = await chrome.tabs.get(meetingTabId);
            if (meetingTab && PlatformDetector.canCaptureTab(meetingTab.url)) {
              console.log('🎯 Using detected meeting tab instead of current tab');
              targetTab = meetingTab;
            }
          } catch (error) {
            console.warn('Could not get meeting tab, using current tab');
          }
        }
        
        await transcriptionManager.startTranscription(targetTab, sessionManager);
      } else {
        console.log('🛑 Stopping transcription via icon click');
        await transcriptionManager.stopTranscription(tab);
      }
    } catch (error) {
      console.error('Error handling icon click:', error);
      BadgeManager.clearBadge();
    }
  });
}

// Handle messages from popup and offscreen
if (isChromeExtensionContext()) {
  chrome.runtime.onMessage?.addListener(async (message, sender, sendResponse) => {
    console.log('🔔 Background received message (auto-mode):', message);
    
    // Handle popup messages
    if (message.action === 'toggle') {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          const transcriptionState = transcriptionManager.getState();
          if (transcriptionState.isCapturing) {
            await transcriptionManager.stopTranscription(tab);
          } else {
            // Grant permission when manually toggled
            sessionManager.grantPermission();
            await transcriptionManager.startTranscription(tab, sessionManager);
          }
          const newTranscriptionState = transcriptionManager.getState();
          const sessionState = sessionManager.getState();
          sendResponse({ 
            success: true, 
            isCapturing: newTranscriptionState.isCapturing,
            sessionId: sessionState.currentSessionId 
          });
        }
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
    
    if (message.action === 'setSessionId') {
      await sessionManager.setSessionId(message.sessionId);
      console.log('🎯 Session ID set from popup for auto operation:', message.sessionId);
      
      // Check for existing audio activity when session is manually set
      setTimeout(() => {
        AudioDetector.checkAllTabsForAudio(
          sessionManager, 
          BadgeManager, 
          (tab) => transcriptionManager.startTranscription(tab, sessionManager)
        ).then(foundTabId => {
          if (foundTabId) meetingTabId = foundTabId;
        });
      }, 1000);
      
      sendResponse({ success: true });
      return true;
    }
    
    if (message.action === 'clearSession') {
      await sessionManager.clearSession();
      console.log('🧹 Session cleared (auto mode)');
      BadgeManager.clearBadge();
      sendResponse({ success: true });
      return true;
    }
    
    if (message.action === 'getStatus') {
      const sessionState = sessionManager.getState();
      const transcriptionState = transcriptionManager.getState();
      sendResponse({ 
        isCapturing: transcriptionState.isCapturing, 
        sessionId: sessionState.currentSessionId,
        sessionPersisted: sessionState.sessionPersisted,
        currentTabId: transcriptionState.currentTabId,
        meetingTabId: meetingTabId,
        permissionGranted: sessionState.permissionGranted
      });
      return true;
    }
    
    if (message.type === 'offscreen-ready') {
      console.log('✅ Offscreen document reported ready (auto mode)');
      sendResponse({ success: true });
      return true;
    }
    
    // Handle transcription results from offscreen
    if (message.type === 'transcription-result' && message.text && message.text.trim()) {
      console.log('📢 PROCESSING AUTO-TRANSCRIPTION RESULT FROM OFFSCREEN');
      console.log('📝 Transcription text:', message.text);
      
      const sessionState = sessionManager.getState();
      const transcriptionState = transcriptionManager.getState();
      
      console.log('🎯 Current session ID:', sessionState.currentSessionId);
      
      const sessionId = message.sessionId || sessionState.currentSessionId;
      console.log('🎯 Final session ID for processing:', sessionId);
      
      if (!sessionId) {
        console.warn('⚠️ NO SESSION ID AVAILABLE - TRANSCRIPTION WILL NOT SYNC');
      }
      
      const transcriptionData = {
        text: message.text.trim(),
        timestamp: message.timestamp || Date.now(),
        sessionId: sessionId
      };
      
      // Forward to local content script for immediate UI update (if available)
      if (transcriptionState.currentTabId) {
        try {
          await chrome.tabs.sendMessage(transcriptionState.currentTabId, {
            action: 'transcriptionResult',
            ...transcriptionData
          });
          console.log('✅ Auto-transcription forwarded to local content script');
        } catch (error) {
          console.warn('❌ Error forwarding to local content script (this is OK for auto operation):', error);
        }
      }
      
      // Send to Supabase for cross-device sync and answer generation (MAIN FUNCTION)
      if (sessionId) {
        try {
          console.log('📡 Sending auto-transcription to Supabase for cross-device sync and AI answer...');
          await SupabaseApi.sendTranscriptionToSupabase(transcriptionData);
          console.log('✅ Auto-transcription sent to Supabase successfully - all devices will receive updates');
        } catch (error) {
          console.error('❌ Error sending auto-transcription to Supabase:', error);
        }
      } else {
        console.warn('⚠️ No session ID available, skipping cross-device sync and AI answers');
      }
      
      sendResponse({ success: true, forwarded: true, synced: !!sessionId });
      return true;
    }
    
    if (message.type === 'ping') {
      sendResponse({ success: true, message: 'pong' });
      return true;
    }
    
    sendResponse({ success: true });
    return true;
  });
}

// Clean up when extension is disabled/reloaded
if (isChromeExtensionContext()) {
  chrome.runtime.onSuspend?.addListener(() => {
    console.log('Extension suspending, cleaning up...');
    transcriptionManager.cleanupOffscreen();
  });
}
