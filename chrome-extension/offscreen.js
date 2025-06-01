
/* global chrome */
let audioCtx, source, worklet, ws;
let isStarting = false;
let isStopping = false;

async function start (streamId) {
  // Prevent multiple simultaneous start attempts
  if (isStarting) {
    console.warn('Start already in progress, ignoring duplicate call');
    return;
  }
  
  // Make sure any previous session is properly stopped
  if (audioCtx || source || worklet || ws) {
    await stop(false);
    // Small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  isStarting = true;
  
  try {
    // grab tab-audio via getUserMedia
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
      video: false
    });

    // Create fresh AudioContext
    audioCtx = new AudioContext({ sampleRate: 48000 });
    await audioCtx.audioWorklet.addModule(chrome.runtime.getURL('pcm-worklet.js'));

    worklet = new AudioWorkletNode(audioCtx, 'pcm-worklet');
    
    // For now, just process audio locally without WebSocket
    worklet.port.onmessage = ({ data }) => {
      // Send audio data to the web app instead of WebSocket
      try {
        // Send message to content script which will forward to web app
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'audioData',
              audioData: Array.from(new Float32Array(data))
            }).catch(err => {
              console.warn('Error sending audio to content script:', err);
            });
          }
        });
      } catch (err) {
        console.warn('Error processing audio data:', err);
      }
    };

    source = audioCtx.createMediaStreamSource(stream);
    source.connect(worklet);

    console.log('Audio capture started successfully');
    
  } catch (error) {
    console.error('Error in start function:', error);
    await stop(true);
    throw error;
  } finally {
    isStarting = false;
  }
}

async function stop (report = false) {
  // Prevent multiple simultaneous stop attempts
  if (isStopping) {
    console.warn('Stop already in progress, ignoring duplicate call');
    return;
  }
  
  isStopping = true;
  
  try {
    // Disconnect and clean up audio components
    if (source) {
      try { 
        source.disconnect(); 
        source = null;
      } catch (err) { 
        console.warn('Error disconnecting source:', err); 
      }
    }
    
    if (worklet) {
      try { 
        worklet.port.close();
        worklet = null; 
      } catch (err) { 
        console.warn('Error closing worklet port:', err); 
      }
    }
    
    if (audioCtx && audioCtx.state !== 'closed') {
      try { 
        await audioCtx.close();
      } catch (err) { 
        console.warn('Error closing AudioContext:', err); 
      }
    }
    audioCtx = null;
    
    console.log('Audio capture stopped');
    
    // Report back to background script if requested
    if (report) {
      try {
        chrome.runtime.sendMessage({ type: 'offscreen-stopped' });
      } catch (err) {
        console.warn('Error sending offscreen-stopped message:', err);
      }
    }
  } finally {
    isStopping = false;
  }
}

/* ---------- message bridge ---------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('Offscreen received message:', msg);
  
  if (msg.type === 'offscreen-start') {
    console.log('Received offscreen-start command');
    start(msg.streamId).then(() => {
      console.log('Started successfully');
      sendResponse({ success: true });
    }).catch(err => {
      console.error('offscreen start error', err);
      stop(true);
      sendResponse({ success: false, error: err.message });
    });
    return true; // Indicates async response
  }
  
  if (msg.type === 'offscreen-stop') {
    console.log('Received offscreen-stop command');
    stop().then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      console.error('offscreen stop error', err);
      sendResponse({ success: false, error: err.message });
    });
    return true; // Indicates async response
  }
});
