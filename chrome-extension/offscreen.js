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

// Audio passthrough variables
let audioOutput = null;
let gainNode = null;

// Dynamic audio capture variables
let continuousAudioBuffer = [];
let lastAudioActivity = 0;
let silenceThreshold = 0.01;
let silenceGapMs = 1000;
let isCapturingPhrase = false;
let captureStartTime = 0;

console.log('🔵 Offscreen document loaded and initializing...');

// Setup message handlers immediately
setupMessageHandlers();

function setupMessageHandlers() {
  console.log('🔧 Setting up message handlers in offscreen...');
  
  // Handle messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Offscreen received message:', message.type);
    
    // ALWAYS respond to ping messages immediately and synchronously
    if (message.type === 'ping') {
      console.log('🏓 Responding to ping with success');
      sendResponse({ success: true, message: 'pong' });
      return true; // Keep message channel open
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
      return true; // Keep message channel open for async response
    }
    
    console.warn('❓ Unknown message type:', message.type);
    sendResponse({ success: false, error: 'Unknown message type' });
    return true;
  });

  console.log('✅ Message handlers set up successfully');
  
  // Send ready signal to background script after handlers are set up
  console.log('📡 Sending ready signal to background...');
  chrome.runtime.sendMessage({ type: 'offscreen-ready' }).catch((error) => {
    console.warn('Could not send ready signal (background might not be listening yet):', error.message);
  });
}

async function startAudioCapture(streamId) {
  console.log('🎬 Starting audio capture with stream ID:', streamId);
  
  if (isRecording) {
    console.log('Already recording, stopping first...');
    await stopAudioCapture();
  }
  
  try {
    console.log('📡 Getting user media with stream ID:', streamId);
    
    // Request media stream with specific audio constraints
    const constraints = {
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    };
    
    console.log('🎯 Requesting media with constraints:', constraints);
    
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    console.log('✅ Got media stream, tracks:', mediaStream.getAudioTracks().length);
    
    if (mediaStream.getAudioTracks().length === 0) {
      throw new Error('No audio tracks found in stream');
    }
    
    const audioTrack = mediaStream.getAudioTracks()[0];
    console.log('🎵 Audio track details:', {
      kind: audioTrack.kind,
      label: audioTrack.label,
      enabled: audioTrack.enabled,
      readyState: audioTrack.readyState
    });
    
    // Create audio context for processing
    console.log('🎧 Creating AudioContext...');
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000
    });
    
    console.log('📊 AudioContext state:', audioContext.state);
    
    // Create source from stream
    console.log('🔗 Creating media stream source...');
    const source = audioContext.createMediaStreamSource(mediaStream);
    
    // Create gain node for volume control
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0; // Full volume
    
    // Connect to audio output (speakers) for passthrough
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    console.log('🔊 Audio passthrough enabled - you should hear the audio now');
    
    // Load the proper worklet module for transcription
    const workletUrl = chrome.runtime.getURL('audio-processor-worklet.js');
    console.log('Loading worklet from:', workletUrl);
    
    try {
      await audioContext.audioWorklet.addModule(workletUrl);
      console.log('✅ Worklet module loaded successfully');
    } catch (workletError) {
      console.error('❌ Failed to load worklet module:', workletError);
      throw new Error(`Failed to load audio worklet: ${workletError.message}`);
    }
    
    workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
    
    // Process audio data with dynamic capture (for transcription)
    workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audioData') {
        processDynamicAudioData(event.data.data);
      }
    };
    
    // Connect audio pipeline for transcription (parallel to passthrough)
    source.connect(workletNode);
    
    // Reset dynamic capture variables
    continuousAudioBuffer = [];
    lastAudioActivity = 0;
    isCapturingPhrase = false;
    captureStartTime = 0;
    
    isRecording = true;
    console.log('🎬 Audio capture and passthrough started successfully');
    
  } catch (error) {
    console.error('💥 Error in startAudioCapture:', error);
    console.error('💥 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Clean up any partial setup
    if (audioContext) {
      try {
        await audioContext.close();
        audioContext = null;
      } catch (cleanupError) {
        console.warn('Error cleaning up AudioContext:', cleanupError);
      }
    }
    
    if (mediaStream) {
      try {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
      } catch (cleanupError) {
        console.warn('Error cleaning up media stream:', cleanupError);
      }
    }
    
    throw new Error(`Error starting tab capture: ${error.message}`);
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
    console.log('⚠️ No phrase to capture or already ended');
    return;
  }
  
  console.log('🎯 Ending phrase capture, total samples:', continuousAudioBuffer.length);
  
  isCapturingPhrase = false;
  const capturedAudio = [...continuousAudioBuffer];
  continuousAudioBuffer = [];
  
  // Only process if we have enough audio (at least 0.5 seconds at 16kHz)
  if (capturedAudio.length < 8000) {
    console.log('⚠️ Audio too short, skipping transcription. Samples:', capturedAudio.length);
    return;
  }
  
  const captureDuration = (Date.now() - captureStartTime) / 1000;
  console.log('📊 Phrase duration:', captureDuration.toFixed(2), 'seconds');
  
  try {
    console.log('🔄 Converting audio to WAV format...');
    // Convert to WAV and send for transcription
    const audioBlob = createWAVBlob(capturedAudio);
    console.log('📦 Created WAV blob, size:', audioBlob.size, 'bytes');
    
    console.log('🔢 Converting to base64...');
    const base64Audio = await blobToBase64(audioBlob);
    console.log('✅ Base64 conversion complete, length:', base64Audio.length);
    
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
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
}

function createWAVBlob(audioData) {
  console.log('🎧 Creating WAV blob from', audioData.length, 'samples');
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
  
  console.log('✅ WAV blob created successfully');
  return new Blob([buffer], { type: 'audio/wav' });
}

function blobToBase64(blob) {
  console.log('🔄 Converting blob to base64...');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      console.log('✅ Base64 conversion successful');
      resolve(base64);
    };
    reader.onerror = (error) => {
      console.error('❌ Base64 conversion failed:', error);
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
}

async function sendToSTTService(base64Audio) {
  try {
    console.log('🚀 Sending audio to STT service...');
    console.log('📊 Audio data size:', base64Audio.length, 'characters');
    
    const requestBody = {
      audio: base64Audio
    };
    
    // Use the correct Supabase project URL
    const supabaseUrl = 'https://jafylkqbmvdptrqwwyed.supabase.co/functions/v1/speech-to-text';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY';
    
    console.log('📡 Making request to Supabase function:', supabaseUrl);
    console.log('🔑 Using auth key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...');
    
    const response = await fetch(supabaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📬 STT service response status:', response.status, response.statusText);
    console.log('📬 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ STT service error response:', errorText);
      throw new Error(`STT service error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ STT service response:', result);
    
    return result.text;
    
  } catch (error) {
    console.error('❌ Error calling STT service:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Add more specific error handling
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error('🌐 Network connectivity issue - check if Supabase domain is accessible');
      console.error('🔍 Trying to reach:', 'https://jafylkqbmvdptrqwwyed.supabase.co');
    }
    
    return null;
  }
}

function sendTranscription(text) {
  if (!text || !text.trim()) {
    console.log('⚠️ No text to send or empty text');
    return;
  }
  
  console.log('📤 Sending transcription to background:', text);
  
  try {
    const message = {
      type: 'transcription-result',
      text: text.trim(),
      timestamp: Date.now(),
      source: 'whisper-api-dynamic'
    };
    
    console.log('📨 Message being sent:', message);
    
    // Send message without waiting for response to avoid port closure issues
    chrome.runtime.sendMessage(message).catch((error) => {
      console.warn('⚠️ Message send failed (this is normal if background script is busy):', error.message);
    });
    
    console.log('✅ Transcription message sent');
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
  
  // Stop gain node (passthrough audio)
  if (gainNode) {
    try {
      gainNode.disconnect();
      gainNode = null;
      console.log('✅ Audio passthrough stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping audio passthrough:', error);
    }
  }
  
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

// Immediately signal readiness
console.log('✅ Offscreen script ready for dynamic real-time transcription with audio passthrough');
