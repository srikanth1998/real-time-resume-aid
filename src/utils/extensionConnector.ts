
/* global chrome */

console.log('=== Extension Connector Initialization (Transcription Mode) ===');

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  console.log('Window object:', !!window);
  
  // Post message to notify extension that interview app is ready
  console.log('📢 Posting message: interviewAppReady');
  window.postMessage({
    action: 'interviewAppReady',
    timestamp: Date.now()
  }, '*');
  
  console.log('✅ Extension connector initialized for transcription mode');
}

export function checkExtensionAvailability(): boolean {
  console.log('=== Checking Extension Availability ===');
  
  // Check if Chrome API is available with proper type checking
  const chromeAvailable = typeof window !== 'undefined' && 
    typeof (window as any).chrome !== 'undefined' && 
    (window as any).chrome.runtime && 
    (window as any).chrome.runtime.id;
  console.log('Chrome API available:', chromeAvailable);
  
  // Check if we've received any extension messages
  const extensionMessageReceived = !!(window as any).__extensionReady;
  console.log('Extension message received:', extensionMessageReceived);
  
  return chromeAvailable || extensionMessageReceived;
}

export function initializeExtensionConnector(): () => void {
  console.log('🚀 Initializing extension connector for transcription...');

  // Listen for messages from extension
  const handleMessage = (event: MessageEvent) => {
    console.log('=== Received window message ===', event);
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
    
    // Handle extension ready message
    if (event.data.action === 'extensionReady' && event.data.source === 'interviewace-extension') {
      console.log('✅ Extension ready message received');
      (window as any).__extensionReady = true;
      
      // Dispatch custom event
      const readyEvent = new CustomEvent('extensionReady', {
        detail: event.data
      });
      window.dispatchEvent(readyEvent);
    }
    
    // Handle transcription results
    if (event.data.action === 'processTranscription' && event.data.source === 'interviewace-extension') {
      console.log('📝 Transcription received:', event.data.text);
      
      // Dispatch custom event for transcription
      const transcriptionEvent = new CustomEvent('extensionTranscription', {
        detail: {
          text: event.data.text,
          timestamp: event.data.timestamp,
          type: 'real-time-transcription'
        }
      });
      window.dispatchEvent(transcriptionEvent);
    }
    
    // Handle test connection
    if (event.data.action === 'testConnection') {
      console.log('🧪 Test connection received');
      window.postMessage({
        action: 'extensionReady',
        source: 'interviewace-extension',
        capabilities: ['localTranscription', 'privacyFocused', 'audioPassthrough'],
        timestamp: Date.now()
      }, '*');
    }
    
    // Handle messages from our own app (allow them through)
    if (event.data.action === 'interviewAppReady') {
      console.log('✅ Interview app ready message (from our app)');
      // Don't ignore this message even though source is undefined
    }
  };

  // Add event listener
  window.addEventListener('message', handleMessage);

  // Cleanup function
  return () => {
    console.log('🧹 Cleaning up extension connector');
    window.removeEventListener('message', handleMessage);
  };
}

// Initial check for extension availability
setTimeout(() => {
  const isAvailable = checkExtensionAvailability();
  console.log('📊 Extension availability check result:', isAvailable);
}, 1000);
