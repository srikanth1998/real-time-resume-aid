import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { WebSocketServer } from 'ws';
import { AudioCaptureManager } from './audio/audioCaptureManager';
import { OverlayManager } from './ui/overlayManager';
import { DriverDetector } from './audio/driverDetection';
import { DriverInstaller } from './audio/driverInstaller';

class NativeHelper {
  private mainWindow: BrowserWindow | null = null;
  private wsServer: WebSocketServer | null = null;
  private audioCaptureManager: AudioCaptureManager | null = null;
  private overlayManager: OverlayManager | null = null;

  constructor() {
    this.setupApp();
  }

  private setupApp() {
    app.whenReady().then(() => {
      this.createMainWindow();
      this.startWebSocketServer();
      this.setupAudioCapture();
      this.setupOverlay();
      this.setupIpcHandlers();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 400,
      height: 500,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js')
      },
      show: false,
      skipTaskbar: true,
      title: 'InterviewAce Helper'
    });

    this.mainWindow.loadFile(join(__dirname, 'status.html'));
    this.hideFromScreenShare();
  }

  private hideFromScreenShare() {
    if (!this.mainWindow) return;

    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      const hwnd = this.mainWindow.getNativeWindowHandle();
      exec(`powershell -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\"user32.dll\\")] public static extern bool SetWindowDisplayAffinity(IntPtr hwnd, uint affinity); }'; [Win32]::SetWindowDisplayAffinity(${hwnd}, 0x00000011)"`);
    } else if (process.platform === 'darwin') {
      this.mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  }

  private setupIpcHandlers() {
    // System audio capabilities check
    ipcMain.handle('check-system-audio', async () => {
      return {
        available: true,
        platform: process.platform,
        method: process.platform === 'win32' ? 'WASAPI' : 'CoreAudio'
      };
    });

    // Overlay management handlers
    ipcMain.handle('create-stealth-overlay', async (event, sessionId: string, position?: any) => {
      if (this.overlayManager) {
        return this.overlayManager.createStealthOverlay(sessionId, position);
      }
      return null;
    });

    ipcMain.handle('show-overlay', async () => {
      if (this.overlayManager) {
        this.overlayManager.showOverlay();
      }
    });

    ipcMain.handle('hide-overlay', async () => {
      if (this.overlayManager) {
        this.overlayManager.hideOverlay();
      }
    });

    ipcMain.handle('toggle-overlay', async () => {
      if (this.overlayManager) {
        this.overlayManager.toggleOverlay();
      }
    });

    ipcMain.handle('set-overlay-position', async (event, position: any) => {
      if (this.overlayManager) {
        this.overlayManager.setPosition(position);
      }
    });

    ipcMain.handle('update-overlay-content', async (event, question: string, answer: string) => {
      if (this.overlayManager) {
        this.overlayManager.updateOverlayContent(question, answer);
      }
    });

    ipcMain.handle('destroy-overlay', async () => {
      if (this.overlayManager) {
        this.overlayManager.destroyOverlay();
      }
    });

    // Audio capture handlers
    ipcMain.handle('get-capabilities', async () => {
      return this.audioCaptureManager?.getStatus() || { available: false };
    });

    ipcMain.handle('start-capture', async (event, sessionId: string, jwt: string, config: any) => {
      if (this.audioCaptureManager) {
        await this.audioCaptureManager.startCapture(sessionId, jwt, config);
        
        // Show overlay when capture starts
        if (this.overlayManager) {
          this.overlayManager.showOverlay();
        }
      }
    });

    ipcMain.handle('stop-capture', async () => {
      if (this.audioCaptureManager) {
        await this.audioCaptureManager.stopCapture();
        
        // Hide overlay when capture stops
        if (this.overlayManager) {
          this.overlayManager.hideOverlay();
        }
      }
    });

    // Window management
    ipcMain.handle('minimize-window', async () => {
      if (this.mainWindow) {
        this.mainWindow.minimize();
      }
    });

    ipcMain.handle('close-window', async () => {
      if (this.mainWindow) {
        this.mainWindow.close();
      }
    });
  }

  private startWebSocketServer() {
    this.wsServer = new WebSocketServer({ port: 8765 });
    
    this.wsServer.on('connection', (ws) => {
      console.log('Client connected to native helper');
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Error handling client message:', error);
          ws.send(JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : String(error) }));
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
      });

      // Send capabilities and driver status on connection
      this.sendCapabilitiesAndDriverStatus(ws);
    });

    console.log('WebSocket server started on port 8765');
  }

  private async sendCapabilitiesAndDriverStatus(ws: any) {
    ws.send(JSON.stringify({
      type: 'capabilities',
      data: {
        available: true,
        version: '1.0.0',
        platform: process.platform,
        systemAudio: {
          available: true,
          method: process.platform === 'win32' ? 'WASAPI' : 'CoreAudio'
        }
      }
    }));
  }

  private async handleClientMessage(ws: any, message: any) {
    switch (message.action) {
      case 'startCapture':
        if (this.audioCaptureManager) {
          await this.audioCaptureManager.startCapture(
            message.sessionId,
            message.jwt,
            message.supabaseConfig
          );
          
          // Create and show stealth overlay
          if (this.overlayManager) {
            this.overlayManager.createStealthOverlay(message.sessionId);
            this.overlayManager.showOverlay();
          }
          
          ws.send(JSON.stringify({ type: 'captureStatus', status: 'active' }));
        }
        break;

      case 'stopCapture':
        if (this.audioCaptureManager) {
          await this.audioCaptureManager.stopCapture();
          
          // Hide overlay
          if (this.overlayManager) {
            this.overlayManager.hideOverlay();
          }
          
          ws.send(JSON.stringify({ type: 'captureStatus', status: 'idle' }));
        }
        break;

      case 'showOverlay':
        if (this.overlayManager) {
          this.overlayManager.showOverlay();
          ws.send(JSON.stringify({ type: 'overlayStatus', visible: true }));
        }
        break;

      case 'hideOverlay':
        if (this.overlayManager) {
          this.overlayManager.hideOverlay();
          ws.send(JSON.stringify({ type: 'overlayStatus', visible: false }));
        }
        break;

      case 'updateOverlay':
        if (this.overlayManager && message.question && message.answer) {
          this.overlayManager.updateOverlayContent(message.question, message.answer);
          ws.send(JSON.stringify({ type: 'overlayUpdated', success: true }));
        }
        break;

      case 'checkSystemAudio':
        ws.send(JSON.stringify({ 
          type: 'systemAudioStatus', 
          status: {
            available: true,
            platform: process.platform,
            method: process.platform === 'win32' ? 'WASAPI' : 'CoreAudio'
          }
        }));
        break;

      case 'getCapabilities':
        await this.sendCapabilitiesAndDriverStatus(ws);
        break;
    }
  }

  private async setupAudioCapture() {
    this.audioCaptureManager = new AudioCaptureManager();
    await this.audioCaptureManager.initialize();
  }

  private setupOverlay() {
    this.overlayManager = new OverlayManager();
  }
}

// Start the application
new NativeHelper();
