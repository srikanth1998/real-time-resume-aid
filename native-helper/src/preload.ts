
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
  
  // Window management
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Event listeners
  onDriverStatusChange: (callback: (status: any) => void) => 
    ipcRenderer.on('driver-status-changed', callback),
  onCaptureStatusChange: (callback: (status: any) => void) => 
    ipcRenderer.on('capture-status-changed', callback)
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
    };
  }
}
