
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { WebSocketServer } from 'ws';
import { AudioCaptureManager } from './audio/audioCaptureManager';
import { OverlayManager } from './ui/overlayManager';

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
      height: 300,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js')
      },
      show: false, // Start hidden
      skipTaskbar: true,
      title: 'InterviewAce Helper'
    });

    // Load a simple status page
    this.mainWindow.loadFile(join(__dirname, 'status.html'));

    // Hide from screen sharing
    this.hideFromScreenShare();
  }

  private hideFromScreenShare() {
    if (!this.mainWindow) return;

    if (process.platform === 'win32') {
      // Windows: Use SetWindowDisplayAffinity
      const { exec } = require('child_process');
      const hwnd = this.mainWindow.getNativeWindowHandle();
      exec(`powershell -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\"user32.dll\\")] public static extern bool SetWindowDisplayAffinity(IntPtr hwnd, uint affinity); }'; [Win32]::SetWindowDisplayAffinity(${hwnd}, 0x00000011)"`);
    } else if (process.platform === 'darwin') {
      // macOS: Use CGShieldingWindowLevel
      this.mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
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
          ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
      });

      // Send capabilities on connection
      ws.send(JSON.stringify({
        type: 'capabilities',
        data: {
          available: true,
          version: '1.0.0',
          drivers: {
            windows: process.platform === 'win32',
            macos: process.platform === 'darwin'
          }
        }
      }));
    });

    console.log('WebSocket server started on port 8765');
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
          ws.send(JSON.stringify({ type: 'captureStatus', status: 'active' }));
        }
        break;

      case 'stopCapture':
        if (this.audioCaptureManager) {
          await this.audioCaptureManager.stopCapture();
          ws.send(JSON.stringify({ type: 'captureStatus', status: 'idle' }));
        }
        break;

      case 'getCapabilities':
        ws.send(JSON.stringify({
          type: 'capabilities',
          data: {
            available: true,
            version: '1.0.0',
            drivers: {
              windows: process.platform === 'win32',
              macos: process.platform === 'darwin'
            }
          }
        }));
        break;
    }
  }

  private setupAudioCapture() {
    this.audioCaptureManager = new AudioCaptureManager();
  }

  private setupOverlay() {
    this.overlayManager = new OverlayManager();
  }
}

// Start the application
new NativeHelper();
