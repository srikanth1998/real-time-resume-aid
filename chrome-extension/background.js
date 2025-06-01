
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
    
    // Get media stream ID for the tab
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId
    });
    
    if (!streamId) {
      throw new Error('Failed to get media stream ID');
    }
    
    // Get the media stream using the stream ID
    captureStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    });
    
    if (!captureStream) {
      throw new Error('Failed to capture audio stream');
    }
    
    // Set up audio processing
    audioContext = new AudioContext({ sampleRate: 24000 });
    const source = audioContext.createMediaStreamSource(captureStream);
    
    // Create processor for real-time audio processing
    processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (event) => {
      if (!isCapturing) return;
      
      const inputData = event.inputBuffer.getChannelData(0);
      const audioData = encodeAudioForAPI(new Float32Array(inputData));
      
      // Forward audio to interview app
      forwardAudioToInterviewApp(audioData);
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
    sendResponse({ success: false, error: error.message });
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
}

async function forwardAudioToInterviewApp(audioData) {
  if (!interviewAppTabId) {
    // Try to find interview app tab
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
