import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Audio capture methods
  getCapabilities: () => ipcRenderer.invoke('get-capabilities'),
  startCapture: (sessionId: string, jwt: string, config: any) => 
    ipcRenderer.invoke('start-capture', sessionId, jwt, config),
  stopCapture: () => ipcRenderer.invoke('stop-capture'),
  
  // Driver management methods
  checkDriverStatus: () => ipcRenderer.invoke('check-driver-status'),
  getInstallationSteps: () => ipcRenderer.invoke('get-installation-steps'),
  executeInstallationStep: (stepId: string) => ipcRenderer.invoke('execute-installation-step', stepId),
  verifyDriverInstallation: () => ipcRenderer.invoke('verify-driver-installation'),
  refreshDriverStatus: () => ipcRenderer.invoke('refresh-driver-status'),
  getDriverInstructions: () => ipcRenderer.invoke('get-driver-instructions'),
  openDriverDownload: () => ipcRenderer.invoke('open-driver-download'),
  
  // Overlay management methods
  createStealthOverlay: (sessionId: string, position?: any) => 
    ipcRenderer.invoke('create-stealth-overlay', sessionId, position),
  showOverlay: () => ipcRenderer.invoke('show-overlay'),
  hideOverlay: () => ipcRenderer.invoke('hide-overlay'),
  toggleOverlay: () => ipcRenderer.invoke('toggle-overlay'),
  setOverlayPosition: (position: any) => ipcRenderer.invoke('set-overlay-position', position),
  updateOverlayContent: (question: string, answer: string) => 
    ipcRenderer.invoke('update-overlay-content', question, answer),
  destroyOverlay: () => ipcRenderer.invoke('destroy-overlay'),
  
  // Window management
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Event listeners
  onDriverStatusChange: (callback: (status: any) => void) => 
    ipcRenderer.on('driver-status-changed', callback),
  onCaptureStatusChange: (callback: (status: any) => void) => 
    ipcRenderer.on('capture-status-changed', callback),
  onOverlayStatusChange: (callback: (status: any) => void) => 
    ipcRenderer.on('overlay-status-changed', callback)
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getCapabilities: () => Promise<any>;
      startCapture: (sessionId: string, jwt: string, config: any) => Promise<void>;
      stopCapture: () => Promise<void>;
      checkDriverStatus: () => Promise<any>;
      getInstallationSteps: () => Promise<any[]>;
      executeInstallationStep: (stepId: string) => Promise<any[]>;
      verifyDriverInstallation: () => Promise<any>;
      refreshDriverStatus: () => Promise<any[]>;
      getDriverInstructions: () => Promise<string[]>;
      openDriverDownload: () => Promise<void>;
      minimizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      onDriverStatusChange: (callback: (status: any) => void) => void;
      onCaptureStatusChange: (callback: (status: any) => void) => void;
      onOverlayStatusChange: (callback: (status: any) => void) => void;
      
      // Overlay methods
      createStealthOverlay: (sessionId: string, position?: any) => Promise<any>;
      showOverlay: () => Promise<void>;
      hideOverlay: () => Promise<void>;
      toggleOverlay: () => Promise<void>;
      setOverlayPosition: (position: any) => Promise<void>;
      updateOverlayContent: (question: string, answer: string) => Promise<void>;
      destroyOverlay: () => Promise<void>;
    };
  }
}
