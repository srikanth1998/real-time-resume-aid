
// Content script for meeting pages
console.log('InterviewAce content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureStarted') {
    showCaptureIndicator();
    sendResponse({ success: true });
  }
});

function showCaptureIndicator() {
  // Create a visual indicator that capture is active
  const indicator = document.createElement('div');
  indicator.id = 'interviewace-indicator';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #065f46;
      color: #34d399;
      padding: 8px 12px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      border: 1px solid #34d399;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    ">
      🎤 InterviewAce is capturing audio
    </div>
  `;
  
  document.body.appendChild(indicator);
  
  // Remove after 3 seconds
  setTimeout(() => {
    const element = document.getElementById('interviewace-indicator');
    if (element) {
      element.remove();
    }
  }, 3000);
}

// Detect when user joins/leaves meeting
let isInMeeting = false;

function detectMeetingState() {
  const url = window.location.href;
  
  // Google Meet detection
  if (url.includes('meet.google.com')) {
    const joinButton = document.querySelector('[data-call-status="not-in-call"]');
    const leaveButton = document.querySelector('[data-call-status="in-call"]');
    
    if (leaveButton && !isInMeeting) {
      isInMeeting = true;
      console.log('Joined Google Meet');
    } else if (joinButton && isInMeeting) {
      isInMeeting = false;
      console.log('Left Google Meet');
    }
  }
  
  // Zoom detection
  if (url.includes('zoom.us')) {
    const meetingContainer = document.querySelector('#meeting-app');
    if (meetingContainer && !isInMeeting) {
      isInMeeting = true;
      console.log('Joined Zoom meeting');
    }
  }
}

// Check meeting state every 2 seconds
setInterval(detectMeetingState, 2000);
