
// Function to calculate RMS (Root Mean Square) for audio level detection
export function calculateRMS(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

// Audio processing constants - optimized for real-time
export const AUDIO_CONSTANTS = {
  MAX_BUFFER_SIZE: 48000 * 3, // Reduced to 3 seconds
  MIN_BUFFER_SIZE: 48000 * 0.5, // Reduced to 0.5 seconds for faster response
  MIN_SEND_INTERVAL: 1000, // Reduced to 1 second for real-time feel
  AUDIO_THRESHOLD: 0.005, // Much lower threshold for meeting audio
  SAMPLE_RATE: 48000
};
