
/* global chrome */

let audioContext = null;
let source = null;
let worklet = null;
let isProcessing = false;
let mediaRecorder = null;
let audioChunks = [];

// Handle messages from background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Offscreen received message:', message);
  
  try {
    if (message.type === 'start-transcription') {
      console.log('Starting transcription with stream ID:', message.streamId);
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
            stack: startError.stack,
            type: 'start-transcription-error'
          }
        });
      }
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
    // Get user media with the stream ID for tab capture
    console.log('Requesting getUserMedia with tab capture...');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });
    
    console.log('✅ Got tab audio stream:', stream);
    console.log('Stream active:', stream.active);
    console.log('Audio tracks:', stream.getAudioTracks().length);
    
    // Verify we have audio tracks
    if (stream.getAudioTracks().length === 0) {
      throw new Error('No audio tracks found in stream');
    }
    
    // Create MediaRecorder to capture audio data in chunks
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
      ? 'audio/webm;codecs=opus' 
      : 'audio/webm';
    
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType
    });
    
    console.log('✅ MediaRecorder created with mime type:', mimeType);
    
    // Setup audio chunk processing
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log('📦 Audio chunk received, size:', event.data.size);
        audioChunks.push(event.data);
        
        // Process accumulated chunks periodically
        if (audioChunks.length >= 3) { // Process every 3 chunks (~3 seconds)
          processAudioChunks();
        }
      }
    };
    
    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event.error);
    };
    
    mediaRecorder.onstop = () => {
      console.log('MediaRecorder stopped');
      // Process any remaining chunks
      if (audioChunks.length > 0) {
        processAudioChunks();
      }
    };
    
    // Start recording in 1-second chunks
    mediaRecorder.start(1000);
    console.log('✅ MediaRecorder started, capturing audio...');
    
    // Create audio context for additional processing if needed
    audioContext = new AudioContext({
      sampleRate: 16000
    });
    console.log('✅ AudioContext created');
    
    // Create source for potential worklet processing
    source = audioContext.createMediaStreamSource(stream);
    console.log('✅ Audio source connected');
    
    isProcessing = true;
    console.log('✅ Audio processing started successfully');
    
  } catch (error) {
    console.error('❌ Error starting audio processing:', error);
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
  console.log('🔄 Processing', audioChunks.length, 'audio chunks');
  
  try {
    // Combine chunks into single blob
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks = []; // Clear processed chunks
    
    console.log('📝 Audio blob created, size:', audioBlob.size);
    
    // Convert blob to base64 for processing
    const reader = new FileReader();
    reader.onload = function() {
      const base64Audio = reader.result.split(',')[1]; // Remove data URL prefix
      
      // Send to background for transcription processing
      console.log('📤 Sending audio chunk for transcription, size:', base64Audio.length);
      
      // For now, simulate transcription result
      // In a real implementation, this would be sent to a transcription service
      simulateTranscription(base64Audio);
    };
    
    reader.onerror = function(error) {
      console.error('Error reading audio blob:', error);
    };
    
    reader.readAsDataURL(audioBlob);
    
  } catch (error) {
    console.error('Error processing audio chunks:', error);
  }
}

// Simulate transcription for testing - replace with actual service
function simulateTranscription(base64Audio) {
  // For testing, generate a random transcription result
  const testPhrases = [
    "Hello, this is a test transcription",
    "The audio is being processed successfully", 
    "Chrome extension is working properly",
    "Tab audio capture is functioning"
  ];
  
  const randomPhrase = testPhrases[Math.floor(Math.random() * testPhrases.length)];
  
  setTimeout(() => {
    console.log('🎤 Simulated transcription result:', randomPhrase);
    
    // Send transcription result to background
    chrome.runtime.sendMessage({
      type: 'transcription-result',
      text: randomPhrase,
      timestamp: Date.now(),
      simulated: true
    }).catch(err => {
      console.warn('Error sending transcription result:', err);
    });
  }, 500); // Simulate processing delay
}

async function stopAudioProcessing() {
  console.log('Stopping audio processing...');
  
  isProcessing = false;
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop();
    } catch (e) {
      console.log('Error stopping media recorder:', e.message);
    }
    mediaRecorder = null;
  }
  
  if (source) {
    try {
      source.disconnect();
    } catch (e) {
      console.log('Error disconnecting source:', e.message);
    }
    source = null;
  }
  
  if (worklet) {
    try {
      worklet.port.close();
    } catch (e) {
      console.log('Error closing worklet:', e.message);
    }
    worklet = null;
  }
  
  if (audioContext && audioContext.state !== 'closed') {
    try {
      await audioContext.close();
    } catch (e) {
      console.log('Error closing audio context:', e.message);
    }
    audioContext = null;
  }
  
  audioChunks = [];
  
  console.log('✅ Audio processing stopped');
}

console.log('Offscreen document loaded for tab audio transcription');
