/* global chrome */

console.log('InterviewAce transcription background script loaded');

let isCapturing = false;
let offscreenCreated = false;
let currentTabId = null;
let currentSessionId = null;

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('=== EXTENSION ICON CLICKED ===');
  console.log('Tab ID:', tab.id, 'URL:', tab.url);
  
  try {
    if (!isCapturing) {
      await startTranscription(tab);
    } else {
      await stopTranscription(tab);
    }
  } catch (error) {
    console.error('Error toggling transcription:', error);
    showErrorNotification(error.message);
  }
});

// Enhanced session ID extraction function
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
      
      // Look for interview path with session ID
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

// Auto-start transcription when on interview pages
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && 
      (tab.url.includes('lovableproject.com') || 
       tab.url.includes('lovable.app') || 
       tab.url.includes('real-time-resume-aid') ||
       tab.url.includes('preview--'))) {
    
    console.log('🎯 DETECTED INTERVIEW PAGE');
    console.log('Tab ID:', tabId, 'URL:', tab.url);
    
    // Extract session ID from URL
    const sessionId = extractSessionId(tab.url);
    console.log('🔍 SESSION ID EXTRACTION RESULT:', sessionId);
    
    if (sessionId) {
      currentSessionId = sessionId;
      currentTabId = tabId;
      
      console.log('✅ SESSION ID SET:', currentSessionId);
      console.log('✅ TAB ID SET:', currentTabId);
      
      try {
        await ensureContentScript(tabId);
        
        // Send session ID to content script
        await chrome.tabs.sendMessage(tabId, {
          action: 'setSessionId',
          sessionId: sessionId
        });
        
        if (!isCapturing) {
          console.log('🚀 Auto-starting transcription for session:', sessionId);
          await startTranscription(tab);
        }
      } catch (error) {
        console.error('Error auto-starting transcription:', error);
      }
    } else {
      console.warn('⚠️ No session ID found in URL:', tab.url);
    }
  }
});

// Track tab focus changes to update currentTabId and session
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && 
        (tab.url.includes('lovableproject.com') || 
         tab.url.includes('lovable.app') || 
         tab.url.includes('real-time-resume-aid') ||
         tab.url.includes('preview--'))) {
      console.log('🎯 INTERVIEW TAB ACTIVATED:', activeInfo.tabId, tab.url);
      currentTabId = activeInfo.tabId;
      
      // Extract and update session ID
      const sessionId = extractSessionId(tab.url);
      if (sessionId) {
        currentSessionId = sessionId;
        console.log('🔄 Updated current session ID:', sessionId);
      }
    }
  } catch (error) {
    console.warn('Could not get tab info on activation:', error);
  }
});

async function startTranscription(tab) {
  console.log('🚀 STARTING TRANSCRIPTION FOR TAB:', tab.id);
  console.log('🎯 USING SESSION ID:', currentSessionId);
  
  currentTabId = tab.id;
  
  // Extract session ID if not already set
  if (!currentSessionId) {
    currentSessionId = extractSessionId(tab.url);
    console.log('🎯 Extracted session ID for transcription:', currentSessionId);
  }
  
  if (!currentSessionId) {
    console.warn('⚠️ WARNING: No session ID available for transcription');
  }
  
  try {
    // Ensure content script is injected
    await ensureContentScript(tab.id);
    
    // Clean up any existing offscreen first
    await cleanupOffscreen();
    
    // Create new offscreen document
    await createOffscreen();
    
    // Wait for offscreen to be ready
    await waitForOffscreenReady();
    
    // Get stream ID
    console.log('Getting stream ID for tab:', tab.id);
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    });
    
    if (!streamId) {
      throw new Error('Failed to get media stream ID - tab may not have audio or permission denied');
    }

    console.log('Got stream ID:', streamId);
    
    // Start transcription in offscreen with session ID
    const response = await sendMessageToOffscreen({
      type: 'start-transcription',
      streamId: streamId,
      sessionId: currentSessionId
    });
    
    if (!response?.success) {
      throw new Error(response?.error || 'Failed to start transcription in offscreen');
    }
    
    // Notify content script
    await notifyContentScript(tab.id, 'transcriptionStarted');
    
    isCapturing = true;
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#34a853' });
    console.log('✅ Transcription started successfully for tab:', tab.id, 'session:', currentSessionId);
    
  } catch (error) {
    console.error('❌ Error starting transcription:', error);
    currentTabId = null;
    currentSessionId = null;
    isCapturing = false;
    await cleanupOffscreen();
    throw error;
  }
}

async function stopTranscription(tab) {
  console.log('Stopping transcription...');
  
  try {
    if (offscreenCreated) {
      await sendMessageToOffscreen({
        type: 'stop-transcription'
      });
    }
    
    await notifyContentScript(tab.id, 'transcriptionStopped');
    
    isCapturing = false;
    currentTabId = null;
    currentSessionId = null;
    chrome.action.setBadgeText({ text: '' });
    console.log('✅ Transcription stopped');
    
  } catch (error) {
    console.error('❌ Error stopping transcription:', error);
  } finally {
    await cleanupOffscreen();
  }
}

async function ensureContentScript(tabId) {
  try {
    // Test if content script is already injected
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
      
      // Wait a moment for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (injectError) {
      console.warn('❌ Could not inject content script:', injectError.message);
      // Don't throw here - transcription can work without content script
    }
  }
}

async function notifyContentScript(tabId, action) {
  if (!tabId) return;
  
  try {
    await chrome.tabs.sendMessage(tabId, { action });
    console.log(`✅ Content script notified (tab ${tabId}): ${action}`);
  } catch (error) {
    console.warn(`Could not notify content script (${action}):`, error.message);
    // Don't throw - this is not critical for transcription functionality
  }
}

async function createOffscreen() {
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
  console.log('Waiting for offscreen to be ready...');
  
  // Give the offscreen document more time to initialize
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

async function showErrorNotification(message) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'InterviewAce Transcription Error',
      message: message
    });
  } catch (error) {
    console.warn('Could not show notification:', error);
  }
}

// Handle messages from offscreen document
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('🔔 Background received message:', message);
  console.log('📋 Message details:', {
    type: message.type,
    text: message.text ? `"${message.text.substring(0, 50)}..."` : 'undefined',
    timestamp: message.timestamp,
    source: message.source,
    sessionId: message.sessionId || currentSessionId
  });
  
  // Handle ready signal from offscreen
  if (message.type === 'offscreen-ready') {
    console.log('✅ Offscreen document reported ready');
    sendResponse({ success: true });
    return true;
  }
  
  // Handle transcription results from offscreen
  if (message.type === 'transcription-result' && message.text && message.text.trim()) {
    console.log('📢 PROCESSING TRANSCRIPTION RESULT FROM OFFSCREEN');
    console.log('📝 Transcription text:', message.text);
    console.log('🎯 Current session ID:', currentSessionId);
    console.log('🎯 Message session ID:', message.sessionId);
    
    // Use current session ID if message doesn't have one
    const sessionId = message.sessionId || currentSessionId;
    console.log('🎯 Final session ID for processing:', sessionId);
    
    if (!sessionId) {
      console.warn('⚠️ NO SESSION ID AVAILABLE - TRANSCRIPTION WILL NOT SYNC');
      console.warn('⚠️ Current session ID:', currentSessionId);
      console.warn('⚠️ Message session ID:', message.sessionId);
      console.warn('⚠️ Current tab ID:', currentTabId);
    }
    
    // Send to both local content script and Supabase for cross-device sync
    const transcriptionData = {
      text: message.text.trim(),
      timestamp: message.timestamp || Date.now(),
      sessionId: sessionId
    };
    
    // Forward to local content script for immediate UI update
    if (currentTabId) {
      try {
        await chrome.tabs.sendMessage(currentTabId, {
          action: 'transcriptionResult',
          ...transcriptionData
        });
        console.log('✅ Transcription forwarded to local content script');
      } catch (error) {
        console.warn('❌ Error forwarding to local content script:', error);
      }
    }
    
    // Send to Supabase for cross-device sync AND answer generation if we have a session
    if (sessionId) {
      try {
        console.log('📡 Sending transcription to Supabase for cross-device sync and AI answer...');
        await sendTranscriptionToSupabase(transcriptionData);
        console.log('✅ Transcription sent to Supabase successfully');
      } catch (error) {
        console.error('❌ Error sending transcription to Supabase:', error);
        // Don't fail the whole operation if Supabase fails
      }
    } else {
      console.warn('⚠️ No session ID available, skipping cross-device sync and AI answers');
    }
    
    sendResponse({ success: true, forwarded: true, synced: !!sessionId });
    return true;
  }
  
  // Handle ping messages
  if (message.type === 'ping') {
    sendResponse({ success: true, message: 'pong' });
    return true;
  }
  
  sendResponse({ success: true });
  return true;
});

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
      source: 'chrome-extension'
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

// Clean up when extension is disabled/reloaded
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension suspending, cleaning up...');
  cleanupOffscreen();
});
