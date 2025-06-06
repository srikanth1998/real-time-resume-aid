// popup.js
/* global chrome */
const btn    = document.getElementById('toggleBtn');
const status = document.getElementById('status');

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab.url.startsWith('https://meet.google.com/')) {
    btn.disabled = false;
  } else {
    status.textContent = 'Open Google Meet in this tab first.';
  }
});

btn.onclick = () => {
  chrome.runtime.sendMessage({ action: 'toggle' });
  window.close();
};
