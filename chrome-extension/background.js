/* global chrome */

console.log('InterviewAce silent transcription background script loaded');

let isCapturing = false;
let offscreenCreated = false;
let currentTabId = null;
let currentSessionId = null;
let sessionPersisted = false;
let meetingTabId = null;

// Check if Chrome APIs are available before using them
const isChromeExtensionContext = () => {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
};

// Load session ID from storage on startup and when extension starts
if (isChromeExtensionContext()) {
  chrome.runtime.onStartup?.addListener(async () => {
    await loadPersistedSession();
  });

  chrome.runtime.onInstalled?.addListener(async () => {
    await loadPersistedSession();
  });
}

async function loadPersistedSession() {
  if (!isChromeExtensionContext()) return;
  
  try {
    const result = await chrome.storage.local.get(['sessionId', 'sessionPersisted']);
    if (result.sessionId && result.sessionPersisted) {
      currentSessionId = result.sessionId;
      sessionPersisted = true;
      console.log('✅ Loaded persisted session ID (silent mode):', currentSessionId);
    }
  } catch (error) {
    console.warn('Error loading persisted session:', error);
  }
}

// Auto-detect meeting platforms and interview sessions
const MEETING_PLATFORMS = [
  'meet.google.com',
  'zoom.us',
  'teams.microsoft.com',
  'webex.com',
  'gotomeeting.com',
  'skype.com'
];

const INTERVIEW_PLATFORMS = [
  'lovableproject.com',
  'lovable.app',
  'real-time-resume-aid',
  'preview--'
];

// Audio sources that should be captured
const AUDIO_SOURCES = [
  'youtube.com',
  'youtu.be',
  'soundcloud.com',
  'spotify.com',
  'podcasts.google.com',
  'open.spotify.com',
  'music.apple.com',
  'tidal.com',
  'deezer.com',
  'pandora.com'
];

function isMeetingTab(url) {
  return MEETING_PLATFORMS.some(platform => url.includes(platform));
}

function isInterviewTab(url) {
  return INTERVIEW_PLATFORMS.some(platform => url.includes(platform));
}

function isAudioSourceTab(url) {
  return AUDIO_SOURCES.some(source => url.includes(source)) || isMeetingTab(url);
}

// Enhanced audio detection - check if tab has audio activity
async function hasAudioActivity(tabId) {
  if (!isChromeExtensionContext()) return false;
  
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab.audible || false;
  } catch (error) {
    console.warn('Could not check audio activity for tab:', tabId, error);
    return false;
  }
}

// Auto-start when visiting interview pages or detecting audio activity
if (isChromeExtensionContext() && chrome.tabs) {
  chrome.tabs.onUpdated?.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      console.log('🎯 TAB UPDATED:', tabId, tab.url);
      
      // Handle interview session pages first
      if (isInterviewTab(tab.url)) {
        console.log('🎯 DETECTED INTERVIEW PAGE (AUTO-MODE)');
        
        const urlSessionId = extractSessionId(tab.url);
        console.log('🔍 URL SESSION ID:', urlSessionId);
        
        if (urlSessionId) {
          currentSessionId = urlSessionId;
          sessionPersisted = true;
          
          try {
            await chrome.storage.local.set({ 
              sessionId: currentSessionId,
              sessionPersisted: true 
            });
            console.log('✅ SESSION ID AUTO-PERSISTED:', currentSessionId);
            
            await ensureContentScript(tabId);
            await chrome.tabs.sendMessage(tabId, {
              action: 'setSessionId',
              sessionId: currentSessionId
            });
            console.log('📡 Session context auto-established');
          } catch (error) {
            console.error('Error auto-setting up session context:', error);
          }
        }
      }
      
      // Handle any tab with audio activity if we have a session
      if (currentSessionId && !isCapturing) {
        const hasAudio = await hasAudioActivity(tabId);
        const isKnownAudioSource = isAudioSourceTab(tab.url);
        
        if (hasAudio || isKnownAudioSource) {
          console.log('🔊 DETECTED AUDIO ACTIVITY:', { 
            tabId, 
            url: tab.url, 
            audible: hasAudio, 
            knownSource: isKnownAudioSource,
            session: currentSessionId 
          });
          
          console.log('🚀 AUTO-STARTING TRANSCRIPTION for audio tab:', tabId, 'session:', currentSessionId);
          meetingTabId = tabId;
          
          // Small delay to let the audio page fully load
          setTimeout(async () => {
            try {
              await startTranscription(tab);
              console.log('✅ AUTO-STARTED transcription for audio tab:', tabId);
            } catch (error) {
              console.error('❌ Error auto-starting transcription:', error);
            }
          }, 2000);
        }
      } else if (!currentSessionId) {
        console.log('⚠️ Audio activity detected but no session ID available yet');
      } else if (isCapturing) {
        console.log('⚠️ Audio activity detected but already capturing');
      }
    }
    
    // Also check for audio state changes
    if (changeInfo.audible !== undefined && currentSessionId && !isCapturing) {
      if (changeInfo.audible) {
        console.log('🔊 AUDIO STARTED on tab:', tabId, 'URL:', tab.url);
        meetingTabId = tabId;
        
        setTimeout(async () => {
          try {
            await startTranscription(tab);
            console.log('✅ AUTO-STARTED transcription for audible tab:', tabId);
          } catch (error) {
            console.error('❌ Error auto-starting transcription on audio change:', error);
          }
        }, 1000);
      }
    }
  });

  // Auto-stop when leaving audio tabs
  chrome.tabs.onRemoved?.addListener(async (tabId) => {
    if (tabId === meetingTabId && isCapturing) {
      console.log('🛑 AUDIO TAB CLOSED - AUTO-STOPPING TRANSCRIPTION');
      await stopTranscription({ id: meetingTabId });
      meetingTabId = null;
    }
  });

  // Track tab focus changes for active audio detection
  chrome.tabs.onActivated?.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      
      // If we have a session and user switches to an audio tab, auto-start
      if (currentSessionId && !isCapturing) {
        const hasAudio = await hasAudioActivity(activeInfo.tabId);
        const isKnownAudioSource = isAudioSourceTab(tab.url);
        
        if (hasAudio || isKnownAudioSource) {
          console.log('🎯 FOCUSED ON AUDIO TAB - AUTO-STARTING TRANSCRIPTION');
          meetingTabId = activeInfo.tabId;
          
          setTimeout(async () => {
            try {
              await startTranscription(tab);
              console.log('✅ AUTO-STARTED transcription on focus:', activeInfo.tabId);
            } catch (error) {
              console.error('❌ Error auto-starting on focus:', error);
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.warn('Could not get tab info on activation:', error);
    }
  });
}

function extractSessionId(url) {
  try {
    console.log('🔍 EXTRACTING SESSION ID FROM URL:', url);
    
    if (!url) {
      console.log('❌ No URL provided');
      return null;
    }

    // Method 1: Direct search for session_id parameter
    if (url.includes('session_id=')) {
      const match = url.match(/[?&]session_id=([^&#+]*)/);
      if (match && match[1]) {
        const sessionId = decodeURIComponent(match[1]);
        console.log('✅ Found session_id in query params:', sessionId);
        return sessionId;
      }
    }

    // Method 2: Search for sessionId parameter (camelCase)
    if (url.includes('sessionId=')) {
      const match = url.match(/[?&]sessionId=([^&#+]*)/);
      if (match && match[1]) {
        const sessionId = decodeURIComponent(match[1]);
        console.log('✅ Found sessionId in query params:', sessionId);
        return sessionId;
      }
    }

    // Method 3: Try URL object parsing
    try {
      const urlObj = new URL(url);
      const sessionFromQuery = urlObj.searchParams.get('session_id') || urlObj.searchParams.get('sessionId');
      if (sessionFromQuery) {
        console.log('✅ Extracted session ID from URL object:', sessionFromQuery);
        return sessionFromQuery;
      }
    } catch (urlError) {
      console.warn('Error parsing URL object:', urlError);
    }

    // Method 4: Check for session ID in path like /interview/session-id
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      console.log('🔍 Path parts:', pathParts);
      
      const interviewIndex = pathParts.findIndex(part => part.toLowerCase().includes('interview'));
      if (interviewIndex !== -1 && pathParts[interviewIndex + 1]) {
        const sessionId = pathParts[interviewIndex + 1];
        console.log('✅ Extracted session ID from path:', sessionId);
        return sessionId;
      }
    } catch (pathError) {
      console.warn('Error parsing URL path:', pathError);
    }

    console.log('❌ No session ID found in URL');
    return null;
  } catch (error) {
    console.error('❌ Error extracting session ID:', error);
    return null;
  }
}

// Handle extension icon click (manual control)
if (isChromeExtensionContext() && chrome.action) {
  chrome.action.onClicked?.addListener(async (tab) => {
    console.log('=== EXTENSION ICON CLICKED (MANUAL CONTROL) ===');
    console.log('Tab ID:', tab.id, 'URL:', tab.url);
    console.log('Current session ID:', currentSessionId);
    
    try {
      if (!isCapturing) {
        await startTranscription(tab);
      } else {
        await stopTranscription(tab);
      }
    } catch (error) {
      console.error('Error toggling transcription:', error);
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
          if (isCapturing) {
            await stopTranscription(tab);
          } else {
            await startTranscription(tab);
          }
          sendResponse({ 
            success: true, 
            isCapturing: isCapturing,
            sessionId: currentSessionId 
          });
        }
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
    
    if (message.action === 'setSessionId') {
      currentSessionId = message.sessionId;
      sessionPersisted = true;
      try {
        await chrome.storage.local.set({ 
          sessionId: currentSessionId,
          sessionPersisted: true 
        });
        console.log('🎯 Session ID set from popup for auto operation:', currentSessionId);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
    
    if (message.action === 'clearSession') {
      currentSessionId = null;
      sessionPersisted = false;
      try {
        await chrome.storage.local.remove(['sessionId', 'sessionPersisted']);
        console.log('🧹 Session cleared (auto mode)');
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
    
    if (message.action === 'getStatus') {
      sendResponse({ 
        isCapturing: isCapturing, 
        sessionId: currentSessionId,
        sessionPersisted: sessionPersisted,
        currentTabId: currentTabId,
        meetingTabId: meetingTabId
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
      console.log('🎯 Current session ID:', currentSessionId);
      
      const sessionId = message.sessionId || currentSessionId;
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
      if (currentTabId) {
        try {
          await chrome.tabs.sendMessage(currentTabId, {
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
          await sendTranscriptionToSupabase(transcriptionData);
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

async function startTranscription(tab) {
  if (!isChromeExtensionContext()) {
    console.warn('Chrome extension context not available');
    return;
  }

  console.log('🚀 AUTO-STARTING SILENT TRANSCRIPTION FOR TAB:', tab.id);
  console.log('🎯 USING PERSISTED SESSION ID:', currentSessionId);
  
  if (!currentSessionId) {
    console.warn('⚠️ No session ID available - need to visit interview page first');
    return;
  }
  
  currentTabId = tab.id;
  
  try {
    await ensureContentScript(tab.id);
    await cleanupOffscreen();
    await createOffscreen();
    await waitForOffscreenReady();
    
    console.log('Getting stream ID for tab:', tab.id);
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    });
    
    if (!streamId) {
      throw new Error('Failed to get media stream ID - tab may not have audio or permission denied');
    }

    console.log('Got stream ID:', streamId);
    
    const response = await sendMessageToOffscreen({
      type: 'start-transcription',
      streamId: streamId,
      sessionId: currentSessionId
    });
    
    if (!response?.success) {
      throw new Error(response?.error || 'Failed to start transcription in offscreen');
    }
    
    await notifyContentScript(tab.id, 'transcriptionStarted');
    
    isCapturing = true;
    console.log('✅ AUTO-TRANSCRIPTION started successfully for tab:', tab.id, 'session:', currentSessionId);
    
  } catch (error) {
    console.error('❌ Error starting auto-transcription:', error);
    currentTabId = null;
    isCapturing = false;
    await cleanupOffscreen();
    throw error;
  }
}

async function stopTranscription(tab) {
  if (!isChromeExtensionContext()) return;

  console.log('🛑 AUTO-STOPPING silent transcription...');
  
  try {
    if (offscreenCreated) {
      await sendMessageToOffscreen({
        type: 'stop-transcription'
      });
    }
    
    await notifyContentScript(tab.id, 'transcriptionStopped');
    
    isCapturing = false;
    currentTabId = null;
    meetingTabId = null;
    
    console.log('✅ AUTO-TRANSCRIPTION stopped - session remains available');
    
  } catch (error) {
    console.error('❌ Error stopping auto-transcription:', error);
  } finally {
    await cleanupOffscreen();
  }
}

// Helper functions
async function ensureContentScript(tabId) {
  if (!isChromeExtensionContext()) return;

  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    console.log('Content script already injected for tab:', tabId);
  } catch (error) {
    console.log('Content script not found for tab:', tabId, ', injecting...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      console.log('✅ Content script injected successfully for tab:', tabId);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (injectError) {
      console.warn('❌ Could not inject content script:', injectError.message);
    }
  }
}

async function notifyContentScript(tabId, action) {
  if (!tabId || !isChromeExtensionContext()) return;
  
  try {
    await chrome.tabs.sendMessage(tabId, { action });
    console.log(`✅ Content script notified (tab ${tabId}): ${action}`);
  } catch (error) {
    console.warn(`Could not notify content script (${action}):`, error.message);
  }
}

async function createOffscreen() {
  if (!isChromeExtensionContext()) return;

  try {
    console.log('Creating offscreen document...');
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording audio from tab for local transcription'
    });
    
    offscreenCreated = true;
    console.log('✅ Offscreen document created');
  } catch (error) {
    console.error('Error creating offscreen document:', error);
    offscreenCreated = false;
    throw error;
  }
}

async function cleanupOffscreen() {
  if (!isChromeExtensionContext()) return;

  try {
    if (offscreenCreated) {
      console.log('Cleaning up offscreen document...');
      await chrome.offscreen.closeDocument();
      console.log('✅ Offscreen document closed');
    }
  } catch (error) {
    console.warn('Error cleaning up offscreen:', error);
  } finally {
    offscreenCreated = false;
  }
}

async function waitForOffscreenReady() {
  if (!isChromeExtensionContext()) return;

  console.log('Waiting for offscreen to be ready...');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  for (let i = 0; i < 30; i++) {
    try {
      console.log(`Ping attempt ${i + 1}...`);
      const response = await sendMessageToOffscreen({ type: 'ping' }, 3000);
      if (response?.success) {
        console.log('✅ Offscreen is ready');
        return;
      } else {
        console.log(`Ping attempt ${i + 1} got invalid response:`, response);
      }
    } catch (error) {
      console.log(`Ping attempt ${i + 1} failed:`, error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error('Offscreen document failed to become ready after 30 attempts');
}

async function sendMessageToOffscreen(message, timeoutMs = 15000) {
  if (!isChromeExtensionContext()) {
    throw new Error('Chrome extension context not available');
  }

  return new Promise((resolve, reject) => {
    if (!offscreenCreated) {
      reject(new Error('Offscreen document not created'));
      return;
    }
    
    const timeout = setTimeout(() => {
      reject(new Error(`Message timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    
    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        resolve(response);
      });
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

async function sendTranscriptionToSupabase(transcriptionData) {
  const supabaseUrl = 'https://jafylkqbmvdptrqwwyed.supabase.co/functions/v1/process-transcription';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY';
  
  const response = await fetch(supabaseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      sessionId: transcriptionData.sessionId,
      text: transcriptionData.text,
      timestamp: transcriptionData.timestamp,
      source: 'chrome-extension-auto'
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

// Clean up when extension is disabled/reloaded
if (isChromeExtensionContext()) {
  chrome.runtime.onSuspend?.addListener(() => {
    console.log('Extension suspending, cleaning up...');
    cleanupOffscreen();
  });
}
