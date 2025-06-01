
// Listen for messages from Chrome extension
export const initializeExtensionConnector = () => {
  const handleExtensionMessage = (event: MessageEvent) => {
    if (event.source !== window) return;
    
    if (event.data.action === 'processAudio') {
      // Dispatch custom event that the Interview component can listen to
      const audioEvent = new CustomEvent('extensionAudio', {
        detail: { audioData: event.data.audioData }
      });
      window.dispatchEvent(audioEvent);
    }
  };

  window.addEventListener('message', handleExtensionMessage);
  
  // Notify extension that interview app is ready
  window.postMessage({
    action: 'interviewAppReady',
    timestamp: Date.now()
  }, '*');

  return () => {
    window.removeEventListener('message', handleExtensionMessage);
  };
};

// Check if extension is available
export const checkExtensionAvailability = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof window.chrome !== 'undefined' && 
         window.chrome?.runtime !== undefined && 
         window.chrome?.runtime?.id !== undefined;
};
