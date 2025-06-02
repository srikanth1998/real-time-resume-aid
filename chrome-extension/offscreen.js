
/* global chrome */
import { AudioCapture } from './audio/audioCapture.js';

// Global audio capture instance
let audioCapture = new AudioCapture();

/* ---------- message bridge ---------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('=== OFFSCREEN RECEIVED MESSAGE ===', msg);
  
  if (msg.type === 'offscreen-start') {
    console.log('Received offscreen-start command with streamId:', msg.streamId);
    audioCapture.start(msg.streamId).then(() => {
      console.log('✅ Offscreen started successfully');
      sendResponse({ success: true });
    }).catch(err => {
      console.error('❌ Offscreen start error', err);
      audioCapture.stop(true);
      sendResponse({ success: false, error: err.message });
    });
    return true; // Indicates async response
  }
  
  if (msg.type === 'offscreen-stop') {
    console.log('Received offscreen-stop command');
    audioCapture.stop().then(() => {
      console.log('✅ Offscreen stopped successfully');
      sendResponse({ success: true });
    }).catch(err => {
      console.error('❌ Offscreen stop error', err);
      sendResponse({ success: false, error: err.message });
    });
    return true; // Indicates async response
  }
});
