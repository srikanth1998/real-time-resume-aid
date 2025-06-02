class TranscriptionService {
  constructor() {
    this.pipeline = null;
    this.isInitialized = false;
    this.audioBuffer = [];
    this.sampleRate = 16000;
    this.bufferDuration = 3; // seconds
    this.maxBufferSize = this.sampleRate * this.bufferDuration;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('Initializing transcription service...');
    
    try {
      // Import transformers.js
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0');
      
      // Configure for browser usage
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      
      // Initialize the ASR pipeline
      this.pipeline = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny.en',
        { device: 'webgpu' }
      );
      
      this.isInitialized = true;
      console.log('✅ Transcription service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize transcription service:', error);
      throw error;
    }
  }

  addAudioData(audioData) {
    // Add new audio data to buffer
    this.audioBuffer.push(...audioData);
    
    // Keep buffer size manageable
    if (this.audioBuffer.length > this.maxBufferSize) {
      this.audioBuffer = this.audioBuffer.slice(-this.maxBufferSize);
    }
  }

  async transcribeBuffer() {
    if (!this.isInitialized || this.audioBuffer.length === 0) {
      return null;
    }

    try {
      // Convert buffer to Float32Array
      const audioArray = new Float32Array(this.audioBuffer);
      
      // Transcribe audio
      const result = await this.pipeline(audioArray, {
        sampling_rate: this.sampleRate,
        return_timestamps: true
      });
      
      console.log('Transcription result:', result);
      
      // Clear buffer after transcription
      this.audioBuffer = [];
      
      return result.text;
    } catch (error) {
      console.error('❌ Transcription error:', error);
      return null;
    }
  }

  async transcribeAudio(audioData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.addAudioData(audioData);
    
    // Transcribe when buffer is full enough
    if (this.audioBuffer.length >= this.sampleRate * 2) { // 2 seconds
      return await this.transcribeBuffer();
    }
    
    return null;
  }
}

export default TranscriptionService;
