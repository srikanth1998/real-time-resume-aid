
/* global chrome */

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

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
    
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });
    
    console.log('✅ Got media stream, tracks:', stream.getAudioTracks().length);
    
    if (stream.getAudioTracks().length === 0) {
      throw new Error('No audio tracks found in stream');
    }
    
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
      throw new Error('No supported audio MIME types found');
    }
    
    console.log('🎭 Using MIME type:', selectedMimeType);
    
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      audioBitsPerSecond: 64000
    });
    
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log('📦 Audio chunk received:', event.data.size, 'bytes');
        audioChunks.push(event.data);
        
        // Process chunks when we have enough
        if (audioChunks.length >= 3) {
          processAudioChunks();
        }
      }
    };
    
    mediaRecorder.onerror = (event) => {
      console.error('🔴 MediaRecorder error:', event.error);
    };
    
    mediaRecorder.onstop = () => {
      console.log('⏹️ MediaRecorder stopped');
      if (audioChunks.length > 0) {
        processAudioChunks();
      }
    };
    
    mediaRecorder.start(1000); // 1 second intervals
    isRecording = true;
    
    console.log('🎬 MediaRecorder started');
    
  } catch (error) {
    console.error('💥 Error in startAudioCapture:', error);
    throw error;
  }
}

function processAudioChunks() {
  if (audioChunks.length === 0) return;
  
  try {
    const audioBlob = new Blob(audioChunks, { 
      type: mediaRecorder ? mediaRecorder.mimeType : 'audio/webm' 
    });
    
    console.log('🎵 Processing audio blob, size:', audioBlob.size, 'bytes');
    
    // Clear chunks
    audioChunks = [];
    
    // Simulate transcription for now
    simulateTranscription();
    
  } catch (error) {
    console.error('💥 Error processing audio chunks:', error);
  }
}

function simulateTranscription() {
  const phrases = [
    "What are your greatest strengths?",
    "Tell me about yourself",
    "Why do you want to work here?",
    "Describe a challenging project",
    "Where do you see yourself in 5 years?"
  ];
  
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  
  setTimeout(() => {
    console.log('🎤 Sending simulated transcription:', randomPhrase);
    
    try {
      chrome.runtime.sendMessage({
        type: 'transcription-result',
        text: randomPhrase,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('💥 Error sending transcription:', error);
    }
  }, 500 + Math.random() * 1000);
}

async function stopAudioCapture() {
  console.log('🛑 Stopping audio capture...');
  
  isRecording = false;
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop();
      
      // Get all tracks and stop them
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => {
          track.stop();
        });
      }
    } catch (error) {
      console.warn('⚠️ Error stopping MediaRecorder:', error);
    }
  }
  
  mediaRecorder = null;
  audioChunks = [];
  
  console.log('✅ Audio capture stopped completely');
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  console.log('🔄 Offscreen unloading, cleaning up...');
  stopAudioCapture();
});

console.log('✅ Offscreen script ready');
