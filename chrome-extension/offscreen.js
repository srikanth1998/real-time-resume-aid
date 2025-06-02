
/* global chrome */
import { AudioCapture } from './audio/audioCapture.js';

console.log('=== OFFSCREEN DOCUMENT LOADED ===');

// Global audio capture instance
let audioCapture = null;

// Initialize audio capture
function initializeAudioCapture() {
  if (!audioCapture) {
    audioCapture = new AudioCapture();
    console.log('AudioCapture instance created');
  }
  return audioCapture;
}

/* ---------- message bridge ---------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('=== OFFSCREEN RECEIVED MESSAGE ===', msg);
  
  // Initialize audio capture if needed
  const capture = initializeAudioCapture();
  
  if (msg.type === 'offscreen-start') {
    console.log('Received offscreen-start command with streamId:', msg.streamId);
    capture.start(msg.streamId)
      .then(() => {
        console.log('✅ Offscreen started successfully');
        sendResponse({ success: true });
      })
      .catch(err => {
        console.error('❌ Offscreen start error', err);
        capture.stop(true);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Indicates async response
  }
  
  if (msg.type === 'offscreen-stop') {
    console.log('Received offscreen-stop command');
    capture.stop()
      .then(() => {
        console.log('✅ Offscreen stopped successfully');
        sendResponse({ success: true });
      })
      .catch(err => {
        console.error('❌ Offscreen stop error', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Indicates async response
  }
  
  // Handle ping/pong for connection testing
  if (msg.type === 'ping') {
    console.log('Received ping from background');
    sendResponse({ success: true, message: 'pong' });
    return true;
  }
});

console.log('=== OFFSCREEN MESSAGE LISTENER READY ===');
