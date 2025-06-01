/* global chrome */
let banner;
function ensureBanner () {
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

chrome.runtime.onMessage.addListener(({ action }) => {
  const b = ensureBanner();
  if (action === 'captureStarted') b.hidden = false;
  if (action === 'captureStopped') b.hidden = true;
});
