
// Content script for video meeting platforms
console.log('InterviewAce content script loaded on:', window.location.href);

// Inject a script to communicate with the interview app
const script = document.createElement('script');
script.textContent = `
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    if (message.action === 'processAudio') {
      // Forward to the page's window
      window.postMessage({
        action: 'processAudio',
        audioData: message.audioData,
        source: 'interviewace-extension'
      }, '*');
      
      sendResponse({ success: true });
    }
    
    return true;
  });
  
  // Notify that content script is ready
  window.postMessage({
    action: 'contentScriptReady',
    source: 'interviewace-extension'
  }, '*');
`;

document.documentElement.appendChild(script);
script.remove();

// Also add direct listener for background script messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script direct message:', message);
  
  if (message.action === 'processAudio') {
    // Try to forward to interview app if it's on this page
    window.postMessage({
      action: 'processAudio',
      audioData: message.audioData,
      source: 'interviewace-extension'
    }, '*');
    
    sendResponse({ success: true });
  }
  
  return true;
});
