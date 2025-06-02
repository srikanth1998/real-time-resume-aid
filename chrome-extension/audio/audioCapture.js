
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
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    this.isStarting = true;
    
    try {
      console.log('Requesting user media with stream ID:', streamId);
      // grab tab-audio via getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
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
      
      // Reset buffer when starting
      this.audioBufferManager.reset();
      
      // Setup audio processing
      this.setupAudioProcessing();

      console.log('Creating media stream source...');
      this.source = this.audioCtx.createMediaStreamSource(stream);
      console.log('✅ Media stream source created');
      
      console.log('Connecting source to worklet...');
      this.source.connect(this.worklet);
      console.log('✅ Audio pipeline connected');

      console.log('=== AUDIO CAPTURE PIPELINE SETUP COMPLETE ===');
      
    } catch (error) {
      console.error('=== ERROR IN AUDIO CAPTURE START ===', error);
      await this.stop(true);
      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  setupAudioProcessing() {
    // Accumulate audio data with better filtering
    this.worklet.port.onmessage = ({ data }) => {
      const samples = new Float32Array(data);
      
      if (this.audioBufferManager.addSamples(samples)) {
        const now = Date.now();
        const timeSinceLastSend = now - this.audioBufferManager.lastSentTime;
        
        // Send when buffer is large enough AND enough time has passed, or buffer is at max
        if (this.audioBufferManager.shouldSend()) {
          console.log('Sending buffered audio, total samples:', this.audioBufferManager.bufferSize, 'time since last:', timeSinceLastSend);
          
          const combinedBuffer = this.audioBufferManager.getCombinedBuffer();
          
          try {
            // Send combined audio data to background script
            chrome.runtime.sendMessage({
              type: 'audio-data',
              audioData: Array.from(combinedBuffer)
            }).then(() => {
              console.log('✅ Buffered audio data sent to background script');
            }).catch(err => {
              console.warn('❌ Error sending buffered audio to background script:', err);
            });
          } catch (err) {
            console.warn('❌ Error processing buffered audio data:', err);
          }
          
          // Reset buffer and update last sent time
          this.audioBufferManager.markSent();
        }
      }
    };
  }

  async stop(report = false) {
    console.log('=== AUDIO CAPTURE STOP ===');
    
    // Prevent multiple simultaneous stop attempts
    if (this.isStopping) {
      console.warn('Stop already in progress, ignoring duplicate call');
      return;
    }
    
    this.isStopping = true;
    
    try {
      // Send any remaining buffered audio before stopping (only if significant audio)
      if (this.audioBufferManager.hasData()) {
        console.log('Sending final buffered audio before stopping, samples:', this.audioBufferManager.bufferSize);
        const combinedBuffer = this.audioBufferManager.getCombinedBuffer();
        
        try {
          chrome.runtime.sendMessage({
            type: 'audio-data',
            audioData: Array.from(combinedBuffer)
          });
        } catch (err) {
          console.warn('Error sending final buffered audio:', err);
        }
      }
      
      // Reset buffer
      this.audioBufferManager.reset();
      
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
