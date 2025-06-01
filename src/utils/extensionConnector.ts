
// Listen for messages from Chrome extension
export const initializeExtensionConnector = () => {
  // Listen for messages from Chrome extension content script
  const handleExtensionMessage = (event: MessageEvent) => {
    if (event.source !== window) return;
    
    if (event.data.action === 'processAudio') {
      console.log('Received audio data from extension:', event.data.audioData?.length);
      // Dispatch custom event that the Interview component can listen to
      const audioEvent = new CustomEvent('extensionAudio', {
        detail: { audioData: event.data.audioData }
      });
      window.dispatchEvent(audioEvent);
    }
  };

  // Listen for direct Chrome extension messages
  const handleChromeExtensionMessage = (request: any, sender: any, sendResponse: any) => {
    console.log('Received Chrome extension message:', request);
    
    if (request.action === 'processAudio') {
      console.log('Processing audio from Chrome extension');
      // Dispatch custom event that the Interview component can listen to
      const audioEvent = new CustomEvent('extensionAudio', {
        detail: { audioData: request.audioData }
      });
      window.dispatchEvent(audioEvent);
      
      if (sendResponse) {
        sendResponse({ success: true });
      }
    }
    
    return true; // Keep message channel open
  };

  // Add both listeners
  window.addEventListener('message', handleExtensionMessage);
  
  // Add Chrome extension message listener if available
  const chromeAPI = (window as any).chrome;
  if (typeof chromeAPI !== 'undefined' && chromeAPI.runtime && chromeAPI.runtime.onMessage) {
    chromeAPI.runtime.onMessage.addListener(handleChromeExtensionMessage);
  }
  
  // Notify extension that interview app is ready
  window.postMessage({
    action: 'interviewAppReady',
    timestamp: Date.now()
  }, '*');

  console.log('Extension connector initialized');

  return () => {
    window.removeEventListener('message', handleExtensionMessage);
    const chromeAPI = (window as any).chrome;
    if (typeof chromeAPI !== 'undefined' && chromeAPI.runtime && chromeAPI.runtime.onMessage) {
      chromeAPI.runtime.onMessage.removeListener(handleChromeExtensionMessage);
    }
  };
};

// Check if extension is available
export const checkExtensionAvailability = (): boolean => {
  const chromeAPI = (window as any).chrome;
  const isAvailable = typeof window !== 'undefined' && 
         typeof chromeAPI !== 'undefined' && 
         chromeAPI?.runtime !== undefined && 
         chromeAPI?.runtime?.id !== undefined;
  
  console.log('Extension availability check:', isAvailable);
  return isAvailable;
};
