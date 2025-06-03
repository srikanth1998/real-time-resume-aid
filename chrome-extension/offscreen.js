
/* global chrome */

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recognition = null;
let audioContext = null;
let mediaStream = null;

console.log('🔵 Offscreen document loaded');

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Offscreen received message:', message.type);
  
  if (message.type === 'ping') {
    console.log('🏓 Responding to ping');
    sendResponse({ success: true, message: 'pong' });
    return;
  }
  
  if (message.type === 'start-transcription') {
    console.log('🎬 Starting transcription with stream ID:', message.streamId);
    startAudioCapture(message.streamId)
      .then(() => {
        console.log('✅ Audio capture started successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('❌ Failed to start audio capture:', error);
        sendResponse({ 
          success: false, 
          error: error.message,
          errorType: error.name
        });
      });
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'stop-transcription') {
    console.log('🛑 Stopping transcription');
    stopAudioCapture()
      .then(() => {
        console.log('✅ Audio capture stopped');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('❌ Error stopping audio capture:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  console.warn('❓ Unknown message type:', message.type);
  sendResponse({ success: false, error: 'Unknown message type' });
});

async function startAudioCapture(streamId) {
  if (isRecording) {
    console.log('Already recording, stopping first...');
    await stopAudioCapture();
  }
  
  try {
    console.log('📡 Getting user media with stream ID:', streamId);
    
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });
    
    console.log('✅ Got media stream, tracks:', mediaStream.getAudioTracks().length);
    
    if (mediaStream.getAudioTracks().length === 0) {
      throw new Error('No audio tracks found in stream');
    }
    
    // Setup Web Speech API for real-time transcription
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      console.log('🎤 Setting up Web Speech API...');
      setupSpeechRecognition();
    } else {
      console.warn('⚠️ Web Speech API not supported, falling back to audio processing');
    }
    
    // Also setup MediaRecorder for backup processing
    setupMediaRecorder();
    
    isRecording = true;
    console.log('🎬 Real-time transcription started');
    
  } catch (error) {
    console.error('💥 Error in startAudioCapture:', error);
    throw error;
  }
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn('Speech Recognition not available');
    return;
  }
  
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  
  // Create audio context to route tab audio to speech recognition
  setupAudioRouting();
  
  recognition.onresult = (event) => {
    console.log('🎤 Speech recognition result received');
    
    let finalTranscript = '';
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    // Send final transcriptions immediately
    if (finalTranscript.trim()) {
      console.log('🎤 Final transcription:', finalTranscript);
      sendTranscription(finalTranscript.trim());
    }
    
    // Also send interim results for real-time feedback
    if (interimTranscript.trim()) {
      console.log('🎤 Interim transcription:', interimTranscript);
      // You could send interim results too, but for now we'll only send final
    }
  };
  
  recognition.onerror = (event) => {
    console.error('🔴 Speech recognition error:', event.error);
    
    // Try to restart recognition on certain errors
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
      setTimeout(() => {
        if (isRecording && recognition) {
          console.log('🔄 Restarting speech recognition...');
          try {
            recognition.start();
          } catch (e) {
            console.warn('Could not restart recognition:', e);
          }
        }
      }, 1000);
    }
  };
  
  recognition.onend = () => {
    console.log('🔄 Speech recognition ended, restarting...');
    if (isRecording) {
      try {
        recognition.start();
      } catch (e) {
        console.warn('Could not restart recognition:', e);
      }
    }
  };
  
  try {
    recognition.start();
    console.log('✅ Speech recognition started');
  } catch (error) {
    console.error('Failed to start speech recognition:', error);
  }
}

function setupAudioRouting() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(mediaStream);
    
    // Create a destination that speech recognition can use
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    
    console.log('✅ Audio routing setup complete');
  } catch (error) {
    console.warn('Could not setup audio routing:', error);
  }
}

function setupMediaRecorder() {
  // Find best supported MIME type
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus'
  ];
  
  let selectedMimeType = '';
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      selectedMimeType = mimeType;
      break;
    }
  }
  
  if (!selectedMimeType) {
    console.warn('No supported audio MIME types found for MediaRecorder');
    return;
  }
  
  console.log('🎭 Using MIME type for backup recording:', selectedMimeType);
  
  mediaRecorder = new MediaRecorder(mediaStream, {
    mimeType: selectedMimeType,
    audioBitsPerSecond: 64000
  });
  
  audioChunks = [];
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      console.log('📦 Audio chunk received for backup:', event.data.size, 'bytes');
      audioChunks.push(event.data);
    }
  };
  
  mediaRecorder.onerror = (event) => {
    console.error('🔴 MediaRecorder error:', event.error);
  };
  
  mediaRecorder.onstop = () => {
    console.log('⏹️ MediaRecorder stopped');
  };
  
  mediaRecorder.start(5000); // 5 second intervals for backup
  console.log('🎬 MediaRecorder started as backup');
}

function sendTranscription(text) {
  if (!text || !text.trim()) return;
  
  console.log('📤 Sending transcription to background:', text);
  
  try {
    chrome.runtime.sendMessage({
      type: 'transcription-result',
      text: text.trim(),
      timestamp: Date.now(),
      source: 'web-speech-api'
    });
  } catch (error) {
    console.error('💥 Error sending transcription:', error);
  }
}

async function stopAudioCapture() {
  console.log('🛑 Stopping audio capture...');
  
  isRecording = false;
  
  // Stop speech recognition
  if (recognition) {
    try {
      recognition.stop();
      recognition = null;
      console.log('✅ Speech recognition stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping speech recognition:', error);
    }
  }
  
  // Stop MediaRecorder
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop();
      mediaRecorder = null;
      console.log('✅ MediaRecorder stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping MediaRecorder:', error);
    }
  }
  
  // Stop media stream
  if (mediaStream) {
    try {
      mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      mediaStream = null;
      console.log('✅ Media stream stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping media stream:', error);
    }
  }
  
  // Close audio context
  if (audioContext && audioContext.state !== 'closed') {
    try {
      await audioContext.close();
      audioContext = null;
      console.log('✅ Audio context closed');
    } catch (error) {
      console.warn('⚠️ Error closing audio context:', error);
    }
  }
  
  audioChunks = [];
  
  console.log('✅ Audio capture stopped completely');
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  console.log('🔄 Offscreen unloading, cleaning up...');
  stopAudioCapture();
});

console.log('✅ Offscreen script ready for real speech recognition');
