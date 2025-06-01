
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

// Check if extension is available - improved detection
export const checkExtensionAvailability = (): boolean => {
  console.log('=== Checking Extension Availability ===');
  
  // First check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.log('Not in browser environment');
    return false;
  }
  
  // Check for Chrome API
  const chromeAPI = (window as any).chrome;
  const hasChromeAPI = typeof chromeAPI !== 'undefined' && chromeAPI?.runtime !== undefined;
  
  console.log('Chrome API available:', hasChromeAPI);
  
  if (!hasChromeAPI) {
    // If no Chrome API, check if we received extension messages
    const extensionMessageReceived = (window as any).__extensionReady || false;
    console.log('Extension message received:', extensionMessageReceived);
    return extensionMessageReceived;
  }
  
  // Check if extension ID is available
  const hasExtensionId = chromeAPI?.runtime?.id !== undefined;
  console.log('Extension ID available:', hasExtensionId);
  
  return hasExtensionId;
};

// Manual test function for extension connectivity
export const testExtensionConnection = () => {
  console.log('=== Manual Extension Test ===');
  
  // Set a flag to indicate we're testing
  (window as any).__extensionTest = true;
  
  console.log('Sending test message to extension...');
  window.postMessage({
    action: 'testConnection',
    timestamp: Date.now()
  }, '*');
  
  // Wait for response
  setTimeout(() => {
    const received = (window as any).__extensionReady;
    console.log('Extension test result:', received ? 'SUCCESS' : 'FAILED');
  }, 1000);
  
  return { success: true, message: 'Test message sent' };
};
