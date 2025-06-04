
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

// Optimized dynamic audio capture variables
let continuousAudioBuffer = [];
let lastAudioActivity = 0;
let silenceThreshold = 0.003; // Reduced threshold for better sensitivity
let silenceGapMs = 750; // Reduced gap for faster processing
let isCapturingPhrase = false;
let captureStartTime = 0;
let minCaptureLength = 6000; // Reduced minimum length (0.375s at 16kHz)
let maxCaptureLength = 32000; // Reduced maximum length (2s at 16kHz)

console.log('🔵 Offscreen document loaded with optimized audio processing...');

// Setup message handlers immediately
setupMessageHandlers();

function setupMessageHandlers() {
  console.log('🔧 Setting up optimized message handlers in offscreen...');
  
  // Handle messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Offscreen received message:', message.type);
    
    // ALWAYS respond to ping messages immediately and synchronously
    if (message.type === 'ping') {
      console.log('🏓 Responding to ping with success');
      sendResponse({ success: true, message: 'pong' });
      return true;
    }
    
    if (message.type === 'start-transcription') {
      console.log('🎬 Starting optimized transcription with stream ID:', message.streamId);
      startOptimizedAudioCapture(message.streamId)
        .then(() => {
          console.log('✅ Optimized audio capture started successfully');
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('❌ Failed to start optimized audio capture:', error);
          sendResponse({ 
            success: false, 
            error: error.message,
            errorType: error.name
          });
        });
      return true;
    }
    
    if (message.type === 'stop-transcription') {
      console.log('🛑 Stopping optimized transcription');
      stopOptimizedAudioCapture()
        .then(() => {
          console.log('✅ Optimized audio capture stopped');
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('❌ Error stopping optimized audio capture:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
    
    console.warn('❓ Unknown message type:', message.type);
    sendResponse({ success: false, error: 'Unknown message type' });
    return true;
  });

  console.log('✅ Optimized message handlers set up successfully');
  
  // Send ready signal to background script
  console.log('📡 Sending ready signal to background...');
  chrome.runtime.sendMessage({ type: 'offscreen-ready' }).catch((error) => {
    console.warn('Could not send ready signal:', error.message);
  });
}

async function startOptimizedAudioCapture(streamId) {
  console.log('🚀 Starting optimized audio capture with stream ID:', streamId);
  
  if (isRecording) {
    console.log('Already recording, stopping first...');
    await stopOptimizedAudioCapture();
  }
  
  try {
    console.log('📡 Getting user media with optimized constraints...');
    
    // Optimized audio constraints for lower latency
    const constraints = {
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    };
    
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    
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
    
    // Create optimized audio context
    console.log('🎧 Creating optimized AudioContext...');
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000, // Optimized sample rate
      latencyHint: 'interactive' // Low latency hint
    });
    
    // Create source from stream
    const source = audioContext.createMediaStreamSource(mediaStream);
    
    // Create gain node for volume control and passthrough
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0;
    
    // Connect to audio output for passthrough
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    console.log('🔊 Optimized audio passthrough enabled');
    
    // Load the audio worklet for processing
    const workletUrl = chrome.runtime.getURL('audio-processor-worklet.js');
    console.log('Loading optimized worklet from:', workletUrl);
    
    try {
      await audioContext.audioWorklet.addModule(workletUrl);
      console.log('✅ Optimized worklet module loaded');
    } catch (workletError) {
      console.error('❌ Failed to load worklet module:', workletError);
      throw new Error(`Failed to load audio worklet: ${workletError.message}`);
    }
    
    workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
    
    // Optimized audio processing with reduced latency
    workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audioData') {
        processOptimizedAudioData(event.data.data);
      }
    };
    
    // Connect audio pipeline for transcription
    source.connect(workletNode);
    
    // Reset optimized capture variables
    continuousAudioBuffer = [];
    lastAudioActivity = 0;
    isCapturingPhrase = false;
    captureStartTime = 0;
    
    isRecording = true;
    console.log('🚀 Optimized audio capture and passthrough started successfully');
    
  } catch (error) {
    console.error('💥 Error in optimized startAudioCapture:', error);
    
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
    
    throw new Error(`Error starting optimized tab capture: ${error.message}`);
  }
}

function processOptimizedAudioData(audioData) {
  const now = Date.now();
  const amplitude = calculateAmplitude(audioData);
  
  // Optimized amplitude logging (less frequent)
  if (now - lastAudioActivity > 200) {
    console.log('🎵 Audio amplitude:', amplitude.toFixed(4));
  }
  
  // Optimized speech detection with lower threshold
  const isSpeech = amplitude > silenceThreshold;
  
  if (isSpeech) {
    // Speech detected
    if (!isCapturingPhrase) {
      // Start new phrase capture
      console.log('🎤 Starting optimized phrase capture');
      isCapturingPhrase = true;
      captureStartTime = now;
      continuousAudioBuffer = [];
    }
    
    // Add audio data to continuous buffer
    continuousAudioBuffer.push(...audioData);
    lastAudioActivity = now;
    
    // Optimized buffer size logging
    if (continuousAudioBuffer.length % 8000 === 0) {
      console.log('📝 Buffer size:', continuousAudioBuffer.length);
    }
    
    // Check for maximum capture length to prevent memory issues
    if (continuousAudioBuffer.length >= maxCaptureLength) {
      console.log('📏 Maximum capture length reached, ending phrase');
      endOptimizedPhraseCapture();
    }
    
  } else {
    // Silence detected
    if (isCapturingPhrase) {
      const silenceDuration = now - lastAudioActivity;
      
      // Optimized silence detection with shorter gap
      if (silenceDuration >= silenceGapMs) {
        console.log('✅ Optimized silence gap reached, ending phrase capture');
        endOptimizedPhraseCapture();
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

async function endOptimizedPhraseCapture() {
  if (!isCapturingPhrase || continuousAudioBuffer.length === 0) {
    return;
  }
  
  console.log('🎯 Ending optimized phrase capture, samples:', continuousAudioBuffer.length);
  
  isCapturingPhrase = false;
  const capturedAudio = [...continuousAudioBuffer];
  continuousAudioBuffer = [];
  
  // Optimized minimum length check
  if (capturedAudio.length < minCaptureLength) {
    console.log('⚠️ Audio too short for transcription. Samples:', capturedAudio.length);
    return;
  }
  
  const captureDuration = (Date.now() - captureStartTime) / 1000;
  console.log('📊 Optimized phrase duration:', captureDuration.toFixed(2), 'seconds');
  
  try {
    // Optimized audio processing
    console.log('🔄 Converting to optimized WAV format...');
    const audioBlob = createOptimizedWAVBlob(capturedAudio);
    console.log('📦 Created optimized WAV blob, size:', audioBlob.size, 'bytes');
    
    const base64Audio = await blobToBase64(audioBlob);
    console.log('🚀 Sending optimized phrase to transcription service...');
    
    const transcription = await sendToOptimizedSTTService(base64Audio);
    
    if (transcription && transcription.trim()) {
      console.log('✅ Optimized transcription received:', transcription);
      sendOptimizedTranscription(transcription);
    } else {
      console.log('⚠️ Empty transcription received');
    }
    
  } catch (error) {
    console.error('❌ Error processing optimized phrase:', error);
  }
}

function createOptimizedWAVBlob(audioData) {
  console.log('🎧 Creating optimized WAV blob from', audioData.length, 'samples');
  const sampleRate = 16000;
  const numChannels = 1;
  const bytesPerSample = 2;
  
  // Optimized float32 to int16 conversion
  const int16Data = new Int16Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    int16Data[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
  }
  
  // Create optimized WAV header
  const buffer = new ArrayBuffer(44 + int16Data.length * bytesPerSample);
  const view = new DataView(buffer);
  
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  // Optimized WAV header creation
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
  
  console.log('✅ Optimized WAV blob created successfully');
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

async function sendToOptimizedSTTService(base64Audio) {
  try {
    console.log('🚀 Sending to optimized STT service...');
    
    const requestBody = { audio: base64Audio };
    
    // Optimized request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const supabaseUrl = 'https://jafylkqbmvdptrqwwyed.supabase.co/functions/v1/speech-to-text';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY';
    
    const response = await fetch(supabaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`STT service error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Optimized STT service response:', result);
    
    return result.text;
    
  } catch (error) {
    console.error('❌ Error calling optimized STT service:', error);
    return null;
  }
}

function sendOptimizedTranscription(text) {
  if (!text || !text.trim()) {
    return;
  }
  
  console.log('📤 Sending optimized transcription to background:', text);
  
  try {
    const message = {
      type: 'transcription-result',
      text: text.trim(),
      timestamp: Date.now(),
      source: 'whisper-api-optimized'
    };
    
    // Optimized message sending without waiting
    chrome.runtime.sendMessage(message).catch((error) => {
      console.warn('⚠️ Message send failed:', error.message);
    });
    
    console.log('✅ Optimized transcription message sent');
  } catch (error) {
    console.error('💥 Error sending optimized transcription:', error);
  }
}

async function stopOptimizedAudioCapture() {
  console.log('🛑 Stopping optimized audio capture...');
  
  // Send any remaining captured audio before stopping
  if (isCapturingPhrase && continuousAudioBuffer.length > 0) {
    console.log('📤 Sending final optimized phrase before stopping...');
    await endOptimizedPhraseCapture();
  }
  
  isRecording = false;
  isProcessingAudio = false;
  isCapturingPhrase = false;
  
  // Stop gain node (passthrough audio)
  if (gainNode) {
    try {
      gainNode.disconnect();
      gainNode = null;
      console.log('✅ Optimized audio passthrough stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping audio passthrough:', error);
    }
  }
  
  // Stop worklet
  if (workletNode) {
    try {
      workletNode.disconnect();
      workletNode = null;
      console.log('✅ Optimized audio worklet stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping audio worklet:', error);
    }
  }
  
  // Stop media stream
  if (mediaStream) {
    try {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
      console.log('✅ Optimized media stream stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping media stream:', error);
    }
  }
  
  // Close audio context
  if (audioContext && audioContext.state !== 'closed') {
    try {
      await audioContext.close();
      audioContext = null;
      console.log('✅ Optimized audio context closed');
    } catch (error) {
      console.warn('⚠️ Error closing audio context:', error);
    }
  }
  
  // Reset all variables
  audioChunks = [];
  audioBuffer = [];
  continuousAudioBuffer = [];
  lastAudioActivity = 0;
  
  console.log('✅ Optimized audio capture stopped completely');
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  console.log('🔄 Offscreen unloading, cleaning up optimized resources...');
  stopOptimizedAudioCapture();
});

console.log('✅ Optimized offscreen script ready for high-speed real-time transcription');
