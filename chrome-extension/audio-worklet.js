
class AudioWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input && input.length > 0) {
      const channel = input[0];
      if (channel && channel.length > 0) {
        // Convert audio data to format suitable for processing
        const audioData = new Float32Array(channel);
        
        // Post audio data to main thread
        this.port.postMessage({
          type: 'audioData',
          data: audioData
        });
      }
    }
    
    return true;
  }
}

registerProcessor('audio-worklet', AudioWorklet);
