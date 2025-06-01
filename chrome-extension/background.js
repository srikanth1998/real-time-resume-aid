
let captureStream = null;
let audioContext = null;
let processor = null;
let isCapturing = false;
let interviewAppTabId = null;

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.action) {
    case 'startCapture':
      startAudioCapture(message.tabId, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'stopCapture':
      stopAudioCapture();
      sendResponse({ success: true });
      break;
      
    case 'getStatus':
      sendResponse({ isCapturing, interviewAppTabId });
      break;
      
    case 'setInterviewApp':
      interviewAppTabId = message.tabId;
      chrome.storage.local.set({ interviewAppTabId: message.tabId });
      sendResponse({ success: true });
      break;
      
    case 'audioData':
      forwardAudioToInterviewApp(message.audioData);
      break;
  }
});

async function startAudioCapture(tabId, sendResponse) {
  try {
    console.log('Starting audio capture for tab:', tabId);
    
    // Check if tabCapture API is available
    if (!chrome.tabCapture) {
      throw new Error('Tab capture API not available');
    }
    
    // Check if tab is audible
    const tab = await chrome.tabs.get(tabId);
    console.log('Tab info:', tab);
    
    if (!tab.audible) {
      console.warn('Tab is not audible, capture may not work');
    }
    
    // Try the newer API first
    if (chrome.tabCapture.getMediaStreamId) {
      console.log('Using getMediaStreamId API');
      
      const streamId = await new Promise((resolve, reject) => {
        chrome.tabCapture.getMediaStreamId({
          targetTabId: tabId
        }, (streamId) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(streamId);
          }
        });
      });
      
      if (!streamId) {
        throw new Error('Failed to get media stream ID');
      }
      
      console.log('Got stream ID:', streamId);
      
      // Get the media stream using the stream ID
      captureStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: streamId
          }
        }
      });
    } else {
      // Fallback to older API
      console.log('Using legacy capture API');
      
      captureStream = await new Promise((resolve, reject) => {
        chrome.tabCapture.capture({
          audio: true,
          video: false
        }, (stream) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(stream);
          }
        });
      });
    }
    
    if (!captureStream) {
      throw new Error('Failed to capture audio stream');
    }
    
    console.log('Audio stream captured successfully');
    
    // Set up audio processing
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ 
      sampleRate: 16000 
    });
    
    const source = audioContext.createMediaStreamSource(captureStream);
    
    // Create processor for real-time audio processing
    if (audioContext.createScriptProcessor) {
      processor = audioContext.createScriptProcessor(4096, 1, 1);
    } else {
      // Fallback for newer browsers
      processor = audioContext.createScriptProcessor(4096, 1, 1);
    }
    
    processor.onaudioprocess = (event) => {
      if (!isCapturing) return;
      
      try {
        const inputData = event.inputBuffer.getChannelData(0);
        const audioData = encodeAudioForAPI(new Float32Array(inputData));
        
        // Forward audio to interview app
        forwardAudioToInterviewApp(audioData);
      } catch (error) {
        console.error('Error processing audio:', error);
      }
    };
    
    source.connect(processor);
    processor.connect(audioContext.destination);
    
    isCapturing = true;
    
    // Store capture state
    chrome.storage.local.set({ 
      isCapturing: true,
      captureTabId: tabId 
    });
    
    sendResponse({ success: true });
    
    console.log('Audio capture started successfully');
    
  } catch (error) {
    console.error('Error starting audio capture:', error);
    
    // Clean up on error
    if (captureStream) {
      captureStream.getTracks().forEach(track => track.stop());
      captureStream = null;
    }
    
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    
    sendResponse({ 
      success: false, 
      error: error.message,
      details: error.stack 
    });
  }
}

function stopAudioCapture() {
  console.log('Stopping audio capture');
  
  isCapturing = false;
  
  if (processor) {
    processor.disconnect();
    processor = null;
  }
  
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  
  if (captureStream) {
    captureStream.getTracks().forEach(track => track.stop());
    captureStream = null;
  }
  
  chrome.storage.local.set({ isCapturing: false });
  
  console.log('Audio capture stopped');
}

function encodeAudioForAPI(float32Array) {
  try {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  } catch (error) {
    console.error('Error encoding audio:', error);
    return '';
  }
}

async function forwardAudioToInterviewApp(audioData) {
  if (!audioData) return;
  
  if (!interviewAppTabId) {
    // Try to find interview app tab
    try {
      const tabs = await chrome.tabs.query({});
      const interviewTab = tabs.find(tab => 
        tab.url && (
          tab.url.includes('lovable.app') || 
          tab.url.includes('localhost') ||
          tab.url.includes('/interview')
        )
      );
      
      if (interviewTab) {
        interviewAppTabId = interviewTab.id;
        chrome.storage.local.set({ interviewAppTabId: interviewTab.id });
      } else {
        console.log('Interview app tab not found');
        return;
      }
    } catch (error) {
      console.error('Error finding interview app tab:', error);
      return;
    }
  }
  
  try {
    // Send audio data to interview app
    await chrome.tabs.sendMessage(interviewAppTabId, {
      action: 'processAudio',
      audioData: audioData
    });
  } catch (error) {
    console.error('Error forwarding audio to interview app:', error);
    // Reset tab ID if sending failed
    interviewAppTabId = null;
  }
}

// Clean up on extension startup
chrome.runtime.onStartup.addListener(() => {
  stopAudioCapture();
});

// Restore state on extension load
chrome.storage.local.get(['interviewAppTabId'], (result) => {
  if (result.interviewAppTabId) {
    interviewAppTabId = result.interviewAppTabId;
  }
});
