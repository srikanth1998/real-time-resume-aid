// Import Electron modules using require syntax for CommonJS compatibility
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
import { join } from 'path';
import { WebSocketServer } from 'ws';
import { AudioCaptureManager } from './audio/audioCaptureManager';
import { OverlayManager } from './ui/overlayManager';

class NativeHelper {
  private mainWindow: typeof BrowserWindow | null = null;
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
    this.mainWindow.setContentProtection(true);
  }

  private setupIpcHandlers() {
    // Add compatibility handler for older versions
    ipcMain.handle('check-system-audio', (event: Electron.IpcMainInvokeEvent) => ({
      available: true,
      platform: process.platform,
      method: process.platform === 'win32' ? 'WASAPI' : 'CoreAudio'
    }));

    ipcMain.handle('create-stealth-overlay', async (event: Electron.IpcMainInvokeEvent, sessionId: string, position?: any) => {
      if (this.overlayManager) {
        return this.overlayManager.createStealthOverlay(sessionId, position);
      }
      return null;
    });

    ipcMain.handle('show-overlay', async (event: Electron.IpcMainInvokeEvent) => {
      if (this.overlayManager) {
        this.overlayManager.showOverlay();
      }
    });

    ipcMain.handle('hide-overlay', async (event: Electron.IpcMainInvokeEvent) => {
      if (this.overlayManager) {
        this.overlayManager.hideOverlay();
      }
    });

    ipcMain.handle('toggle-overlay', async (event: Electron.IpcMainInvokeEvent) => {
      if (this.overlayManager) {
        this.overlayManager.toggleOverlay();
      }
    });

    ipcMain.handle('set-overlay-position', async (event: Electron.IpcMainInvokeEvent, position: any) => {
      if (this.overlayManager) {
        this.overlayManager.setPosition(position);
      }
    });

    ipcMain.handle('update-overlay-content', async (event: Electron.IpcMainInvokeEvent, question: string, answer: string) => {
      if (this.overlayManager) {
        this.overlayManager.updateOverlayContent(question, answer);
      }
    });

    ipcMain.handle('destroy-overlay', async () => {
      if (this.overlayManager) {
        this.overlayManager.destroyOverlay();
      }
    });

    ipcMain.handle('get-capabilities', async () => {
      return this.audioCaptureManager?.getStatus() || { available: false };
    });

    ipcMain.handle('start-capture', async (event: Electron.IpcMainInvokeEvent, sessionId: string, jwt: string, config: any) => {
      if (this.audioCaptureManager) {
        await this.audioCaptureManager.startCapture(sessionId, jwt, config);
        if (this.overlayManager) {
          this.overlayManager.createStealthOverlay(sessionId);
          this.overlayManager.showOverlay();
        }
      }
    });

    ipcMain.handle('stop-capture', async () => {
      if (this.audioCaptureManager) {
        await this.audioCaptureManager.stopCapture();
        if (this.overlayManager) {
          this.overlayManager.hideOverlay();
        }
      }
    });

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

      this.sendCapabilities(ws);
    });

    console.log('WebSocket server started on port 8765');
  }

  private sendCapabilities(ws: any) {
    ws.send(JSON.stringify({
      type: 'capabilities',
      data: {
        available: true,
        version: '1.0.0'
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
      case 'getCapabilities':
        this.sendCapabilities(ws);
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

// Create an instance of NativeHelper to start the application
const helper = new NativeHelper();
