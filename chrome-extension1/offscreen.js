/* global chrome */

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let audioContext = null;
let mediaStream = null;
let workletNode = null;
let lastTranscriptionTime = 0;
let audioBuffer = [];
let isProcessingAudio = false;
let currentSessionId = null;

// More aggressive real-time capture variables
let continuousAudioBuffer = [];
let lastAudioActivity = 0;
let silenceThreshold = 0.005; // Lower threshold for better sensitivity
let silenceGapMs = 800; // Shorter gap for faster response
let isCapturingPhrase = false;
let captureStartTime = 0;

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
    console.log('🎬 Starting transcription with stream ID:', message.streamId, 'session:', message.sessionId);
    currentSessionId = message.sessionId; // Store session ID
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
    return true;
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
    
    // Create audio context for real-time processing
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000 // Standard rate for speech recognition
    });
    
    // Create source from stream
    const source = audioContext.createMediaStreamSource(mediaStream);
    
    // Load the worklet module
    const workletUrl = chrome.runtime.getURL('audio-processor-worklet.js');
    console.log('Loading worklet from:', workletUrl);
    await audioContext.audioWorklet.addModule(workletUrl);
    
    workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
    
    // Process audio data with aggressive real-time capture
    workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audioData') {
        processRealTimeAudioData(event.data.data);
      }
    };
    
    // Connect audio pipeline
    source.connect(workletNode);
    
    // Reset capture variables
    continuousAudioBuffer = [];
    lastAudioActivity = 0;
    isCapturingPhrase = false;
    captureStartTime = 0;
    
    isRecording = true;
    console.log('🎬 Real-time audio processing started with aggressive capture');
    
  } catch (error) {
    console.error('💥 Error in startAudioCapture:', error);
    throw error;
  }
}

function processRealTimeAudioData(audioData) {
  const now = Date.now();
  const amplitude = calculateAmplitude(audioData);
  
  // Much more sensitive detection
  const isSpeech = amplitude > silenceThreshold;
  
  if (isSpeech) {
    // Speech detected - start or continue capturing
    if (!isCapturingPhrase) {
      console.log('🎤 Starting new phrase capture (faster mode)');
      isCapturingPhrase = true;
      captureStartTime = now;
      continuousAudioBuffer = [];
    }
    
    // Add audio data to buffer
    continuousAudioBuffer.push(...audioData);
    lastAudioActivity = now;
    
  } else {
    // Silence detected
    if (isCapturingPhrase) {
      const silenceDuration = now - lastAudioActivity;
      
      // Shorter silence gap for faster response
      if (silenceDuration >= silenceGapMs) {
        console.log('✅ Quick silence gap reached, processing phrase');
        endPhraseCapture();
      }
    }
  }
}

function calculateAmplitude(audioData) {
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  return Math.sqrt(sum / audioData.length);
}

async function endPhraseCapture() {
  if (!isCapturingPhrase || continuousAudioBuffer.length === 0) {
    return;
  }
  
  console.log('🎯 Processing captured phrase, samples:', continuousAudioBuffer.length);
  
  isCapturingPhrase = false;
  const capturedAudio = [...continuousAudioBuffer];
  continuousAudioBuffer = [];
  
  // Process even shorter audio clips for faster response
  if (capturedAudio.length < 4000) { // Reduced from 8000 for faster processing
    console.log('⚠️ Audio clip too short, skipping. Samples:', capturedAudio.length);
    return;
  }
  
  try {
    console.log('🔄 Converting to WAV...');
    const audioBlob = createWAVBlob(capturedAudio);
    
    console.log('🔢 Converting to base64...');
    const base64Audio = await blobToBase64(audioBlob);
    
    console.log('🚀 Sending to transcription service immediately...');
    const transcription = await sendToSTTService(base64Audio);
    
    if (transcription && transcription.trim()) {
      console.log('✅ Fast transcription received:', transcription);
      sendTranscription(transcription);
    }
    
  } catch (error) {
    console.error('❌ Error in fast processing:', error);
  }
}

function createWAVBlob(audioData) {
  const sampleRate = 16000;
  const numChannels = 1;
  const bytesPerSample = 2;
  
  // Convert float32 to int16
  const int16Data = new Int16Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    int16Data[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
  }
  
  // Create WAV header
  const buffer = new ArrayBuffer(44 + int16Data.length * bytesPerSample);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + int16Data.length * bytesPerSample, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, int16Data.length * bytesPerSample, true);
  
  // Write audio data
  const audioView = new Int16Array(buffer, 44);
  audioView.set(int16Data);
  
  return new Blob([buffer], { type: 'audio/wav' });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function sendToSTTService(base64Audio) {
  try {
    const requestBody = { audio: base64Audio };
    
    const supabaseUrl = 'https://jafylkqbmvdptrqwwyed.supabase.co/functions/v1/speech-to-text';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY';
    
    const response = await fetch(supabaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`STT service error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    return result.text;
    
  } catch (error) {
    console.error('❌ Error calling STT service:', error);
    return null;
  }
}

function sendTranscription(text) {
  if (!text || !text.trim()) {
    return;
  }
  
  console.log('📤 Sending transcription to background:', text);
  
  try {
    const message = {
      type: 'transcription-result',
      text: text.trim(),
      timestamp: Date.now(),
      source: 'whisper-api-realtime',
      sessionId: currentSessionId // Include session ID
    };
    
    chrome.runtime.sendMessage(message).catch((error) => {
      console.warn('⚠️ Message send failed:', error.message);
    });
    
    console.log('✅ Real-time transcription sent with session ID');
  } catch (error) {
    console.error('💥 Error sending transcription:', error);
  }
}

async function stopAudioCapture() {
  console.log('🛑 Stopping audio capture...');
  
  // Send any remaining captured audio before stopping
  if (isCapturingPhrase && continuousAudioBuffer.length > 0) {
    console.log('📤 Sending final captured phrase...');
    await endPhraseCapture();
  }
  
  isRecording = false;
  isProcessingAudio = false;
  isCapturingPhrase = false;
  
  // Stop worklet
  if (workletNode) {
    try {
      workletNode.disconnect();
      workletNode = null;
      console.log('✅ Audio worklet stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping worklet:', error);
    }
  }
  
  // Stop media stream
  if (mediaStream) {
    try {
      mediaStream.getTracks().forEach(track => track.stop());
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
  
  // Reset all variables
  audioChunks = [];
  audioBuffer = [];
  continuousAudioBuffer = [];
  lastAudioActivity = 0;
  
  console.log('✅ Audio capture stopped completely');
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  console.log('🔄 Offscreen unloading, cleaning up...');
  stopAudioCapture();
});

console.log('✅ Offscreen script ready for real-time transcription');
