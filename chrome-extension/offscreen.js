
/* global chrome */

let audioContext = null;
let source = null;
let worklet = null;
let isProcessing = false;
let recognition = null;
let mediaRecorder = null;
let audioChunks = [];

// Initialize Web Speech API for transcription using MediaRecorder
function initializeWebSpeechAPI(stream) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('Web Speech API not supported');
    return null;
  }

  // Create MediaRecorder to convert the stream to audio that Speech API can process
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
      console.log('This is expected - we are processing tab audio, not microphone');
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

// Process audio chunks and send to Speech API via audio element
function processAudioChunk() {
  if (audioChunks.length === 0) return;
  
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  audioChunks = []; // Clear chunks
  
  // Create audio element to play the tab audio (which Speech API can then pick up)
  const audioElement = document.createElement('audio');
  audioElement.src = URL.createObjectURL(audioBlob);
  audioElement.volume = 0.01; // Very low volume to avoid feedback
  
  // Play the audio so Speech API can process it
  audioElement.play().catch(e => {
    console.log('Audio play failed (this might be expected):', e.message);
  });
  
  // Start speech recognition if not already running
  if (recognition && !recognition.started) {
    try {
      recognition.start();
      recognition.started = true;
    } catch (e) {
      console.log('Speech recognition start failed:', e.message);
    }
  }
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
    
    // Initialize Web Speech API with the stream
    recognition = initializeWebSpeechAPI(stream);
    if (!recognition) {
      throw new Error('Web Speech API not available');
    }
    
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
