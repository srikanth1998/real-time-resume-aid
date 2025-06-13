
import { BrowserWindow, screen } from 'electron';

export class OverlayManager {
  private overlayWindow: BrowserWindow | null = null;

  createStealthOverlay() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    this.overlayWindow = new BrowserWindow({
      width: 400,
      height: 600,
      x: width - 420,
      y: 20,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Load the overlay UI (would connect to your React app)
    this.overlayWindow.loadURL('http://localhost:5173/overlay');

    // Hide from screen sharing
    this.hideOverlayFromScreenShare();
  }

  private hideOverlayFromScreenShare() {
    if (!this.overlayWindow) return;

    if (process.platform === 'win32') {
      // Windows: Use SetWindowDisplayAffinity
      const hwnd = this.overlayWindow.getNativeWindowHandle();
      // This would call the Windows API to exclude from screen capture
    } else if (process.platform === 'darwin') {
      // macOS: Use CGShieldingWindowLevel
      this.overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  }

  showOverlay() {
    if (this.overlayWindow) {
      this.overlayWindow.show();
    } else {
      this.createStealthOverlay();
    }
  }

  hideOverlay() {
    if (this.overlayWindow) {
      this.overlayWindow.hide();
    }
  }
}
