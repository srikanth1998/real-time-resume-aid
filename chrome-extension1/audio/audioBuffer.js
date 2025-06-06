
import { AUDIO_CONSTANTS, calculateRMS } from './audioUtils.js';

export class AudioBuffer {
  constructor() {
    this.reset();
  }

  reset() {
    this.audioBuffer = [];
    this.bufferSize = 0;
    this.lastSentTime = 0;
    this.isProcessing = false;
  }

  addSamples(samples) {
    // Calculate audio level to filter out silent periods
    const rms = calculateRMS(samples);
    const audioLevel = rms * 100; // Convert to percentage-like value
    
    console.log('🎵 Audio worklet received data, length:', samples.length, 'level:', audioLevel.toFixed(2));
    
    // Lower threshold for better sensitivity and add to buffer regardless for meeting audio
    if (audioLevel > 0.005 || this.audioBuffer.length > 0) { // Much lower threshold
      // Add to buffer
      this.audioBuffer.push(samples);
      this.bufferSize += samples.length;
      
      console.log('Buffer size:', this.bufferSize, 'samples, level:', audioLevel.toFixed(2));
      return true;
    } else {
      console.log('Skipping very silent audio, level:', audioLevel.toFixed(2));
      return false;
    }
  }

  shouldSend() {
    const now = Date.now();
    const timeSinceLastSend = now - this.lastSentTime;
    
    // More aggressive sending for real-time processing
    const minTime = this.isProcessing ? AUDIO_CONSTANTS.MIN_SEND_INTERVAL : 1000; // Reduce wait time
    const minSize = this.isProcessing ? AUDIO_CONSTANTS.MIN_BUFFER_SIZE : 24000; // Smaller buffer for faster response
    
    return (this.bufferSize >= minSize && timeSinceLastSend >= minTime) || 
           this.bufferSize >= AUDIO_CONSTANTS.MAX_BUFFER_SIZE;
  }

  getCombinedBuffer() {
    const combinedBuffer = new Float32Array(this.bufferSize);
    let offset = 0;
    for (const chunk of this.audioBuffer) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    return combinedBuffer;
  }

  markSent() {
    this.audioBuffer = [];
    this.bufferSize = 0;
    this.lastSentTime = Date.now();
    this.isProcessing = true; // Mark that we're actively processing
  }

  hasData() {
    return this.audioBuffer.length > 0 && this.bufferSize > 12000; // Lower threshold
  }

  setProcessingMode(isProcessing) {
    this.isProcessing = isProcessing;
    console.log('Audio buffer processing mode:', isProcessing);
  }
}
