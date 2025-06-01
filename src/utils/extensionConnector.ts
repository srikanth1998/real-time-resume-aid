
// Listen for messages from Chrome extension
export const initializeExtensionConnector = () => {
  console.log('=== Extension Connector Initialization ===');
  console.log('Window object:', typeof window !== 'undefined');
  console.log('Chrome object:', typeof (window as any).chrome !== 'undefined');
  console.log('Chrome runtime:', (window as any).chrome?.runtime);
  console.log('Chrome runtime ID:', (window as any).chrome?.runtime?.id);
  
  // Listen for messages from Chrome extension content script
  const handleExtensionMessage = (event: MessageEvent) => {
    console.log('=== Received window message ===', event);
    if (event.source !== window) return;
    
    // Only process messages from our extension
    if (event.data.source !== 'interviewace-extension') return;
    
    if (event.data.action === 'processAudio') {
      console.log('Received audio data from extension:', event.data.audioData?.length);
      // Dispatch custom event that the Interview component can listen to
      const audioEvent = new CustomEvent('extensionAudio', {
        detail: { audioData: event.data.audioData }
      });
      window.dispatchEvent(audioEvent);
    }
    
    if (event.data.action === 'extensionReady') {
      console.log('Extension reported as ready');
      // Dispatch event to update UI
      const readyEvent = new CustomEvent('extensionReady');
      window.dispatchEvent(readyEvent);
    }
  };

  // Add window message listener
  window.addEventListener('message', handleExtensionMessage);
  
  // Notify extension that interview app is ready
  console.log('Posting message: interviewAppReady');
  window.postMessage({
    action: 'interviewAppReady',
    timestamp: Date.now()
  }, '*');

  console.log('Extension connector initialized');

  return () => {
    window.removeEventListener('message', handleExtensionMessage);
  };
};

// Check if extension is available
export const checkExtensionAvailability = (): boolean => {
  console.log('=== Checking Extension Availability ===');
  const chromeAPI = (window as any).chrome;
  
  console.log('Window available:', typeof window !== 'undefined');
  console.log('Chrome API available:', typeof chromeAPI !== 'undefined');
  console.log('Chrome runtime available:', chromeAPI?.runtime !== undefined);
  console.log('Chrome runtime ID available:', chromeAPI?.runtime?.id !== undefined);
  
  const isAvailable = typeof window !== 'undefined' && 
         typeof chromeAPI !== 'undefined' && 
         chromeAPI?.runtime !== undefined && 
         chromeAPI?.runtime?.id !== undefined;
  
  console.log('Final extension availability:', isAvailable);
  return isAvailable;
};

// Manual test function for extension connectivity
export const testExtensionConnection = () => {
  console.log('=== Manual Extension Test ===');
  const chromeAPI = (window as any).chrome;
  
  if (!chromeAPI?.runtime) {
    console.log('Chrome runtime not available');
    return { success: false, error: 'Chrome runtime not available' };
  }
  
  console.log('Sending test message to extension...');
  window.postMessage({
    action: 'testConnection',
    timestamp: Date.now()
  }, '*');
  
  return { success: true, message: 'Test message sent' };
};
