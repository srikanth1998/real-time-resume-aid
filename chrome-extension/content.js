
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
  banner.textContent = '🔴 InterviewAce is capturing audio…';
  banner.hidden = true;
  document.documentElement.appendChild(banner);
  return banner;
}

function updateBannerStatus(status) {
  const b = ensureBanner();
  extensionStatus = status;
  
  switch (status) {
    case 'capturing':
      b.style.background = '#34a853';
      b.textContent = '🔴 InterviewAce - Real-time audio capture active';
      break;
    case 'processing':
      b.style.background = '#1976d2';
      b.textContent = '🎵 InterviewAce - Processing audio...';
      break;
    case 'stopped':
      b.style.background = '#757575';
      b.textContent = '⏹️ InterviewAce - Capture stopped';
      break;
  }
}

chrome.runtime.onMessage.addListener(({ action, audioData, timestamp, realTime, buffered }) => {
  console.log('=== CONTENT SCRIPT RECEIVED MESSAGE ===', { 
    action, 
    audioDataLength: audioData?.length,
    timestamp,
    realTime,
    buffered,
    timeSinceCapture: timestamp ? Date.now() - timestamp : 'N/A'
  });
  
  const b = ensureBanner();
  
  if (action === 'captureStarted') {
    console.log('Showing REAL-TIME capture banner');
    updateBannerStatus('capturing');
    b.hidden = false;
  }
  
  if (action === 'captureStopped') {
    console.log('Hiding capture banner');
    updateBannerStatus('stopped');
    setTimeout(() => {
      b.hidden = true;
    }, 2000); // Hide after 2 seconds
  }
  
  // Forward audio data to the web application with real-time priority
  if (action === 'audioData' && audioData && audioData.length > 0) {
    const processingDelay = timestamp ? Date.now() - timestamp : 0;
    
    console.log('=== FORWARDING REAL-TIME AUDIO TO WEB APP ===');
    console.log('Audio data length:', audioData.length);
    console.log('Processing delay:', processingDelay, 'ms');
    console.log('Real-time flag:', realTime);
    console.log('Buffered flag:', buffered);
    
    // Show processing status briefly
    if (!buffered) {
      updateBannerStatus('processing');
      setTimeout(() => {
        if (extensionStatus === 'processing') {
          updateBannerStatus('capturing');
        }
      }, 500);
    }
    
    // Send to any open InterviewAce tabs with real-time metadata
    window.postMessage({
      action: 'processAudio',
      audioData: audioData,
      source: 'interviewace-extension',
      timestamp: timestamp || Date.now(),
      realTime: realTime || false,
      buffered: buffered || false,
      processingDelay: processingDelay
    }, '*');
    console.log('✅ REAL-TIME audio data posted to window');
  }
});

// Listen for messages from the web application
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.action === 'interviewAppReady') {
    console.log('=== INTERVIEW APP READY MESSAGE RECEIVED ===');
    console.log('Notifying that extension is ready for REAL-TIME processing...');
    // Notify that the app is ready
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension',
      capabilities: ['realTimeAudio', 'meetingCapture'],
      timestamp: Date.now()
    }, '*');
    console.log('✅ Extension ready message posted with real-time capabilities');
  }
  
  if (event.data.action === 'testConnection') {
    console.log('=== TEST CONNECTION MESSAGE RECEIVED ===');
    window.postMessage({
      action: 'extensionReady',
      source: 'interviewace-extension',
      capabilities: ['realTimeAudio', 'meetingCapture'],
      timestamp: Date.now()
    }, '*');
    console.log('✅ Test connection response sent with capabilities');
  }
});

// Notify web app that extension is loaded with real-time capabilities
console.log('=== INTERVIEWACE EXTENSION CONTENT SCRIPT LOADED (REAL-TIME) ===');
console.log('Page URL:', window.location.href);
window.postMessage({
  action: 'extensionReady',
  source: 'interviewace-extension',
  capabilities: ['realTimeAudio', 'meetingCapture'],
  timestamp: Date.now()
}, '*');
console.log('✅ Initial extension ready message posted with real-time capabilities');
