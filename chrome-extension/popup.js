
document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('startCapture');
  const stopBtn = document.getElementById('stopCapture');
  const findAppBtn = document.getElementById('findInterviewApp');
  const statusDiv = document.getElementById('status');
  
  // Get current status
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (response) {
      updateUI(response.isCapturing);
    }
  });
  
  startBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!isMeetingTab(tab.url)) {
        showError('Please switch to your video meeting tab first (Google Meet, Zoom, Teams, YouTube, etc.)');
        return;
      }
      
      // Show loading state
      statusDiv.textContent = '⏳ Starting capture...';
      statusDiv.className = 'status loading';
      
      chrome.runtime.sendMessage(
        { action: 'startCapture', tabId: tab.id },
        (response) => {
          if (response && response.success) {
            updateUI(true);
            showSuccess('✅ Audio capture started successfully!');
            setTimeout(() => window.close(), 1500);
          } else {
            const errorMsg = response?.error || 'Unknown error occurred';
            showError('❌ Failed to start capture: ' + errorMsg);
            updateUI(false);
          }
        }
      );
    } catch (error) {
      showError('❌ Error: ' + error.message);
      updateUI(false);
    }
  });
  
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopCapture' }, (response) => {
      if (response && response.success) {
        updateUI(false);
        showSuccess('✅ Audio capture stopped');
      } else {
        showError('❌ Failed to stop capture');
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
            if (response && response.success) {
              showSuccess('✅ Connected to Interview App!\n\nNow go to your meeting tab and start capturing.');
            } else {
              showError('❌ Failed to connect to Interview App');
            }
          }
        );
      } else {
        showError('❌ Interview app not found!\n\nPlease open your InterviewAce app first.');
      }
    } catch (error) {
      showError('❌ Error finding interview app: ' + error.message);
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
  
  function showSuccess(message) {
    statusDiv.textContent = message;
    statusDiv.className = 'status success';
  }
  
  function showError(message) {
    statusDiv.textContent = message;
    statusDiv.className = 'status error';
  }
  
  function isMeetingTab(url) {
    if (!url) return false;
    
    const meetingDomains = [
      'meet.google.com',
      'zoom.us',
      'teams.microsoft.com',
      'webex.com',
      'youtube.com'
    ];
    
    return meetingDomains.some(domain => url.includes(domain));
  }
});
