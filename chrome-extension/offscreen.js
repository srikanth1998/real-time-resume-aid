
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

// Enhanced phrase capture variables for better speech detection
let continuousAudioBuffer = [];
let lastAudioActivity = 0;
let silenceThreshold = 0.002; // Lower threshold for better sensitivity
let silenceGapMs = 1200; // 1.2 seconds gap before ending phrase
let isCapturingPhrase = false;
let captureStartTime = 0;
let minCaptureLength = 8000; // Minimum 0.5s at 16kHz
let maxCaptureLength = 80000; // Maximum 5s at 16kHz
let phraseBuffer = []; // Buffer to accumulate complete phrases
let lastPhraseEndTime = 0;
let minTimeBetweenPhrases = 500; // Minimum 500ms between phrase submissions

console.log('🔵 Offscreen document loaded with enhanced phrase detection...');

// Setup message handlers immediately
setupMessageHandlers();

function setupMessageHandlers() {
  console.log('🔧 Setting up enhanced message handlers in offscreen...');
  
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
      console.log('🎬 Starting enhanced transcription with stream ID:', message.streamId);
      startEnhancedAudioCapture(message.streamId)
        .then(() => {
          console.log('✅ Enhanced audio capture started successfully');
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('❌ Failed to start enhanced audio capture:', error);
          sendResponse({ 
            success: false, 
            error: error.message,
            errorType: error.name
          });
        });
      return true;
    }
    
    if (message.type === 'stop-transcription') {
      console.log('🛑 Stopping enhanced transcription');
      stopEnhancedAudioCapture()
        .then(() => {
          console.log('✅ Enhanced audio capture stopped');
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('❌ Error stopping enhanced audio capture:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
    
    console.warn('❓ Unknown message type:', message.type);
    sendResponse({ success: false, error: 'Unknown message type' });
    return true;
  });

  console.log('✅ Enhanced message handlers set up successfully');
  
  // Send ready signal to background script
  console.log('📡 Sending ready signal to background...');
  chrome.runtime.sendMessage({ type: 'offscreen-ready' }).catch((error) => {
    console.warn('Could not send ready signal:', error.message);
  });
}

async function startEnhancedAudioCapture(streamId) {
  console.log('🚀 Starting enhanced audio capture with stream ID:', streamId);
  
  if (isRecording) {
    console.log('Already recording, stopping first...');
    await stopEnhancedAudioCapture();
  }
  
  try {
    console.log('📡 Getting user media with enhanced constraints...');
    
    // Enhanced audio constraints for better speech detection
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
    
    // Create enhanced audio context
    console.log('🎧 Creating enhanced AudioContext...');
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000, // 16kHz for better processing
      latencyHint: 'interactive'
    });
    
    // Create source from stream
    const source = audioContext.createMediaStreamSource(mediaStream);
    
    // Create gain node for volume control and passthrough
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0;
    
    // Connect to audio output for passthrough
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    console.log('🔊 Enhanced audio passthrough enabled');
    
    // Load the audio worklet for processing
    const workletUrl = chrome.runtime.getURL('audio-processor-worklet.js');
    console.log('Loading enhanced worklet from:', workletUrl);
    
    try {
      await audioContext.audioWorklet.addModule(workletUrl);
      console.log('✅ Enhanced worklet module loaded');
    } catch (workletError) {
      console.error('❌ Failed to load worklet module:', workletError);
      throw new Error(`Failed to load audio worklet: ${workletError.message}`);
    }
    
    workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
    
    // Enhanced audio processing with phrase detection
    workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audioData') {
        processEnhancedAudioData(event.data.data);
      }
    };
    
    // Connect audio pipeline for transcription
    source.connect(workletNode);
    
    // Reset enhanced capture variables
    continuousAudioBuffer = [];
    phraseBuffer = [];
    lastAudioActivity = 0;
    isCapturingPhrase = false;
    captureStartTime = 0;
    lastPhraseEndTime = 0;
    
    isRecording = true;
    console.log('🚀 Enhanced audio capture with phrase detection started successfully');
    
  } catch (error) {
    console.error('💥 Error in enhanced startAudioCapture:', error);
    
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
    
    throw new Error(`Error starting enhanced tab capture: ${error.message}`);
  }
}

function processEnhancedAudioData(audioData) {
  const now = Date.now();
  const amplitude = calculateAmplitude(audioData);
  
  // Less frequent amplitude logging for cleaner console
  if (now - lastAudioActivity > 500) {
    console.log('🎵 Audio amplitude:', amplitude.toFixed(4), 'threshold:', silenceThreshold);
  }
  
  // Enhanced speech detection
  const isSpeech = amplitude > silenceThreshold;
  
  if (isSpeech) {
    // Speech detected
    if (!isCapturingPhrase) {
      // Start new phrase capture
      console.log('🎤 Starting enhanced phrase capture (amplitude:', amplitude.toFixed(4), ')');
      isCapturingPhrase = true;
      captureStartTime = now;
      continuousAudioBuffer = [];
    }
    
    // Add audio data to continuous buffer
    continuousAudioBuffer.push(...audioData);
    lastAudioActivity = now;
    
    // Log buffer progress less frequently
    if (continuousAudioBuffer.length % 16000 === 0) {
      const durationSeconds = continuousAudioBuffer.length / 16000;
      console.log('📝 Phrase buffer:', durationSeconds.toFixed(1), 'seconds');
    }
    
    // Check for maximum capture length to prevent memory issues
    if (continuousAudioBuffer.length >= maxCaptureLength) {
      console.log('📏 Maximum phrase length reached, ending phrase');
      endEnhancedPhraseCapture();
    }
    
  } else {
    // Silence detected
    if (isCapturingPhrase) {
      const silenceDuration = now - lastAudioActivity;
      
      // Enhanced silence detection with configurable gap
      if (silenceDuration >= silenceGapMs) {
        console.log('✅ Silence gap reached (' + silenceDuration + 'ms), ending phrase capture');
        endEnhancedPhraseCapture();
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

async function endEnhancedPhraseCapture() {
  if (!isCapturingPhrase || continuousAudioBuffer.length === 0) {
    return;
  }
  
  const now = Date.now();
  console.log('🎯 Ending enhanced phrase capture, samples:', continuousAudioBuffer.length);
  
  isCapturingPhrase = false;
  const capturedAudio = [...continuousAudioBuffer];
  continuousAudioBuffer = [];
  
  // Enhanced minimum length and timing checks
  if (capturedAudio.length < minCaptureLength) {
    console.log('⚠️ Audio too short for transcription. Samples:', capturedAudio.length, 'min:', minCaptureLength);
    return;
  }
  
  // Prevent too frequent phrase submissions
  const timeSinceLastPhrase = now - lastPhraseEndTime;
  if (timeSinceLastPhrase < minTimeBetweenPhrases) {
    console.log('⚠️ Too soon since last phrase (' + timeSinceLastPhrase + 'ms), skipping');
    return;
  }
  
  const captureDuration = (now - captureStartTime) / 1000;
  console.log('📊 Enhanced phrase duration:', captureDuration.toFixed(2), 'seconds');
  
  lastPhraseEndTime = now;
  
  try {
    // Enhanced audio processing
    console.log('🔄 Converting to enhanced WAV format...');
    const audioBlob = createEnhancedWAVBlob(capturedAudio);
    console.log('📦 Created enhanced WAV blob, size:', audioBlob.size, 'bytes');
    
    const base64Audio = await blobToBase64(audioBlob);
    console.log('🚀 Sending complete phrase to transcription service...');
    
    const transcription = await sendToEnhancedSTTService(base64Audio);
    
    if (transcription && transcription.trim()) {
      console.log('✅ Enhanced transcription received:', transcription);
      sendEnhancedTranscription(transcription);
    } else {
      console.log('⚠️ Empty transcription received for phrase');
    }
    
  } catch (error) {
    console.error('❌ Error processing enhanced phrase:', error);
  }
}

function createEnhancedWAVBlob(audioData) {
  console.log('🎧 Creating enhanced WAV blob from', audioData.length, 'samples');
  const sampleRate = 16000; // 16kHz sample rate
  const numChannels = 1;
  const bytesPerSample = 2;
  
  // Enhanced float32 to int16 conversion
  const int16Data = new Int16Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    int16Data[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
  }
  
  // Create enhanced WAV header
  const buffer = new ArrayBuffer(44 + int16Data.length * bytesPerSample);
  const view = new DataView(buffer);
  
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  // Enhanced WAV header creation
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
  
  console.log('✅ Enhanced WAV blob created successfully');
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

async function sendToEnhancedSTTService(base64Audio) {
  try {
    console.log('🚀 Sending complete phrase to enhanced STT service...');
    
    const requestBody = { audio: base64Audio };
    
    // Enhanced request with proper timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for longer phrases
    
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
    console.log('✅ Enhanced STT service response:', result);
    
    return result.text;
    
  } catch (error) {
    console.error('❌ Error calling enhanced STT service:', error);
    return null;
  }
}

function sendEnhancedTranscription(text) {
  if (!text || !text.trim()) {
    return;
  }
  
  console.log('📤 Sending complete phrase transcription to background:', text);
  
  try {
    const message = {
      type: 'transcription-result',
      text: text.trim(),
      timestamp: Date.now(),
      source: 'whisper-api-enhanced',
      phraseComplete: true // Flag to indicate this is a complete phrase
    };
    
    // Enhanced message sending
    chrome.runtime.sendMessage(message).catch((error) => {
      console.warn('⚠️ Message send failed:', error.message);
    });
    
    console.log('✅ Complete phrase transcription message sent');
  } catch (error) {
    console.error('💥 Error sending enhanced transcription:', error);
  }
}

async function stopEnhancedAudioCapture() {
  console.log('🛑 Stopping enhanced audio capture...');
  
  // Send any remaining captured audio before stopping
  if (isCapturingPhrase && continuousAudioBuffer.length > 0) {
    console.log('📤 Sending final enhanced phrase before stopping...');
    await endEnhancedPhraseCapture();
  }
  
  isRecording = false;
  isProcessingAudio = false;
  isCapturingPhrase = false;
  
  // Stop gain node (passthrough audio)
  if (gainNode) {
    try {
      gainNode.disconnect();
      gainNode = null;
      console.log('✅ Enhanced audio passthrough stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping audio passthrough:', error);
    }
  }
  
  // Stop worklet
  if (workletNode) {
    try {
      workletNode.disconnect();
      workletNode = null;
      console.log('✅ Enhanced audio worklet stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping audio worklet:', error);
    }
  }
  
  // Stop media stream
  if (mediaStream) {
    try {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
      console.log('✅ Enhanced media stream stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping media stream:', error);
    }
  }
  
  // Close audio context
  if (audioContext && audioContext.state !== 'closed') {
    try {
      await audioContext.close();
      audioContext = null;
      console.log('✅ Enhanced audio context closed');
    } catch (error) {
      console.warn('⚠️ Error closing audio context:', error);
    }
  }
  
  // Reset all variables
  audioChunks = [];
  audioBuffer = [];
  continuousAudioBuffer = [];
  phraseBuffer = [];
  lastAudioActivity = 0;
  lastPhraseEndTime = 0;
  
  console.log('✅ Enhanced audio capture stopped completely');
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  console.log('🔄 Offscreen unloading, cleaning up enhanced resources...');
  stopEnhancedAudioCapture();
});

console.log('✅ Enhanced offscreen script ready for complete phrase transcription');
