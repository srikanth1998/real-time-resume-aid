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
        
        // Properly serialize the error
        const errorDetails = {
          message: startError.message,
          name: startError.name,
          stack: startError.stack,
          code: startError.code,
          constraint: startError.constraint
        };
        
        console.log('📤 Sending detailed error:', errorDetails);
        sendResponse({ 
          success: false, 
          error: startError.message,
          errorName: startError.name,
          errorDetails: errorDetails
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
    
    // Properly serialize the error
    const errorDetails = {
      message: error.message,
      name: error.name,
      stack: error.stack
    };
    
    sendResponse({ 
      success: false, 
      error: error.message,
      errorName: error.name,
      errorDetails: errorDetails
    });
  }
  
  return true;
});

async function startAudioProcessing(streamId) {
  console.log('🎵 Starting audio processing with stream ID:', streamId);
  
  if (isProcessing) {
    console.log('⚠️ Already processing, stopping first...');
    await stopAudioProcessing();
  }
  
  if (!streamId) {
    throw new Error('No stream ID provided');
  }
  
  try {
    console.log('📡 Requesting getUserMedia with constraints...');
    console.log('Stream ID type:', typeof streamId, 'Value:', streamId);
    
    const constraints = {
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    };
    
    console.log('🎛️ Media constraints:', JSON.stringify(constraints, null, 2));
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    console.log('✅ Got tab audio stream, active:', stream.active);
    console.log('🔊 Audio tracks:', stream.getAudioTracks().length);
    
    if (!stream.active) {
      throw new Error('Stream is not active');
    }
    
    if (stream.getAudioTracks().length === 0) {
      throw new Error('No audio tracks found in stream');
    }
    
    const audioTrack = stream.getAudioTracks()[0];
    console.log('🎵 Audio track settings:', audioTrack.getSettings());
    console.log('🎵 Audio track state:', audioTrack.readyState);
    
    if (audioTrack.readyState !== 'live') {
      throw new Error(`Audio track is not live, state: ${audioTrack.readyState}`);
    }
    
    // Test MediaRecorder support
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
        console.log('✅ Supported MIME type found:', mimeType);
        break;
      }
    }
    
    if (!selectedMimeType) {
      throw new Error('No supported audio MIME types found. Available types: ' + mimeTypes.join(', '));
    }
    
    console.log('🎭 Using MIME type:', selectedMimeType);
    
    // Create MediaRecorder
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      audioBitsPerSecond: 64000
    });
    
    console.log('🎙️ MediaRecorder created successfully, state:', mediaRecorder.state);
    
    // Setup event handlers
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log('📦 Audio chunk received, size:', event.data.size, 'bytes');
        audioChunks.push(event.data);
        
        if (audioChunks.length >= 2) {
          processAudioChunks();
        }
      }
    };
    
    mediaRecorder.onerror = (event) => {
      console.error('🔴 MediaRecorder error:', event.error);
      throw new Error(`MediaRecorder error: ${event.error?.message || 'Unknown error'}`);
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
    
    // Start recording
    console.log('🎬 Starting MediaRecorder...');
    mediaRecorder.start(1000);
    
    // Wait for it to actually start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MediaRecorder failed to start within 2 seconds'));
      }, 2000);
      
      mediaRecorder.onstart = () => {
        clearTimeout(timeout);
        console.log('▶️ MediaRecorder confirmed started');
        resolve(true);
      };
    });
    
    console.log('🎬 MediaRecorder started with 1s intervals, state:', mediaRecorder.state);
    
    // Create audio context for monitoring
    audioContext = new AudioContext({ sampleRate: 16000 });
    source = audioContext.createMediaStreamSource(stream);
    
    console.log('🎛️ AudioContext created for monitoring');
    
    isProcessing = true;
    console.log('✅ Audio processing started successfully');
    
  } catch (error) {
    console.error('💥 Error in startAudioProcessing:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    await stopAudioProcessing();
    throw error;
  }
}

function processAudioChunks() {
  if (audioChunks.length === 0) return;
  
  console.log('🔄 Processing', audioChunks.length, 'audio chunks');
  
  try {
    const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
    const chunkCount = audioChunks.length;
    audioChunks = [];
    
    console.log('🎵 Audio blob created, size:', audioBlob.size, 'bytes from', chunkCount, 'chunks');
    
    const reader = new FileReader();
    reader.onload = function() {
      try {
        const base64Audio = reader.result.split(',')[1];
        console.log('📝 Base64 audio created, length:', base64Audio.length);
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

function simulateTranscription(base64Audio) {
  const testPhrases = [
    "Can you tell me about yourself?",
    "What are your greatest strengths?", 
    "Why do you want to work here?",
    "Where do you see yourself in 5 years?",
    "Tell me about a challenging project you worked on."
  ];
  
  const randomPhrase = testPhrases[Math.floor(Math.random() * testPhrases.length)];
  
  setTimeout(() => {
    console.log('🎤 Simulated transcription:', randomPhrase);
    
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
  }, 200 + Math.random() * 500);
}

async function stopAudioProcessing() {
  console.log('🛑 Stopping audio processing...');
  
  isProcessing = false;
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop();
      console.log('⏹️ MediaRecorder stopped');
    } catch (e) {
      console.warn('⚠️ Error stopping MediaRecorder:', e.message);
    }
    mediaRecorder = null;
  }
  
  if (source) {
    try {
      source.disconnect();
      console.log('🔌 Audio source disconnected');
    } catch (e) {
      console.warn('⚠️ Error disconnecting source:', e.message);
    }
    source = null;
  }
  
  if (audioContext && audioContext.state !== 'closed') {
    try {
      await audioContext.close();
      console.log('🎛️ AudioContext closed');
    } catch (e) {
      console.warn('⚠️ Error closing AudioContext:', e.message);
    }
    audioContext = null;
  }
  
  audioChunks = [];
  console.log('✅ Audio processing stopped completely');
}

window.addEventListener('beforeunload', () => {
  console.log('🔄 Offscreen document unloading, cleaning up...');
  stopAudioProcessing();
});

console.log('✅ Offscreen document initialization complete');
