
/* global chrome */

let audioContext = null;
let source = null;
let worklet = null;
let isProcessing = false;

// Handle messages from background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Offscreen received message:', message);
  
  if (message.type === 'start-transcription') {
    await startAudioProcessing(message.streamId);
    sendResponse({success: true});
  } else if (message.type === 'stop-transcription') {
    await stopAudioProcessing();
    sendResponse({success: true});
  }
  
  return true;
});

async function startAudioProcessing(streamId) {
  if (isProcessing) return;
  
  console.log('Starting audio processing with stream ID:', streamId);
  
  try {
    // Get user media with the stream ID
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });
    
    // Create audio context
    audioContext = new AudioContext({
      sampleRate: 16000 // Whisper model sample rate
    });
    
    // Add audio worklet
    await audioContext.audioWorklet.addModule('audio-worklet.js');
    
    // Create worklet node
    worklet = new AudioWorkletNode(audioContext, 'audio-worklet');
    
    // Handle audio data from worklet
    worklet.port.onmessage = (event) => {
      if (event.data.type === 'audioData') {
        // Send audio data to background for transcription
        chrome.runtime.sendMessage({
          type: 'audio-data',
          audioData: event.data.data
        });
      }
    };
    
    // Create source and connect
    source = audioContext.createMediaStreamSource(stream);
    source.connect(worklet);
    
    isProcessing = true;
    console.log('✅ Audio processing started');
    
  } catch (error) {
    console.error('❌ Error starting audio processing:', error);
    await stopAudioProcessing();
  }
}

async function stopAudioProcessing() {
  console.log('Stopping audio processing...');
  
  isProcessing = false;
  
  if (source) {
    source.disconnect();
    source = null;
  }
  
  if (worklet) {
    worklet.port.close();
    worklet = null;
  }
  
  if (audioContext && audioContext.state !== 'closed') {
    await audioContext.close();
    audioContext = null;
  }
  
  console.log('✅ Audio processing stopped');
}

console.log('Offscreen document loaded');
