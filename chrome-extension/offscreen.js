
/* global chrome */

let audioContext = null;
let source = null;
let worklet = null;
let isProcessing = false;
let transcriptionService = null;

// Import and initialize transcription service
async function initializeTranscription() {
  if (transcriptionService) return;
  
  console.log('Initializing transcription service in offscreen...');
  
  try {
    // Import transformers.js - this works in offscreen documents
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0');
    
    // Configure for browser usage
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    
    // Initialize the ASR pipeline
    const asr = await pipeline(
      'automatic-speech-recognition',
      'onnx-community/whisper-tiny.en',
      { device: 'webgpu' }
    );
    
    transcriptionService = {
      pipeline: asr,
      audioBuffer: [],
      sampleRate: 16000,
      maxBufferSize: 16000 * 3, // 3 seconds
      
      addAudioData(audioData) {
        this.audioBuffer.push(...audioData);
        if (this.audioBuffer.length > this.maxBufferSize) {
          this.audioBuffer = this.audioBuffer.slice(-this.maxBufferSize);
        }
      },
      
      async transcribeBuffer() {
        if (this.audioBuffer.length === 0) return null;
        
        try {
          const audioArray = new Float32Array(this.audioBuffer);
          const result = await this.pipeline(audioArray, {
            sampling_rate: this.sampleRate,
            return_timestamps: true
          });
          
          this.audioBuffer = [];
          return result.text;
        } catch (error) {
          console.error('Transcription error:', error);
          return null;
        }
      }
    };
    
    console.log('✅ Transcription service initialized in offscreen');
  } catch (error) {
    console.error('❌ Failed to initialize transcription service:', error);
    throw error;
  }
}

// Handle messages from background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Offscreen received message:', message);
  
  if (message.type === 'start-transcription') {
    await startAudioProcessing(message.streamId);
    sendResponse({success: true});
  } else if (message.type === 'stop-transcription') {
    await stopAudioProcessing();
    sendResponse({success: true});
  }
  
  return true;
});

async function startAudioProcessing(streamId) {
  if (isProcessing) return;
  
  console.log('Starting audio processing with stream ID:', streamId);
  
  try {
    // Initialize transcription service first
    await initializeTranscription();
    
    // Get user media with the stream ID
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });
    
    // Create audio context
    audioContext = new AudioContext({
      sampleRate: 16000 // Whisper model sample rate
    });
    
    // Add audio worklet
    await audioContext.audioWorklet.addModule('audio-worklet.js');
    
    // Create worklet node
    worklet = new AudioWorkletNode(audioContext, 'audio-worklet');
    
    // Handle audio data from worklet
    worklet.port.onmessage = async (event) => {
      if (event.data.type === 'audioData' && transcriptionService) {
        // Add audio data to transcription service
        transcriptionService.addAudioData(event.data.data);
        
        // Try to transcribe when we have enough audio (2 seconds)
        if (transcriptionService.audioBuffer.length >= transcriptionService.sampleRate * 2) {
          const text = await transcriptionService.transcribeBuffer();
          if (text && text.trim()) {
            // Send transcription result to background
            chrome.runtime.sendMessage({
              type: 'transcription-result',
              text: text
            });
          }
        }
      }
    };
    
    // Create source and connect
    source = audioContext.createMediaStreamSource(stream);
    source.connect(worklet);
    
    isProcessing = true;
    console.log('✅ Audio processing started with transcription');
    
  } catch (error) {
    console.error('❌ Error starting audio processing:', error);
    await stopAudioProcessing();
  }
}

async function stopAudioProcessing() {
  console.log('Stopping audio processing...');
  
  isProcessing = false;
  
  if (source) {
    source.disconnect();
    source = null;
  }
  
  if (worklet) {
    worklet.port.close();
    worklet = null;
  }
  
  if (audioContext && audioContext.state !== 'closed') {
    await audioContext.close();
    audioContext = null;
  }
  
  console.log('✅ Audio processing stopped');
}

console.log('Offscreen document loaded for transcription');
