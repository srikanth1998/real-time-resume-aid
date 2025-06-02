
import { AUDIO_CONSTANTS, calculateRMS } from './audioUtils.js';

export class AudioBuffer {
  constructor() {
    this.reset();
  }

  reset() {
    this.audioBuffer = [];
    this.bufferSize = 0;
    this.lastSentTime = 0;
  }

  addSamples(samples) {
    // Calculate audio level to filter out silent periods
    const rms = calculateRMS(samples);
    const audioLevel = rms * 100; // Convert to percentage-like value
    
    console.log('🎵 Audio worklet received data, length:', samples.length, 'level:', audioLevel.toFixed(2));
    
    // Only process audio if there's actual sound
    if (audioLevel > AUDIO_CONSTANTS.AUDIO_THRESHOLD) {
      // Add to buffer
      this.audioBuffer.push(samples);
      this.bufferSize += samples.length;
      
      console.log('Buffer size:', this.bufferSize, 'samples, level:', audioLevel.toFixed(2));
      return true;
    } else {
      console.log('Skipping silent audio, level:', audioLevel.toFixed(2));
      return false;
    }
  }

  shouldSend() {
    const now = Date.now();
    const timeSinceLastSend = now - this.lastSentTime;
    
    return (this.bufferSize >= AUDIO_CONSTANTS.MIN_BUFFER_SIZE && timeSinceLastSend >= AUDIO_CONSTANTS.MIN_SEND_INTERVAL) || 
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
  }

  hasData() {
    return this.audioBuffer.length > 0 && this.bufferSize > AUDIO_CONSTANTS.MIN_BUFFER_SIZE / 2;
  }
}
