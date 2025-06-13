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
    try {
      await sessionManager.loadPersistedSession();
    } catch (error) {
      console.error('Error loading persisted session on startup:', error);
    }
  });

  chrome.runtime.onInstalled?.addListener(async () => {
    try {
      await sessionManager.loadPersistedSession();
    } catch (error) {
      console.error('Error loading persisted session on install:', error);
    }
  });
}

// Helper function to safely start transcription with error handling
async function safeStartTranscription(tab, sessionManager) {
  try {
    // Additional safety checks before attempting transcription
    if (!tab || !tab.url) {
      console.warn('⚠️ Invalid tab provided for transcription');
      return false;
    }
    
    if (!PlatformDetector.canCaptureTab(tab.url)) {
      console.warn('⚠️ Cannot capture tab:', tab.url);
      return false;
    }
    
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.warn('⚠️ Cannot capture Chrome internal page:', tab.url);
      return false;
    }
    
    await transcriptionManager.startTranscription(tab, sessionManager);
    console.log('✅ Successfully started transcription for tab:', tab.id);
    return true;
  } catch (error) {
    console.error('❌ Error in safeStartTranscription:', error);
    
    // Handle specific permission errors
    if (error.message.includes('activeTab permission') || 
        error.message.includes('Chrome pages cannot be captured')) {
      console.warn('⚠️ Permission or Chrome page error - this is expected for some tabs');
    }
    
    return false;
  }
}

// Helper function to get current active tab
async function getCurrentActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  } catch (error) {
    console.error('Error getting current active tab:', error);
    return null;
  }
}

// Auto-start when visiting interview pages or detecting audio activity
if (isChromeExtensionContext() && chrome.tabs) {
  chrome.tabs.onUpdated?.addListener(async (tabId, changeInfo, tab) => {
    try {
      if (changeInfo.status === 'complete' && tab.url) {
        console.log('🎯 TAB UPDATED:', tabId, tab.url);
        
        // Handle interview session pages first
        if (PlatformDetector.isInterviewTab(tab.url)) {
          console.log('🎯 DETECTED INTERVIEW PAGE (FULLY-AUTO-MODE)');
          
          const urlSessionId = sessionManager.extractSessionId(tab.url);
          console.log('🔍 URL SESSION ID:', urlSessionId);
          
          if (urlSessionId) {
            await sessionManager.setSessionId(urlSessionId);
            // AUTOMATICALLY GRANT PERMISSION - NO USER INTERACTION NEEDED
            sessionManager.grantPermission();
            console.log('✅ SESSION ID AUTO-PERSISTED AND PERMISSION AUTO-GRANTED:', urlSessionId);
            
            try {
              await transcriptionManager.ensureContentScript(tabId);
              await chrome.tabs.sendMessage(tabId, {
                action: 'setSessionId',
                sessionId: urlSessionId
              });
              console.log('📡 Session context auto-established');
              
              // Now check all tabs for existing audio activity and auto-start
              setTimeout(() => {
                AudioDetector.checkAllTabsForAudio(
                  sessionManager, 
                  BadgeManager, 
                  (tab) => safeStartTranscription(tab, sessionManager)
                ).then(foundTabId => {
                  if (foundTabId) meetingTabId = foundTabId;
                }).catch(error => {
                  console.error('Error checking tabs for audio:', error);
                });
              }, 2000);
              
            } catch (error) {
              console.error('Error auto-setting up session context:', error);
            }
          }
          return; // Don't process as audio tab
        }
        
        // Handle any tab with audio activity if we have a session - AUTO-START IMMEDIATELY
        const sessionState = sessionManager.getState();
        const transcriptionState = transcriptionManager.getState();
        
        if (sessionState.currentSessionId && !transcriptionState.isCapturing && PlatformDetector.canCaptureTab(tab.url)) {
          const hasAudio = await AudioDetector.hasAudioActivity(tabId);
          const isKnownAudioSource = PlatformDetector.isAudioSourceTab(tab.url);
          
          if (hasAudio || isKnownAudioSource) {
            console.log('🔊 DETECTED AUDIO ACTIVITY - AUTO-STARTING IMMEDIATELY:', { 
              tabId, 
              url: tab.url, 
              audible: hasAudio, 
              knownSource: isKnownAudioSource,
              session: sessionState.currentSessionId 
            });
            
            meetingTabId = tabId;
            
            // AUTO-GRANT PERMISSION AND START IMMEDIATELY
            if (!sessionState.permissionGranted) {
              sessionManager.grantPermission();
              console.log('🔓 AUTO-GRANTED PERMISSION');
            }
            
            console.log('🚀 AUTO-STARTING TRANSCRIPTION IMMEDIATELY');
            setTimeout(async () => {
              await safeStartTranscription(tab, sessionManager);
            }, 1000);
          }
        }
      }
      
      // Also check for audio state changes - AUTO-START IMMEDIATELY
      const sessionState = sessionManager.getState();
      const transcriptionState = transcriptionManager.getState();
      
      if (changeInfo.audible !== undefined && sessionState.currentSessionId && !transcriptionState.isCapturing && PlatformDetector.canCaptureTab(tab.url)) {
        if (changeInfo.audible) {
          console.log('🔊 AUDIO STARTED on tab - AUTO-STARTING:', tabId, 'URL:', tab.url);
          meetingTabId = tabId;
          
          // AUTO-GRANT PERMISSION AND START IMMEDIATELY
          if (!sessionState.permissionGranted) {
            sessionManager.grantPermission();
            console.log('🔓 AUTO-GRANTED PERMISSION');
          }
          
          setTimeout(async () => {
            await safeStartTranscription(tab, sessionManager);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error in tabs.onUpdated listener:', error);
    }
  });

  // Auto-stop when leaving audio tabs
  chrome.tabs.onRemoved?.addListener(async (tabId) => {
    try {
      const transcriptionState = transcriptionManager.getState();
      if (tabId === meetingTabId && transcriptionState.isCapturing) {
        console.log('🛑 AUDIO TAB CLOSED - AUTO-STOPPING TRANSCRIPTION');
        await transcriptionManager.stopTranscription({ id: meetingTabId });
        meetingTabId = null;
      }
    } catch (error) {
      console.error('Error in tabs.onRemoved listener:', error);
    }
  });

  // Track tab focus changes for active audio detection - AUTO-START IMMEDIATELY
  chrome.tabs.onActivated?.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      const sessionState = sessionManager.getState();
      const transcriptionState = transcriptionManager.getState();
      
      // If we have a session and user switches to an audio tab, auto-start immediately
      if (sessionState.currentSessionId && !transcriptionState.isCapturing && PlatformDetector.canCaptureTab(tab.url)) {
        const hasAudio = await AudioDetector.hasAudioActivity(activeInfo.tabId);
        const isKnownAudioSource = PlatformDetector.isAudioSourceTab(tab.url);
        
        if (hasAudio || isKnownAudioSource) {
          console.log('🎯 FOCUSED ON AUDIO TAB - AUTO-STARTING');
          meetingTabId = activeInfo.tabId;
          
          // AUTO-GRANT PERMISSION AND START IMMEDIATELY
          if (!sessionState.permissionGranted) {
            sessionManager.grantPermission();
            console.log('🔓 AUTO-GRANTED PERMISSION');
          }
          
          console.log('🚀 AUTO-STARTING TRANSCRIPTION ON FOCUS');
          setTimeout(async () => {
            await safeStartTranscription(tab, sessionManager);
          }, 1000);
        }
      }
    } catch (error) {
      console.warn('Could not get tab info on activation:', error);
    }
  });
}

// Handle extension icon click (OPTIONAL MANUAL CONTROL)
if (isChromeExtensionContext() && chrome.action) {
  chrome.action.onClicked?.addListener(async (tab) => {
    console.log('=== EXTENSION ICON CLICKED (MANUAL OVERRIDE) ===');
    console.log('Tab ID:', tab.id, 'URL:', tab.url);
    
    const sessionState = sessionManager.getState();
    const transcriptionState = transcriptionManager.getState();
    
    console.log('Current session ID:', sessionState.currentSessionId);
    console.log('Current permission status:', sessionState.permissionGranted);
    console.log('Currently capturing:', transcriptionState.isCapturing);
    
    try {
      if (!transcriptionState.isCapturing) {
        // Grant permission when icon is clicked (manual override)
        if (!sessionState.permissionGranted) {
          console.log('🔓 MANUAL PERMISSION GRANT via icon click');
          sessionManager.grantPermission();
        }
        
        // Use the current active tab for transcription
        await safeStartTranscription(tab, sessionManager);
        meetingTabId = tab.id;
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
    try {
      console.log('🔔 Background received message (fully-auto-mode):', message);
      
      // Handle manual transcription start from content script button
      if (message.action === 'manual-start-transcription') {
        console.log('🚀 MANUAL START TRANSCRIPTION REQUEST FROM CONTENT SCRIPT');
        
        const sessionState = sessionManager.getState();
        const transcriptionState = transcriptionManager.getState();
        
        if (!sessionState.currentSessionId) {
          console.error('❌ No session ID available for manual start');
          sendResponse({ success: false, error: 'No session ID available. Please visit an interview page first.' });
          return true;
        }
        
        try {
          if (transcriptionState.isCapturing) {
            // Stop if already capturing
            console.log('🛑 Already capturing, stopping transcription');
            const currentTab = await getCurrentActiveTab();
            if (currentTab) {
              await transcriptionManager.stopTranscription(currentTab);
            }
            sendResponse({ success: true, action: 'stopped' });
          } else {
            // Start transcription on current active tab
            console.log('🎯 Starting manual transcription on current tab');
            
            // Auto-grant permission for manual start
            if (!sessionState.permissionGranted) {
              sessionManager.grantPermission();
              console.log('🔓 AUTO-GRANTED PERMISSION for manual start');
            }
            
            const currentTab = await getCurrentActiveTab();
            if (!currentTab) {
              throw new Error('Could not get current active tab');
            }
            
            console.log('🎯 Manual transcription target tab:', currentTab.id, currentTab.url);
            
            const success = await safeStartTranscription(currentTab, sessionManager);
            if (success) {
              meetingTabId = currentTab.id;
              sendResponse({ success: true, action: 'started', tabId: currentTab.id });
            } else {
              sendResponse({ success: false, error: 'Failed to start transcription on current tab' });
            }
          }
        } catch (error) {
          console.error('❌ Error handling manual start:', error);
          sendResponse({ success: false, error: error.message });
        }
        
        return true;
      }
      
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
              await safeStartTranscription(tab, sessionManager);
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
        // AUTO-GRANT PERMISSION WHEN SESSION IS SET
        sessionManager.grantPermission();
        console.log('🎯 Session ID set and permission auto-granted:', message.sessionId);
        
        // Check for existing audio activity when session is manually set
        setTimeout(() => {
          AudioDetector.checkAllTabsForAudio(
            sessionManager, 
            BadgeManager, 
            (tab) => safeStartTranscription(tab, sessionManager)
          ).then(foundTabId => {
            if (foundTabId) meetingTabId = foundTabId;
          }).catch(error => {
            console.error('Error checking tabs for audio after setting session ID:', error);
          });
        }, 1000);
        
        sendResponse({ success: true });
        return true;
      }
      
      if (message.action === 'clearSession') {
        await sessionManager.clearSession();
        console.log('🧹 Session cleared (fully-auto mode)');
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
        console.log('✅ Offscreen document reported ready (fully-auto mode)');
        sendResponse({ success: true });
        return true;
      }
      
      // Handle transcription results from offscreen
      if (message.type === 'transcription-result' && message.text && message.text.trim()) {
        console.log('📢 PROCESSING FULLY-AUTO TRANSCRIPTION RESULT FROM OFFSCREEN');
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
            console.log('✅ Fully-auto transcription forwarded to local content script');
          } catch (error) {
            console.warn('❌ Error forwarding to local content script (this is OK for auto operation):', error);
          }
        }
        
        // Send to Supabase for cross-device sync and answer generation (MAIN FUNCTION)
        if (sessionId) {
          try {
            console.log('📡 Sending fully-auto transcription to Supabase for cross-device sync and AI answer...');
            await SupabaseApi.sendTranscriptionToSupabase(transcriptionData);
            console.log('✅ Fully-auto transcription sent to Supabase successfully - all devices will receive updates');
          } catch (error) {
            console.error('❌ Error sending fully-auto transcription to Supabase:', error);
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
    } catch (error) {
      console.error('Error in message listener:', error);
      sendResponse({ success: false, error: error.message });
      return true;
    }
  });
}

// Clean up when extension is disabled/reloaded
if (isChromeExtensionContext()) {
  chrome.runtime.onSuspend?.addListener(() => {
    console.log('Extension suspending, cleaning up...');
    try {
      transcriptionManager.cleanupOffscreen();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });
}
