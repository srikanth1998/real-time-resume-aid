
/* global chrome */
let audioCtx, source, worklet;
let isStarting = false;
let isStopping = false;

async function start (streamId) {
  console.log('=== OFFSCREEN START FUNCTION CALLED ===');
  console.log('Stream ID:', streamId);
  
  // Prevent multiple simultaneous start attempts
  if (isStarting) {
    console.warn('Start already in progress, ignoring duplicate call');
    return;
  }
  
  // Make sure any previous session is properly stopped
  if (audioCtx || source || worklet) {
    console.log('Cleaning up previous audio session...');
    await stop(false);
    // Small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  isStarting = true;
  
  try {
    console.log('Requesting user media with stream ID:', streamId);
    // grab tab-audio via getUserMedia
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
      video: false
    });
    console.log('✅ Got media stream:', stream);

    // Create fresh AudioContext
    console.log('Creating AudioContext...');
    audioCtx = new AudioContext({ sampleRate: 48000 });
    console.log('AudioContext created, state:', audioCtx.state);
    
    console.log('Loading audio worklet module...');
    await audioCtx.audioWorklet.addModule(chrome.runtime.getURL('pcm-worklet.js'));
    console.log('✅ Audio worklet module loaded');

    console.log('Creating AudioWorkletNode...');
    worklet = new AudioWorkletNode(audioCtx, 'pcm-worklet');
    console.log('✅ AudioWorkletNode created');
    
    // Send audio data to background script instead of directly to tabs
    worklet.port.onmessage = ({ data }) => {
      console.log('🎵 Audio worklet received data, length:', new Float32Array(data).length);
      try {
        // Send audio data to background script which will forward to content script
        chrome.runtime.sendMessage({
          type: 'audio-data',
          audioData: Array.from(new Float32Array(data))
        }).then(() => {
          console.log('✅ Audio data sent to background script');
        }).catch(err => {
          console.warn('❌ Error sending audio to background script:', err);
        });
      } catch (err) {
        console.warn('❌ Error processing audio data:', err);
      }
    };

    console.log('Creating media stream source...');
    source = audioCtx.createMediaStreamSource(stream);
    console.log('✅ Media stream source created');
    
    console.log('Connecting source to worklet...');
    source.connect(worklet);
    console.log('✅ Audio pipeline connected');

    console.log('=== AUDIO CAPTURE PIPELINE SETUP COMPLETE ===');
    
  } catch (error) {
    console.error('=== ERROR IN OFFSCREEN START ===', error);
    await stop(true);
    throw error;
  } finally {
    isStarting = false;
  }
}

async function stop (report = false) {
  console.log('=== OFFSCREEN STOP FUNCTION CALLED ===');
  
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
        console.log('Disconnecting source...');
        source.disconnect(); 
        source = null;
        console.log('✅ Source disconnected');
      } catch (err) { 
        console.warn('Error disconnecting source:', err); 
      }
    }
    
    if (worklet) {
      try { 
        console.log('Closing worklet port...');
        worklet.port.close();
        worklet = null;
        console.log('✅ Worklet port closed');
      } catch (err) { 
        console.warn('Error closing worklet port:', err); 
      }
    }
    
    if (audioCtx && audioCtx.state !== 'closed') {
      try { 
        console.log('Closing AudioContext...');
        await audioCtx.close();
        console.log('✅ AudioContext closed');
      } catch (err) { 
        console.warn('Error closing AudioContext:', err); 
      }
    }
    audioCtx = null;
    
    console.log('=== AUDIO CAPTURE CLEANUP COMPLETE ===');
    
    // Report back to background script if requested
    if (report) {
      try {
        console.log('Sending offscreen-stopped message to background...');
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
  console.log('=== OFFSCREEN RECEIVED MESSAGE ===', msg);
  
  if (msg.type === 'offscreen-start') {
    console.log('Received offscreen-start command with streamId:', msg.streamId);
    start(msg.streamId).then(() => {
      console.log('✅ Offscreen started successfully');
      sendResponse({ success: true });
    }).catch(err => {
      console.error('❌ Offscreen start error', err);
      stop(true);
      sendResponse({ success: false, error: err.message });
    });
    return true; // Indicates async response
  }
  
  if (msg.type === 'offscreen-stop') {
    console.log('Received offscreen-stop command');
    stop().then(() => {
      console.log('✅ Offscreen stopped successfully');
      sendResponse({ success: true });
    }).catch(err => {
      console.error('❌ Offscreen stop error', err);
      sendResponse({ success: false, error: err.message });
    });
    return true; // Indicates async response
  }
});
