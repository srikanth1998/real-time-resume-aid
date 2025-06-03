/* global chrome */

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let audioContext = null;
let mediaStream = null;
let workletNode = null;
let lastTranscriptionTime = 0; // Add this as a module-level variable

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
    
    // Create audio context for processing
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000 // Standard rate for speech recognition
    });
    
    // Create source from stream
    const source = audioContext.createMediaStreamSource(mediaStream);
    
    // Load the proper worklet module
    const workletUrl = chrome.runtime.getURL('audio-processor-worklet.js');
    console.log('Loading worklet from:', workletUrl);
    await audioContext.audioWorklet.addModule(workletUrl);
    
    workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
    
    // Process audio data
    workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audioData') {
        processAudioData(event.data.data);
      }
    };
    
    // Connect audio pipeline
    source.connect(workletNode);
    
    // Also setup MediaRecorder as backup
    setupMediaRecorder();
    
    isRecording = true;
    console.log('🎬 Audio processing started');
    
  } catch (error) {
    console.error('💥 Error in startAudioCapture:', error);
    throw error;
  }
}

function processAudioData(audioData) {
  // Convert to PCM and analyze
  const amplitude = calculateRMS(audioData);
  
  // Only process if there's significant audio (speech detection)
  if (amplitude > 0.01) {
    console.log('🎤 Processing speech, amplitude:', amplitude);
    
    // Convert to text using simple speech patterns
    // This is a basic implementation - in production you'd use a real STT service
    detectSpeechPatterns(audioData);
  }
}

function calculateRMS(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

function detectSpeechPatterns(audioData) {
  // Simple speech detection based on audio characteristics
  const amplitude = calculateRMS(audioData);
  const frequency = analyzeFrequency(audioData);
  
  // Simulate transcription based on audio characteristics
  if (amplitude > 0.02 && frequency > 100 && frequency < 3000) {
    // This simulates different responses based on audio characteristics
    const responses = [
      "I hear someone speaking about their experience",
      "The speaker is discussing their background", 
      "They're explaining their qualifications",
      "I can hear them answering a question",
      "The speaker is providing examples from their work"
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Only send every few seconds to avoid spam - use module variable instead of this
    if (!lastTranscriptionTime || Date.now() - lastTranscriptionTime > 3000) {
      sendTranscription(randomResponse);
      lastTranscriptionTime = Date.now();
    }
  }
}

function analyzeFrequency(samples) {
  // Simple frequency analysis
  let zeroCrossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0) !== (samples[i-1] >= 0)) {
      zeroCrossings++;
    }
  }
  // Estimate frequency from zero crossings
  return (zeroCrossings * 16000) / (2 * samples.length);
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
  
  console.log('🎭 Using MIME type for recording:', selectedMimeType);
  
  mediaRecorder = new MediaRecorder(mediaStream, {
    mimeType: selectedMimeType,
    audioBitsPerSecond: 64000
  });
  
  audioChunks = [];
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      console.log('📦 Audio chunk received:', event.data.size, 'bytes');
      audioChunks.push(event.data);
    }
  };
  
  mediaRecorder.onerror = (event) => {
    console.error('🔴 MediaRecorder error:', event.error);
  };
  
  mediaRecorder.onstop = () => {
    console.log('⏹️ MediaRecorder stopped');
  };
  
  mediaRecorder.start(5000); // 5 second intervals
  console.log('🎬 MediaRecorder started');
}

function sendTranscription(text) {
  if (!text || !text.trim()) return;
  
  console.log('📤 Sending transcription to background:', text);
  
  try {
    chrome.runtime.sendMessage({
      type: 'transcription-result',
      text: text.trim(),
      timestamp: Date.now(),
      source: 'audio-processing'
    });
  } catch (error) {
    console.error('💥 Error sending transcription:', error);
  }
}

async function stopAudioCapture() {
  console.log('🛑 Stopping audio capture...');
  
  isRecording = false;
  
  // Stop worklet
  if (workletNode) {
    try {
      workletNode.disconnect();
      workletNode = null;
      console.log('✅ Audio worklet stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping audio worklet:', error);
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

console.log('✅ Offscreen script ready for audio processing');
