
/* global chrome */
let banner;
let extensionStatus = 'disconnected';

function ensureBanner() {
  if (banner) return banner;
  banner = document.createElement('div');
  banner.style.cssText =
    'position:fixed;bottom:24px;right:24px;max-width:340px;padding:12px 16px;'
  + 'font:14px/1.4 sans-serif;color:#fff;background:#34a853;border-radius:12px;'
  + 'box-shadow:0 4px 12px rgba(0,0,0,.35);z-index:2147483647;transition:all 0.3s ease;';
  banner.textContent = '🎤 InterviewAce - Ready for transcription';
  banner.hidden = true;
  document.documentElement.appendChild(banner);
  return banner;
}

function updateBannerStatus(status) {
  const b = ensureBanner();
  extensionStatus = status;
  
  switch (status) {
    case 'transcribing':
      b.style.background = '#34a853';
      b.textContent = '🎤 InterviewAce - Transcribing locally...';
      break;
    case 'processing':
      b.style.background = '#1976d2';
      b.textContent = '🧠 InterviewAce - Processing speech...';
      break;
    case 'stopped':
      b.style.background = '#757575';
      b.textContent = '⏹️ InterviewAce - Transcription stopped';
      break;
  }
}

chrome.runtime.onMessage.addListener(({ action, text, timestamp }) => {
  console.log('=== CONTENT SCRIPT RECEIVED MESSAGE ===', { action, text, timestamp });
  
  const b = ensureBanner();
  
  if (action === 'transcriptionStarted') {
    console.log('Showing transcription banner');
    updateBannerStatus('transcribing');
    b.hidden = false;
  }
  
  if (action === 'transcriptionStopped') {
    console.log('Hiding transcription banner');
    updateBannerStatus('stopped');
    setTimeout(() => {
      b.hidden = true;
    }, 2000);
  }
  
  // Forward transcription results to the web application
  if (action === 'transcriptionResult' && text && text.trim()) {
    console.log('=== FORWARDING TRANSCRIPTION TO WEB APP ===');
    console.log('Transcribed text:', text);
    console.log('Timestamp:', timestamp);
    
    // Show processing status briefly
    updateBannerStatus('processing');
    setTimeout(() => {
      if (extensionStatus === 'processing') {
        updateBannerStatus('transcribing');
      }
    }, 1000);
    
    // Send transcription to web application
    window.postMessage({
      action: 'processTranscription',
      text: text,
      source: 'interviewace-extension',
      timestamp: timestamp || Date.now(),
      type: 'real-time-transcription'
    }, '*');
    console.log('✅ Transcription data posted to window');
  }
});

// Listen for messages from the web application
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.action === 'interviewAppReady') {
    console.log('=== INTERVIEW APP READY MESSAGE RECEIVED ===');
    console.log('Notifying that extension is ready for transcription...');
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension',
      capabilities: ['localTranscription', 'privacyFocused'],
      timestamp: Date.now()
    }, '*');
    console.log('✅ Extension ready message posted with transcription capabilities');
  }
  
  if (event.data.action === 'testConnection') {
    console.log('=== TEST CONNECTION MESSAGE RECEIVED ===');
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension',
      capabilities: ['localTranscription', 'privacyFocused'],
      timestamp: Date.now()
    }, '*');
    console.log('✅ Test connection response sent with transcription capabilities');
  }
});

// Notify web app that extension is loaded with transcription capabilities
console.log('=== INTERVIEWACE TRANSCRIPTION EXTENSION LOADED ===');
console.log('Page URL:', window.location.href);
window.postMessage({
  action: 'extensionReady',
  source: 'interviewace-extension',
  capabilities: ['localTranscription', 'privacyFocused'],
  timestamp: Date.now()
}, '*');
console.log('✅ Initial extension ready message posted with transcription capabilities');
