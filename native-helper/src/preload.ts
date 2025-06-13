
import { contextBridge, ipcRenderer } from 'electron';

// Expose native audio API to renderer
contextBridge.exposeInMainWorld('nativeAudio', {
  getCapabilities: () => ipcRenderer.invoke('get-capabilities'),
  startCapture: (sessionId: string, jwt: string) => 
    ipcRenderer.invoke('start-capture', { sessionId, jwt }),
  stopCapture: () => ipcRenderer.invoke('stop-capture'),
  onStatusChange: (callback: (status: any) => void) => 
    ipcRenderer.on('status-change', (_, status) => callback(status))
});
