
document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('startCapture');
  const stopBtn = document.getElementById('stopCapture');
  const findAppBtn = document.getElementById('findInterviewApp');
  const statusDiv = document.getElementById('status');
  
  // Get current status
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    updateUI(response.isCapturing);
  });
  
  startBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!isMeetingTab(tab.url)) {
        alert('Please switch to your video meeting tab first (Google Meet, Zoom, Teams, etc.)');
        return;
      }
      
      chrome.runtime.sendMessage(
        { action: 'startCapture', tabId: tab.id },
        (response) => {
          if (response.success) {
            updateUI(true);
            window.close();
          } else {
            alert('Failed to start capture: ' + response.error);
          }
        }
      );
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });
  
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopCapture' }, (response) => {
      if (response.success) {
        updateUI(false);
      }
    });
  });
  
  findAppBtn.addEventListener('click', async () => {
    try {
      const tabs = await chrome.tabs.query({});
      const interviewTab = tabs.find(tab => 
        tab.url && (
          tab.url.includes('lovable.app') || 
          tab.url.includes('localhost') ||
          tab.url.includes('/interview')
        )
      );
      
      if (interviewTab) {
        chrome.runtime.sendMessage(
          { action: 'setInterviewApp', tabId: interviewTab.id },
          (response) => {
            if (response.success) {
              alert('✅ Connected to Interview App!\n\nNow go to your meeting tab and start capturing.');
            }
          }
        );
      } else {
        alert('❌ Interview app not found!\n\nPlease open your InterviewAce app first.');
      }
    } catch (error) {
      alert('Error finding interview app: ' + error.message);
    }
  });
  
  function updateUI(isCapturing) {
    if (isCapturing) {
      statusDiv.textContent = '🔴 Capturing meeting audio...';
      statusDiv.className = 'status capturing';
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
    } else {
      statusDiv.textContent = 'Ready to capture';
      statusDiv.className = 'status idle';
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
    }
  }
  
  function isMeetingTab(url) {
    if (!url) return false;
    
    const meetingDomains = [
      'meet.google.com',
      'zoom.us',
      'teams.microsoft.com',
      'webex.com'
    ];
    
    return meetingDomains.some(domain => url.includes(domain));
  }
});
