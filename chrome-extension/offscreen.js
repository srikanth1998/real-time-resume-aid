
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
        collectAudioData(event.data.data);
      }
    };
    
    // Connect audio pipeline
    source.connect(workletNode);
    
    // Also setup MediaRecorder for backup
    setupMediaRecorder();
    
    isRecording = true;
    console.log('🎬 Real-time audio processing started');
    
  } catch (error) {
    console.error('💥 Error in startAudioCapture:', error);
    throw error;
  }
}

function collectAudioData(audioData) {
  // Collect audio data in buffer
  audioBuffer.push(...audioData);
  
  // Process every 3 seconds of audio (16000 samples/sec * 3 = 48000 samples)
  if (audioBuffer.length >= 48000 && !isProcessingAudio) {
    processCollectedAudio();
  }
}

async function processCollectedAudio() {
  if (isProcessingAudio || audioBuffer.length === 0) return;
  
  isProcessingAudio = true;
  console.log('🎙️ Processing audio buffer with', audioBuffer.length, 'samples');
  
  try {
    // Convert float32 audio data to WAV format
    const audioBlob = createWAVBlob(audioBuffer);
    
    // Convert to base64 for transmission
    const base64Audio = await blobToBase64(audioBlob);
    
    // Send to speech-to-text service
    const transcription = await sendToSTTService(base64Audio);
    
    if (transcription && transcription.trim()) {
      sendTranscription(transcription);
    }
    
    // Clear processed audio buffer
    audioBuffer = [];
    
  } catch (error) {
    console.error('❌ Error processing audio:', error);
  } finally {
    isProcessingAudio = false;
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
    
    // Get the current tab's origin to determine the correct Supabase URL
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
      source: 'whisper-api'
    });
  } catch (error) {
    console.error('💥 Error sending transcription:', error);
  }
}

async function stopAudioCapture() {
  console.log('🛑 Stopping audio capture...');
  
  isRecording = false;
  isProcessingAudio = false;
  
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
  audioBuffer = [];
  
  console.log('✅ Audio capture stopped completely');
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  console.log('🔄 Offscreen unloading, cleaning up...');
  stopAudioCapture();
});

console.log('✅ Offscreen script ready for real audio transcription');
