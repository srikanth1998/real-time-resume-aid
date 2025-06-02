
class AudioWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];
      
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.bufferIndex] = channelData[i];
        this.bufferIndex++;
        
        if (this.bufferIndex >= this.bufferSize) {
          // Send buffer to main thread
          this.port.postMessage({
            type: 'audioData',
            data: Array.from(this.buffer)
          });
          
          this.bufferIndex = 0;
        }
      }
    }
    
    return true;
  }
}

registerProcessor('audio-worklet', AudioWorkletProcessor);
