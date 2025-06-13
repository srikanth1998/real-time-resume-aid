
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods for overlay functionality
contextBridge.exposeInMainWorld('electronAPI', {
  // Overlay control methods
  hideOverlay: () => ipcRenderer.invoke('hide-overlay'),
  showOverlay: () => ipcRenderer.invoke('show-overlay'),
  toggleOverlay: () => ipcRenderer.invoke('toggle-overlay'),
  setOverlayPosition: (position: any) => ipcRenderer.invoke('set-overlay-position', position),
  
  // Event listeners for real-time updates
  onAnswerReceived: (callback: (data: any) => void) => 
    ipcRenderer.on('overlay-answer-received', callback),
  onCaptureStatusChange: (callback: (status: any) => void) => 
    ipcRenderer.on('capture-status-changed', callback),
  onSessionUpdate: (callback: (session: any) => void) => 
    ipcRenderer.on('session-updated', callback),
    
  // Remove listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('overlay-answer-received');
    ipcRenderer.removeAllListeners('capture-status-changed');
    ipcRenderer.removeAllListeners('session-updated');
  }
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      hideOverlay: () => Promise<void>;
      showOverlay: () => Promise<void>;
      toggleOverlay: () => Promise<void>;
      setOverlayPosition: (position: any) => Promise<void>;
      onAnswerReceived: (callback: (data: any) => void) => void;
      onCaptureStatusChange: (callback: (status: any) => void) => void;
      onSessionUpdate: (callback: (session: any) => void) => void;
      removeAllListeners: () => void;
    };
  }
}
