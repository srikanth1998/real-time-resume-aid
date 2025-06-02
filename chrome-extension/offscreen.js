
/* global chrome */

let audioContext = null;
let source = null;
let mediaRecorder = null;
let audioChunks = [];
let isProcessing = false;

console.log('🔵 Offscreen document loaded and ready');

// Handle messages from background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('📨 Offscreen received message:', message);
  
  try {
    if (message.type === 'ping') {
      console.log('🏓 Ping received, sending pong');
      sendResponse({ success: true, message: 'pong' });
      return true;
    }
    
    if (message.type === 'start-transcription') {
      console.log('🎬 Starting transcription with stream ID:', message.streamId);
      try {
        await startAudioProcessing(message.streamId);
        console.log('✅ Transcription started successfully');
        sendResponse({ success: true });
      } catch (startError) {
        console.error('❌ Failed to start transcription:', startError);
        sendResponse({ 
          success: false, 
          error: startError.message,
          details: {
            name: startError.name,
            stack: startError.stack
          }
        });
      }
      return true;
    } 
    
    if (message.type === 'stop-transcription') {
      console.log('🛑 Stopping transcription');
      await stopAudioProcessing();
      sendResponse({ success: true });
      return true;
    }
    
    console.warn('❓ Unknown message type:', message.type);
    sendResponse({ success: false, error: 'Unknown message type: ' + message.type });
    
  } catch (error) {
    console.error('💥 Error handling message:', error);
    sendResponse({ 
      success: false, 
      error: error.message,
      details: {
        name: error.name,
        stack: error.stack
      }
    });
  }
  
  return true; // Keep message channel open
});

async function startAudioProcessing(streamId) {
  if (isProcessing) {
    console.log('⚠️ Already processing, stopping first...');
    await stopAudioProcessing();
  }
  
  console.log('🎵 Starting audio processing with stream ID:', streamId);
  
  try {
    // Get user media with the stream ID for tab capture
    console.log('📡 Requesting getUserMedia with tab capture...');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });
    
    console.log('✅ Got tab audio stream, active:', stream.active);
    console.log('🔊 Audio tracks:', stream.getAudioTracks().length);
    
    // Verify we have audio tracks
    if (stream.getAudioTracks().length === 0) {
      throw new Error('No audio tracks found in stream');
    }
    
    // Get the best supported MIME type
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm;codecs=vp8,opus', 
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
    
    // Create MediaRecorder
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      audioBitsPerSecond: 64000 // Lower bitrate for better performance
    });
    
    console.log('🎙️ MediaRecorder created successfully');
    
    // Setup event handlers
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log('📦 Audio chunk received, size:', event.data.size, 'bytes');
        audioChunks.push(event.data);
        
        // Process chunks every 2 seconds worth of data
        if (audioChunks.length >= 2) {
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
    
    mediaRecorder.onstart = () => {
      console.log('▶️ MediaRecorder started recording');
    };
    
    // Start recording in 1-second chunks
    mediaRecorder.start(1000);
    console.log('🎬 MediaRecorder started with 1s intervals');
    
    // Create audio context for monitoring
    audioContext = new AudioContext({ sampleRate: 16000 });
    source = audioContext.createMediaStreamSource(stream);
    
    console.log('🎛️ AudioContext created for monitoring');
    
    isProcessing = true;
    console.log('✅ Audio processing started successfully');
    
  } catch (error) {
    console.error('💥 Error in startAudioProcessing:', error);
    await stopAudioProcessing();
    throw error;
  }
}

function processAudioChunks() {
  if (audioChunks.length === 0) return;
  
  console.log('🔄 Processing', audioChunks.length, 'audio chunks');
  
  try {
    // Combine chunks into single blob
    const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
    const chunkCount = audioChunks.length;
    audioChunks = []; // Clear processed chunks
    
    console.log('🎵 Audio blob created, size:', audioBlob.size, 'bytes from', chunkCount, 'chunks');
    
    // Convert blob to base64
    const reader = new FileReader();
    reader.onload = function() {
      try {
        const base64Audio = reader.result.split(',')[1]; // Remove data URL prefix
        console.log('📝 Base64 audio created, length:', base64Audio.length);
        
        // Simulate transcription for now
        simulateTranscription(base64Audio);
        
      } catch (readerError) {
        console.error('💥 Error processing base64:', readerError);
      }
    };
    
    reader.onerror = function(error) {
      console.error('💥 FileReader error:', error);
    };
    
    reader.readAsDataURL(audioBlob);
    
  } catch (error) {
    console.error('💥 Error in processAudioChunks:', error);
  }
}

// Simulate transcription - replace with real service later
function simulateTranscription(base64Audio) {
  const testPhrases = [
    "Can you tell me about yourself?",
    "What are your greatest strengths?", 
    "Why do you want to work here?",
    "Where do you see yourself in 5 years?",
    "Tell me about a challenging project you worked on."
  ];
  
  const randomPhrase = testPhrases[Math.floor(Math.random() * testPhrases.length)];
  
  // Simulate processing delay
  setTimeout(() => {
    console.log('🎤 Simulated transcription:', randomPhrase);
    
    // Send result to background
    try {
      chrome.runtime.sendMessage({
        type: 'transcription-result',
        text: randomPhrase,
        timestamp: Date.now(),
        simulated: true,
        audioSize: base64Audio.length
      });
      console.log('📤 Transcription result sent to background');
    } catch (sendError) {
      console.error('💥 Error sending transcription result:', sendError);
    }
  }, 200 + Math.random() * 500); // Random delay 200-700ms
}

async function stopAudioProcessing() {
  console.log('🛑 Stopping audio processing...');
  
  isProcessing = false;
  
  // Stop MediaRecorder
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop();
      console.log('⏹️ MediaRecorder stopped');
    } catch (e) {
      console.warn('⚠️ Error stopping MediaRecorder:', e.message);
    }
    mediaRecorder = null;
  }
  
  // Disconnect audio source
  if (source) {
    try {
      source.disconnect();
      console.log('🔌 Audio source disconnected');
    } catch (e) {
      console.warn('⚠️ Error disconnecting source:', e.message);
    }
    source = null;
  }
  
  // Close audio context
  if (audioContext && audioContext.state !== 'closed') {
    try {
      await audioContext.close();
      console.log('🎛️ AudioContext closed');
    } catch (e) {
      console.warn('⚠️ Error closing AudioContext:', e.message);
    }
    audioContext = null;
  }
  
  // Clear remaining chunks
  audioChunks = [];
  
  console.log('✅ Audio processing stopped completely');
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  console.log('🔄 Offscreen document unloading, cleaning up...');
  stopAudioProcessing();
});

console.log('✅ Offscreen document initialization complete');
