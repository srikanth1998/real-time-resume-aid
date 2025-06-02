
/* global chrome */
let banner;

function ensureBanner() {
  if (banner) return banner;
  banner = document.createElement('div');
  banner.style.cssText =
    'position:fixed;bottom:24px;right:24px;max-width:340px;padding:12px 16px;'
  + 'font:14px/1.4 sans-serif;color:#fff;background:#34a853;border-radius:12px;'
  + 'box-shadow:0 4px 12px rgba(0,0,0,.35);z-index:2147483647;';
  banner.textContent = '🔴 InterviewAce is capturing audio…';
  banner.hidden = true;
  document.documentElement.appendChild(banner);
  return banner;
}

chrome.runtime.onMessage.addListener(({ action, audioData }) => {
  console.log('=== CONTENT SCRIPT RECEIVED MESSAGE ===', { action, audioDataLength: audioData?.length });
  
  const b = ensureBanner();
  
  if (action === 'captureStarted') {
    console.log('Showing capture banner');
    b.hidden = false;
  }
  
  if (action === 'captureStopped') {
    console.log('Hiding capture banner');
    b.hidden = true;
  }
  
  // Forward audio data to the web application
  if (action === 'audioData' && audioData && audioData.length > 0) {
    console.log('=== FORWARDING AUDIO DATA TO WEB APP ===');
    console.log('Audio data length:', audioData.length);
    
    // Send to any open InterviewAce tabs
    window.postMessage({
      action: 'processAudio',
      audioData: audioData,
      source: 'interviewace-extension'
    }, '*');
    console.log('✅ Audio data posted to window');
  }
});

// Listen for messages from the web application
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.action === 'interviewAppReady') {
    console.log('=== INTERVIEW APP READY MESSAGE RECEIVED ===');
    console.log('Notifying that extension is ready...');
    // Notify that the app is ready
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension'
    }, '*');
    console.log('✅ Extension ready message posted');
  }
  
  if (event.data.action === 'testConnection') {
    console.log('=== TEST CONNECTION MESSAGE RECEIVED ===');
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension'
    }, '*');
    console.log('✅ Test connection response sent');
  }
});

// Notify web app that extension is loaded
console.log('=== INTERVIEWACE EXTENSION CONTENT SCRIPT LOADED ===');
console.log('Page URL:', window.location.href);
window.postMessage({
  action: 'extensionReady',
  source: 'interviewace-extension'
}, '*');
console.log('✅ Initial extension ready message posted');
