
/* global chrome */

let audioContext = null;
let source = null;
let worklet = null;
let isProcessing = false;
let recognition = null;
let mediaRecorder = null;
let audioChunks = [];
let virtualAudioElement = null;

// Initialize Web Speech API for transcription using virtual audio playback
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
      console.log('Microphone access denied - this is expected, we will use tab audio instead');
    }
  };
  
  recognizer.onend = () => {
    console.log('Speech recognition ended');
    if (isProcessing) {
      // Restart recognition if we're still processing
      setTimeout(() => {
        if (isProcessing && recognizer) {
          try {
            recognizer.start();
          } catch (e) {
            console.log('Could not restart recognition:', e.message);
          }
        }
      }, 100);
    }
  };
  
  return recognizer;
}

// Create MediaRecorder to capture tab audio and convert to processable format
function initializeMediaRecorder(stream) {
  try {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        processAudioChunk();
      }
    };
    
    mediaRecorder.start(1000); // Capture audio in 1-second chunks
    console.log('✅ MediaRecorder started for tab audio');
    
  } catch (error) {
    console.error('❌ Failed to create MediaRecorder:', error);
    return false;
  }
  return true;
}

// Process audio chunks by playing them through a virtual audio element
function processAudioChunk() {
  if (audioChunks.length === 0) return;
  
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  audioChunks = []; // Clear chunks
  
  // Clean up previous audio element
  if (virtualAudioElement) {
    virtualAudioElement.pause();
    virtualAudioElement.src = '';
    URL.revokeObjectURL(virtualAudioElement.src);
  }
  
  // Create new audio element to play the tab audio
  virtualAudioElement = document.createElement('audio');
  virtualAudioElement.src = URL.createObjectURL(audioBlob);
  virtualAudioElement.volume = 0.1; // Low volume to avoid feedback
  virtualAudioElement.muted = false; // Don't mute - Speech API needs to hear it
  
  // Append to document so Speech API can access it
  document.body.appendChild(virtualAudioElement);
  
  // Play the audio so Speech API can process it
  virtualAudioElement.play().then(() => {
    console.log('Playing tab audio for Speech API processing');
    
    // Start speech recognition if not already running
    if (recognition && !recognition.started) {
      try {
        recognition.start();
        recognition.started = true;
        console.log('Speech recognition started');
      } catch (e) {
        console.log('Speech recognition start failed:', e.message);
      }
    }
  }).catch(e => {
    console.log('Audio play failed:', e.message);
  });
  
  // Clean up after playing
  virtualAudioElement.onended = () => {
    if (virtualAudioElement && virtualAudioElement.parentNode) {
      document.body.removeChild(virtualAudioElement);
    }
    virtualAudioElement = null;
  };
}

// Handle messages from background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Offscreen received message:', message);
  
  try {
    if (message.type === 'start-transcription') {
      console.log('Starting transcription with stream ID:', message.streamId);
      await startAudioProcessing(message.streamId);
      sendResponse({ success: true });
      return true;
    } 
    
    if (message.type === 'stop-transcription') {
      console.log('Stopping transcription');
      await stopAudioProcessing();
      sendResponse({ success: true });
      return true;
    }
    
    // Handle ping for communication testing
    if (message.type === 'ping') {
      sendResponse({ success: true, message: 'pong' });
      return true;
    }
    
    sendResponse({ success: false, error: 'Unknown message type' });
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true;
});

async function startAudioProcessing(streamId) {
  if (isProcessing) {
    console.log('Already processing, stopping first...');
    await stopAudioProcessing();
  }
  
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
    
    console.log('✅ Got tab audio stream');
    
    // Initialize Web Speech API
    recognition = initializeWebSpeechAPI();
    if (!recognition) {
      throw new Error('Web Speech API not available');
    }
    
    // Initialize MediaRecorder to capture and process tab audio
    const recorderInitialized = initializeMediaRecorder(stream);
    if (!recorderInitialized) {
      throw new Error('Failed to initialize MediaRecorder');
    }
    
    // Create audio context for additional processing if needed
    audioContext = new AudioContext({
      sampleRate: 16000
    });
    
    // Add audio worklet for processing
    await audioContext.audioWorklet.addModule('audio-worklet.js');
    worklet = new AudioWorkletNode(audioContext, 'audio-worklet');
    
    // Create source and connect
    source = audioContext.createMediaStreamSource(stream);
    source.connect(worklet);
    
    isProcessing = true;
    console.log('✅ Audio processing started with Web Speech API and tab audio');
    
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
    try {
      recognition.stop();
      recognition.started = false;
    } catch (e) {
      console.log('Error stopping recognition:', e.message);
    }
    recognition = null;
  }
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop();
    } catch (e) {
      console.log('Error stopping media recorder:', e.message);
    }
    mediaRecorder = null;
  }
  
  if (virtualAudioElement) {
    try {
      virtualAudioElement.pause();
      if (virtualAudioElement.parentNode) {
        virtualAudioElement.parentNode.removeChild(virtualAudioElement);
      }
      virtualAudioElement = null;
    } catch (e) {
      console.log('Error cleaning up virtual audio element:', e.message);
    }
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
  
  audioChunks = [];
  
  console.log('✅ Audio processing stopped');
}

console.log('Offscreen document loaded for transcription');
