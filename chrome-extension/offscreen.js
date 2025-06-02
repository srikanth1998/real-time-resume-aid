
/* global chrome */

let audioContext = null;
let source = null;
let worklet = null;
let isProcessing = false;
let recognition = null;

// Initialize Web Speech API for transcription
function initializeWebSpeechAPI() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('Web Speech API not supported');
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognizer = new SpeechRecognition();
  
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.lang = 'en-US';
  
  let finalTranscript = '';
  
  recognizer.onresult = (event) => {
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
        // Send final transcription to background
        if (transcript.trim()) {
          chrome.runtime.sendMessage({
            type: 'transcription-result',
            text: transcript.trim()
          });
        }
      } else {
        interimTranscript += transcript;
      }
    }
  };
  
  recognizer.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      console.error('Microphone access denied');
    }
  };
  
  recognizer.onend = () => {
    console.log('Speech recognition ended');
    if (isProcessing) {
      // Restart recognition if we're still processing
      setTimeout(() => {
        if (isProcessing && recognizer) {
          recognizer.start();
        }
      }, 100);
    }
  };
  
  return recognizer;
}

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
    // Initialize Web Speech API
    recognition = initializeWebSpeechAPI();
    if (!recognition) {
      throw new Error('Web Speech API not available');
    }
    
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
    
    // Create audio context for processing
    audioContext = new AudioContext({
      sampleRate: 16000
    });
    
    // Add audio worklet for processing
    await audioContext.audioWorklet.addModule('audio-worklet.js');
    worklet = new AudioWorkletNode(audioContext, 'audio-worklet');
    
    // Create source and connect
    source = audioContext.createMediaStreamSource(stream);
    source.connect(worklet);
    
    // Start speech recognition
    recognition.start();
    
    isProcessing = true;
    console.log('✅ Audio processing started with Web Speech API');
    
  } catch (error) {
    console.error('❌ Error starting audio processing:', error);
    await stopAudioProcessing();
    throw error;
  }
}

async function stopAudioProcessing() {
  console.log('Stopping audio processing...');
  
  isProcessing = false;
  
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  
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

console.log('Offscreen document loaded for transcription');
