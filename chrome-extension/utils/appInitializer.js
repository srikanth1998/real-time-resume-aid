
/**
 * Handles application initialization and ready state notifications
 */
export class AppInitializer {
  // Enhanced app ready detection
  static notifyAppReady() {
    console.log('🚀 INTERVIEWACE AUTO-TRANSCRIPTION EXTENSION LOADED');
    console.log('🌐 Page URL:', window.location.href);
    
    // Send multiple ready messages to ensure delivery
    const readyMessage = {
      action: 'extensionReady',
      source: 'interviewace-extension-auto',
      capabilities: ['localTranscription', 'crossDeviceSync', 'autoOperation', 'sessionPersistence'],
      timestamp: Date.now()
    };
    
    // Send immediately
    window.postMessage(readyMessage, '*');
    
    // Send again after a short delay to catch late-loading apps
    setTimeout(() => {
      window.postMessage(readyMessage, '*');
      console.log('✅ Extension ready message re-sent for reliability');
    }, 1000);
    
    // Also expose a global function for direct access
    window.extensionReady = true;
    window.extensionCapabilities = ['localTranscription', 'crossDeviceSync', 'autoOperation', 'sessionPersistence'];
    
    console.log('✅ Extension ready state established');
  }

  static initializeApp(uiManager) {
    // Notify when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', AppInitializer.notifyAppReady);
    } else {
      AppInitializer.notifyAppReady();
    }

    // Also notify when page is fully loaded
    window.addEventListener('load', AppInitializer.notifyAppReady);

    // Show manual triggers after initialization
    setTimeout(() => {
      uiManager.showTrigger();
      uiManager.showButton();
    }, 2000);
  }
}
