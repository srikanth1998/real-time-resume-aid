
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
  console.log('Starting audio capture for tab:', tabId);
  
  try {
    // Stop any existing capture
    if (captureStream) {
      stopAudioCapture();
    }

    // Check if tab exists and is valid
    const tab = await chrome.tabs.get(tabId);
    console.log('Tab info:', tab);
    
    if (!tab) {
      throw new Error('Tab not found');
    }

    // Use chrome.tabCapture.capture with proper error handling
    const stream = await new Promise((resolve, reject) => {
      chrome.tabCapture.capture({
        audio: true,
        video: false
      }, (stream) => {
        if (chrome.runtime.lastError) {
          console.error('Tab capture error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!stream) {
          reject(new Error('No stream returned from tabCapture.capture'));
        } else {
          resolve(stream);
        }
      });
    });

    captureStream = stream;
    console.log('Audio stream captured successfully:', stream);

    // Set up audio context and processing
    audioContext = new AudioContext({ sampleRate: 16000 });
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(stream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    let audioBuffer = [];
    let bufferSize = 0;
    const maxBufferSize = 16000 * 2; // 2 seconds of audio at 16kHz

    processor.onaudioprocess = (event) => {
      if (!isCapturing) return;
      
      try {
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Add to buffer
        audioBuffer.push(new Float32Array(inputData));
        bufferSize += inputData.length;
        
        // Process when buffer is full
        if (bufferSize >= maxBufferSize) {
          const combinedBuffer = new Float32Array(bufferSize);
          let offset = 0;
          
          for (const chunk of audioBuffer) {
            combinedBuffer.set(chunk, offset);
            offset += chunk.length;
          }
          
          const audioData = encodeAudioForAPI(combinedBuffer);
          if (audioData) {
            forwardAudioToInterviewApp(audioData);
          }
          
          // Reset buffer
          audioBuffer = [];
          bufferSize = 0;
        }
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
    
    console.log('Audio capture started successfully');
    sendResponse({ success: true });
    
  } catch (error) {
    console.error('Error starting audio capture:', error);
    
    // Clean up on error
    stopAudioCapture();
    
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

function stopAudioCapture() {
  console.log('Stopping audio capture');
  
  isCapturing = false;
  
  if (processor) {
    try {
      processor.disconnect();
    } catch (e) {
      console.warn('Error disconnecting processor:', e);
    }
    processor = null;
  }
  
  if (audioContext) {
    try {
      audioContext.close();
    } catch (e) {
      console.warn('Error closing audio context:', e);
    }
    audioContext = null;
  }
  
  if (captureStream) {
    try {
      captureStream.getTracks().forEach(track => track.stop());
    } catch (e) {
      console.warn('Error stopping stream tracks:', e);
    }
    captureStream = null;
  }
  
  chrome.storage.local.set({ isCapturing: false });
  console.log('Audio capture stopped');
}

function encodeAudioForAPI(float32Array) {
  try {
    // Convert to 16-bit PCM
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Convert to base64
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
    await chrome.tabs.sendMessage(interviewAppTabId, {
      action: 'processAudio',
      audioData: audioData
    });
  } catch (error) {
    console.error('Error forwarding audio to interview app:', error);
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
