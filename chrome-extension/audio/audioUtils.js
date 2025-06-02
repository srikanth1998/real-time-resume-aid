
// Function to calculate RMS (Root Mean Square) for audio level detection
export function calculateRMS(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

// Audio processing constants
export const AUDIO_CONSTANTS = {
  MAX_BUFFER_SIZE: 48000 * 5, // 5 seconds at 48kHz
  MIN_BUFFER_SIZE: 48000 * 1.0, // 1 second minimum
  MIN_SEND_INTERVAL: 2000, // Minimum 2 seconds between sends
  AUDIO_THRESHOLD: 0.01, // Minimum audio level to process
  SAMPLE_RATE: 48000
};
