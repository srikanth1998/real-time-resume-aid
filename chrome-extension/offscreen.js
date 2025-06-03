
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

// Dynamic audio capture variables
let continuousAudioBuffer = [];
let lastAudioActivity = 0;
let silenceThreshold = 0.01; // Amplitude threshold for silence detection
let silenceGapMs = 1000; // 1 second gap
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
    
    // Process audio data with dynamic capture
    workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audioData') {
        processDynamicAudioData(event.data.data);
      }
    };
    
    // Connect audio pipeline
    source.connect(workletNode);
    
    // Reset dynamic capture variables
    continuousAudioBuffer = [];
    lastAudioActivity = 0;
    isCapturingPhrase = false;
    captureStartTime = 0;
    
    isRecording = true;
    console.log('🎬 Dynamic audio processing started');
    
  } catch (error) {
    console.error('💥 Error in startAudioCapture:', error);
    throw error;
  }
}

function processDynamicAudioData(audioData) {
  const now = Date.now();
  const amplitude = calculateAmplitude(audioData);
  
  console.log('🎵 Audio data received, amplitude:', amplitude.toFixed(4));
  
  // Check if this is speech (above silence threshold)
  const isSpeech = amplitude > silenceThreshold;
  
  if (isSpeech) {
    // Speech detected
    if (!isCapturingPhrase) {
      // Start new phrase capture
      console.log('🎤 Starting new phrase capture');
      isCapturingPhrase = true;
      captureStartTime = now;
      continuousAudioBuffer = [];
    }
    
    // Add audio data to continuous buffer
    continuousAudioBuffer.push(...audioData);
    lastAudioActivity = now;
    
    console.log('📝 Capturing speech, buffer size:', continuousAudioBuffer.length);
    
  } else {
    // Silence detected
    if (isCapturingPhrase) {
      const silenceDuration = now - lastAudioActivity;
      console.log('🤫 Silence detected, duration:', silenceDuration, 'ms');
      
      // Check if silence gap is long enough to end phrase
      if (silenceDuration >= silenceGapMs) {
        console.log('✅ Silence gap reached, ending phrase capture');
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
  
  console.log('🎯 Ending phrase capture, total samples:', continuousAudioBuffer.length);
  
  isCapturingPhrase = false;
  const capturedAudio = [...continuousAudioBuffer];
  continuousAudioBuffer = [];
  
  // Only process if we have enough audio (at least 0.5 seconds at 16kHz)
  if (capturedAudio.length < 8000) {
    console.log('⚠️ Audio too short, skipping transcription');
    return;
  }
  
  const captureDuration = (Date.now() - captureStartTime) / 1000;
  console.log('📊 Phrase duration:', captureDuration.toFixed(2), 'seconds');
  
  try {
    // Convert to WAV and send for transcription
    const audioBlob = createWAVBlob(capturedAudio);
    const base64Audio = await blobToBase64(audioBlob);
    
    console.log('🚀 Sending phrase to transcription service...');
    const transcription = await sendToSTTService(base64Audio);
    
    if (transcription && transcription.trim()) {
      console.log('✅ Transcription received:', transcription);
      sendTranscription(transcription);
    } else {
      console.log('⚠️ Empty transcription received');
    }
    
  } catch (error) {
    console.error('❌ Error processing phrase:', error);
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
    console.log('🚀 Sending audio to STT service...');
    
    const response = await fetch('https://eeebqclqovumfepbamcd.supabase.co/functions/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZWJxY2xxb3Z1bWZlcGJhbWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0Mzg4MzQsImV4cCI6MjA1MzAxNDgzNH0.bEFGgq9p5sAfOZQWE38zOqJ5Lmi_oNNJqshR8-Ooa98'
      },
      body: JSON.stringify({
        audio: base64Audio
      })
    });
    
    if (!response.ok) {
      throw new Error(`STT service error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ STT service response:', result);
    
    return result.text;
    
  } catch (error) {
    console.error('❌ Error calling STT service:', error);
    return null;
  }
}

function sendTranscription(text) {
  if (!text || !text.trim()) return;
  
  console.log('📤 Sending transcription to background:', text);
  
  try {
    chrome.runtime.sendMessage({
      type: 'transcription-result',
      text: text.trim(),
      timestamp: Date.now(),
      source: 'whisper-api-dynamic'
    });
  } catch (error) {
    console.error('💥 Error sending transcription:', error);
  }
}

async function stopAudioCapture() {
  console.log('🛑 Stopping audio capture...');
  
  // Send any remaining captured audio before stopping
  if (isCapturingPhrase && continuousAudioBuffer.length > 0) {
    console.log('📤 Sending final captured phrase before stopping...');
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
      console.warn('⚠️ Error stopping audio worklet:', error);
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

console.log('✅ Offscreen script ready for dynamic real-time transcription');
