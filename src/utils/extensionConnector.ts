
/* global chrome */

console.log('=== Extension Connector Initialization (Auto-Transcription Mode) ===');

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  console.log('Window object:', !!window);
  
  // Post message to notify extension that interview app is ready
  console.log('📢 Posting message: interviewAppReady (auto-mode)');
  window.postMessage({
    action: 'interviewAppReady',
    timestamp: Date.now()
  }, '*');
  
  console.log('✅ Extension connector initialized for auto-transcription mode');
}

export function checkExtensionAvailability(): boolean {
  console.log('=== Checking Auto-Extension Availability ===');
  
  // Check if Chrome API is available with proper type checking
  const chromeAvailable = typeof window !== 'undefined' && 
    typeof (window as any).chrome !== 'undefined' && 
    (window as any).chrome.runtime && 
    (window as any).chrome.runtime.id;
  console.log('Chrome API available:', chromeAvailable);
  
  // Check if we've received any extension messages
  const extensionMessageReceived = !!(window as any).__extensionReady;
  console.log('Auto-extension message received:', extensionMessageReceived);
  
  return chromeAvailable || extensionMessageReceived;
}

export function initializeExtensionConnector(): () => void {
  console.log('🚀 Initializing auto-extension connector...');

  // Listen for messages from extension
  const handleMessage = (event: MessageEvent) => {
    console.log('=== Received window message (auto-mode) ===', event);
    console.log('🔍 Message data:', event.data);
    console.log('🔍 Message source:', event.data?.source);
    console.log('🔍 Message action:', event.data?.action);
    
    // Only process messages from our extension
    if (event.source !== window) {
      console.log('❌ Message not from same window, ignoring');
      return;
    }
    
    if (!event.data || !event.data.action) {
      console.log('❌ Message missing data or action, ignoring');
      return;
    }
    
    // Handle extension ready message (support all extension types)
    if (event.data.action === 'extensionReady' && 
        (event.data.source === 'interviewace-extension' ||
         event.data.source === 'interviewace-extension-auto' ||
         event.data.source === 'interviewace-extension-silent')) {
      console.log('✅ Auto-extension ready message received');
      (window as any).__extensionReady = true;
      
      // Dispatch custom event
      const readyEvent = new CustomEvent('extensionReady', {
        detail: event.data
      });
      window.dispatchEvent(readyEvent);
    }
    
    // Handle transcription results (support all extension types)
    if (event.data.action === 'processTranscription' && 
        (event.data.source === 'interviewace-extension' ||
         event.data.source === 'interviewace-extension-auto' ||
         event.data.source === 'interviewace-extension-silent')) {
      console.log('📝 Auto-transcription received:', event.data.text);
      
      // Dispatch custom event for transcription
      const transcriptionEvent = new CustomEvent('extensionTranscription', {
        detail: {
          text: event.data.text,
          timestamp: event.data.timestamp,
          type: 'auto-transcription'
        }
      });
      window.dispatchEvent(transcriptionEvent);
    }
    
    // Handle test connection
    if (event.data.action === 'testConnection') {
      console.log('🧪 TEST CONNECTION - AUTO-MODE');
      window.postMessage({
        action: 'extensionReady',
        source: 'interviewace-extension-auto',
        capabilities: ['localTranscription', 'crossDeviceSync', 'autoOperation', 'sessionPersistence'],
        timestamp: Date.now()
      }, '*');
      console.log('✅ Test connection response sent with auto capabilities');
    }
    
    // Handle messages from our own app (allow them through)
    if (event.data.action === 'interviewAppReady') {
      console.log('✅ Interview app ready message (from our app - auto mode)');
    }
  };

  // Add event listener
  window.addEventListener('message', handleMessage);

  // Cleanup function
  return () => {
    console.log('🧹 Cleaning up auto-extension connector');
    window.removeEventListener('message', handleMessage);
  };
}

// Initial check for extension availability
setTimeout(() => {
  const isAvailable = checkExtensionAvailability();
  console.log('📊 Auto-extension availability check result:', isAvailable);
}, 1000);
