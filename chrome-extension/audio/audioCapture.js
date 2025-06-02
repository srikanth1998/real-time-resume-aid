
/* global chrome */
import { AUDIO_CONSTANTS } from './audioUtils.js';
import { AudioBuffer } from './audioBuffer.js';

export class AudioCapture {
  constructor() {
    this.audioCtx = null;
    this.source = null;
    this.worklet = null;
    this.isStarting = false;
    this.isStopping = false;
    this.audioBufferManager = new AudioBuffer();
    this.isActivelyCapturing = false;
    console.log('AudioCapture instance created');
  }

  async start(streamId) {
    console.log('=== AUDIO CAPTURE START ===');
    console.log('Stream ID:', streamId);
    
    // Prevent multiple simultaneous start attempts
    if (this.isStarting) {
      console.warn('Start already in progress, ignoring duplicate call');
      return;
    }
    
    // Make sure any previous session is properly stopped
    if (this.audioCtx || this.source || this.worklet) {
      console.log('Cleaning up previous audio session...');
      await this.stop(false);
      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isStarting = true;
    
    try {
      console.log('Requesting user media with stream ID:', streamId);
      // grab tab-audio via getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          mandatory: { 
            chromeMediaSource: 'tab', 
            chromeMediaSourceId: streamId 
          } 
        },
        video: false
      });
      console.log('✅ Got media stream:', stream);

      // Create fresh AudioContext
      console.log('Creating AudioContext...');
      this.audioCtx = new AudioContext({ sampleRate: AUDIO_CONSTANTS.SAMPLE_RATE });
      console.log('AudioContext created, state:', this.audioCtx.state);
      
      console.log('Loading audio worklet module...');
      await this.audioCtx.audioWorklet.addModule(chrome.runtime.getURL('pcm-worklet.js'));
      console.log('✅ Audio worklet module loaded');

      console.log('Creating AudioWorkletNode...');
      this.worklet = new AudioWorkletNode(this.audioCtx, 'pcm-worklet');
      console.log('✅ AudioWorkletNode created');
      
      // Reset buffer and set to active processing mode
      this.audioBufferManager.reset();
      this.audioBufferManager.setProcessingMode(true);
      this.isActivelyCapturing = true;
      
      // Setup audio processing
      this.setupAudioProcessing();

      console.log('Creating media stream source...');
      this.source = this.audioCtx.createMediaStreamSource(stream);
      console.log('✅ Media stream source created');
      
      console.log('Connecting source to worklet...');
      this.source.connect(this.worklet);
      console.log('✅ Audio pipeline connected - REAL-TIME CAPTURE ACTIVE');

    } catch (error) {
      console.error('=== ERROR IN AUDIO CAPTURE START ===', error);
      await this.stop(true);
      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  setupAudioProcessing() {
    console.log('Setting up REAL-TIME audio processing...');
    
    // Accumulate audio data with aggressive real-time processing
    this.worklet.port.onmessage = ({ data }) => {
      if (!this.isActivelyCapturing) {
        console.log('Not actively capturing, skipping audio data');
        return;
      }

      const samples = new Float32Array(data);
      
      if (this.audioBufferManager.addSamples(samples)) {
        const now = Date.now();
        const timeSinceLastSend = now - this.audioBufferManager.lastSentTime;
        
        // More aggressive sending for real-time experience
        if (this.audioBufferManager.shouldSend()) {
          console.log('🚀 REAL-TIME: Sending audio, samples:', this.audioBufferManager.bufferSize, 'time since last:', timeSinceLastSend);
          
          const combinedBuffer = this.audioBufferManager.getCombinedBuffer();
          
          try {
            // Send combined audio data to background script immediately
            chrome.runtime.sendMessage({
              type: 'audio-data',
              audioData: Array.from(combinedBuffer),
              timestamp: now
            }).then(() => {
              console.log('✅ REAL-TIME audio data sent to background script');
            }).catch(err => {
              console.warn('❌ Error sending real-time audio to background script:', err);
            });
          } catch (err) {
            console.warn('❌ Error processing real-time audio data:', err);
          }
          
          // Reset buffer and continue processing
          this.audioBufferManager.markSent();
        }
      }
    };
    
    console.log('REAL-TIME audio processing setup complete');
  }

  async stop(report = false) {
    console.log('=== AUDIO CAPTURE STOP ===');
    
    // Prevent multiple simultaneous stop attempts
    if (this.isStopping) {
      console.warn('Stop already in progress, ignoring duplicate call');
      return;
    }
    
    this.isStopping = true;
    this.isActivelyCapturing = false;
    
    try {
      // Send any remaining buffered audio before stopping
      if (this.audioBufferManager.hasData()) {
        console.log('Sending final buffered audio before stopping, samples:', this.audioBufferManager.bufferSize);
        const combinedBuffer = this.audioBufferManager.getCombinedBuffer();
        
        try {
          chrome.runtime.sendMessage({
            type: 'audio-data',
            audioData: Array.from(combinedBuffer),
            final: true
          });
        } catch (err) {
          console.warn('Error sending final buffered audio:', err);
        }
      }
      
      // Reset buffer and disable processing mode
      this.audioBufferManager.reset();
      this.audioBufferManager.setProcessingMode(false);
      
      // Disconnect and clean up audio components
      if (this.source) {
        try { 
          console.log('Disconnecting source...');
          this.source.disconnect(); 
          this.source = null;
          console.log('✅ Source disconnected');
        } catch (err) { 
          console.warn('Error disconnecting source:', err); 
        }
      }
      
      if (this.worklet) {
        try { 
          console.log('Closing worklet port...');
          this.worklet.port.close();
          this.worklet = null;
          console.log('✅ Worklet port closed');
        } catch (err) { 
          console.warn('Error closing worklet port:', err); 
        }
      }
      
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        try { 
          console.log('Closing AudioContext...');
          await this.audioCtx.close();
          console.log('✅ AudioContext closed');
        } catch (err) { 
          console.warn('Error closing AudioContext:', err); 
        }
      }
      this.audioCtx = null;
      
      console.log('=== AUDIO CAPTURE CLEANUP COMPLETE ===');
      
      // Report back to background script if requested
      if (report) {
        try {
          console.log('Sending offscreen-stopped message to background...');
          chrome.runtime.sendMessage({ type: 'offscreen-stopped' });
        } catch (err) {
          console.warn('Error sending offscreen-stopped message:', err);
        }
      }
    } finally {
      this.isStopping = false;
    }
  }
}
