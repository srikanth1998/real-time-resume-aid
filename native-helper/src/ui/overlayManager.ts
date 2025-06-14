
import { BrowserWindow, screen, app } from 'electron';
import { join } from 'path';

export interface OverlayPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class OverlayManager {
  private overlayWindow: BrowserWindow | null = null;
  private isVisible = false;
  private currentPosition: OverlayPosition | null = null;

  constructor() {
    this.setupAppEvents();
  }

  private setupAppEvents() {
    // Hide overlay when main app loses focus (additional stealth measure)
    app.on('browser-window-blur', () => {
      if (this.overlayWindow && this.isVisible) {
        this.overlayWindow.hide();
      }
    });

    app.on('browser-window-focus', () => {
      if (this.overlayWindow && this.isVisible) {
        this.overlayWindow.show();
      }
    });
  }

  createStealthOverlay(sessionId: string, position?: OverlayPosition) {
    if (this.overlayWindow) {
      this.destroyOverlay();
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Default position: small window in bottom-right corner
    const defaultPosition: OverlayPosition = {
      x: screenWidth - 350,
      y: screenHeight - 500,
      width: 320,
      height: 450
    };

    this.currentPosition = position || defaultPosition;

    this.overlayWindow = new BrowserWindow({
      width: this.currentPosition.width,
      height: this.currentPosition.height,
      x: this.currentPosition.x,
      y: this.currentPosition.y,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      focusable: false, // Prevents stealing focus from main application
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'overlay-preload.js'),
        webSecurity: true,
        allowRunningInsecureContent: false
      },
      show: false // Start hidden
    });

    // Load the overlay content with session ID
    const overlayUrl = `data:text/html;charset=utf-8,${encodeURIComponent(this.getOverlayHTML(sessionId))}`;
    this.overlayWindow.loadURL(overlayUrl);

    // Apply stealth measures
    this.applyStealthMeasures();

    // Set up window event handlers
    this.setupOverlayEvents();

    console.log('Stealth overlay created for session:', sessionId);
    return this.overlayWindow;
  }

  private applyStealthMeasures() {
    if (!this.overlayWindow) return;

    const hwnd = this.overlayWindow.getNativeWindowHandle();

    if (process.platform === 'win32') {
      // Windows: Use SetWindowDisplayAffinity to hide from screen capture
      const { exec } = require('child_process');
      
      // WDA_EXCLUDEFROMCAPTURE = 0x00000011
      const command = `powershell -Command "
        Add-Type -TypeDefinition '
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport(\\"user32.dll\\")]
            public static extern bool SetWindowDisplayAffinity(IntPtr hwnd, uint affinity);
            
            [DllImport(\\"user32.dll\\")]
            public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
            
            public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
            public static readonly uint SWP_NOMOVE = 0x0002;
            public static readonly uint SWP_NOSIZE = 0x0001;
            public static readonly uint SWP_SHOWWINDOW = 0x0040;
          }
        ';
        [Win32]::SetWindowDisplayAffinity(${hwnd}, 0x00000011);
        [Win32]::SetWindowPos(${hwnd}, [Win32]::HWND_TOPMOST, 0, 0, 0, 0, 0x0003);
      "`;
      
      exec(command, (error: any) => {
        if (error) {
          console.warn('Failed to apply Windows stealth measures:', error);
        } else {
          console.log('Windows stealth measures applied successfully');
        }
      });

    } else if (process.platform === 'darwin') {
      // macOS: Use CGShieldingWindowLevel and kCGDesktopWindowLevel
      this.overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      
      // Additional macOS stealth measures using native APIs
      const { exec } = require('child_process');
      const windowId = this.overlayWindow.id;
      
      // Use osascript to hide window from Mission Control and Exposé
      exec(`osascript -e 'tell application "System Events" to set visible of process "InterviewAce Helper" to false'`, (error: any) => {
        if (error) {
          console.warn('Failed to hide from Mission Control:', error);
        }
      });
    }
  }

  private setupOverlayEvents() {
    if (!this.overlayWindow) return;

    // Prevent the overlay from being closed
    this.overlayWindow.on('close', (event) => {
      event.preventDefault();
      this.hideOverlay();
    });

    // Maintain always-on-top status
    this.overlayWindow.on('blur', () => {
      if (this.overlayWindow && this.isVisible) {
        this.overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      }
    });

    // Handle window movement (optional: could implement drag functionality)
    this.overlayWindow.on('moved', () => {
      if (this.overlayWindow) {
        const bounds = this.overlayWindow.getBounds();
        this.currentPosition = bounds;
      }
    });
  }

  private getOverlayHTML(sessionId: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>InterviewAce - Stealth Mode</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(30,30,30,0.98) 100%);
            color: white;
            height: 100vh;
            overflow: hidden;
            backdrop-filter: blur(10px);
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
          }
          
          .header {
            padding: 8px 12px;
            background: rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          
          .logo {
            font-size: 12px;
            font-weight: 600;
            color: #60a5fa;
          }
          
          .status {
            font-size: 10px;
            padding: 2px 6px;
            background: rgba(34, 197, 94, 0.2);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 4px;
            color: #22c55e;
          }
          
          .content {
            padding: 12px;
            height: calc(100vh - 40px);
            overflow-y: auto;
          }
          
          .waiting-state {
            text-align: center;
            padding: 40px 20px;
            color: #9ca3af;
          }
          
          .waiting-icon {
            width: 32px;
            height: 32px;
            margin: 0 auto 12px;
            border: 2px solid #4f46e5;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .answer-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            animation: slideIn 0.3s ease-out;
          }
          
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .question {
            font-size: 11px;
            color: #e5e7eb;
            margin-bottom: 8px;
            font-weight: 500;
          }
          
          .answer {
            font-size: 12px;
            line-height: 1.4;
            color: white;
          }
          
          .timestamp {
            font-size: 9px;
            color: #6b7280;
            margin-top: 6px;
            text-align: right;
          }
          
          .controls {
            position: absolute;
            bottom: 8px;
            right: 8px;
            display: flex;
            gap: 4px;
          }
          
          .control-btn {
            width: 20px;
            height: 20px;
            background: rgba(255,255,255,0.1);
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .control-btn:hover {
            background: rgba(255,255,255,0.2);
          }
          
          ::-webkit-scrollbar {
            width: 4px;
          }
          
          ::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.05);
          }
          
          ::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">InterviewAce</div>
          <div class="status" id="status">Stealth Mode</div>
        </div>
        
        <div class="content" id="content">
          <div class="waiting-state">
            <div class="waiting-icon"></div>
            <div>Waiting for questions...</div>
            <div style="font-size: 9px; margin-top: 4px;">Session: ${sessionId.substring(0, 8)}...</div>
          </div>
        </div>
        
        <div class="controls">
          <button class="control-btn" onclick="toggleSize()" title="Toggle Size">⤢</button>
          <button class="control-btn" onclick="hideWindow()" title="Hide">✕</button>
        </div>
        
        <script>
          let answers = [];
          let isCompact = false;
          
          // Connect to the main process for real-time updates
          window.electronAPI?.onCaptureStatusChange?.((status) => {
            const statusEl = document.getElementById('status');
            if (status.status === 'active') {
              statusEl.textContent = 'Recording';
              statusEl.style.background = 'rgba(239, 68, 68, 0.2)';
              statusEl.style.borderColor = 'rgba(239, 68, 68, 0.3)';
              statusEl.style.color = '#ef4444';
            } else {
              statusEl.textContent = 'Stealth Mode';
              statusEl.style.background = 'rgba(34, 197, 94, 0.2)';
              statusEl.style.borderColor = 'rgba(34, 197, 94, 0.3)';
              statusEl.style.color = '#22c55e';
            }
          });
          
          function addAnswer(question, answer) {
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            answers.unshift({ question, answer, timestamp });
            
            updateContent();
          }
          
          function updateContent() {
            const content = document.getElementById('content');
            
            if (answers.length === 0) {
              content.innerHTML = \`
                <div class="waiting-state">
                  <div class="waiting-icon"></div>
                  <div>Waiting for questions...</div>
                  <div style="font-size: 9px; margin-top: 4px;">Session: ${sessionId.substring(0, 8)}...</div>
                </div>
              \`;
              return;
            }
            
            content.innerHTML = answers.map(item => \`
              <div class="answer-card">
                <div class="question">"$\{item.question.length > 100 ? item.question.substring(0, 100) + '...' : item.question}"</div>
                <div class="answer">$\{isCompact ? (item.answer.substring(0, 150) + (item.answer.length > 150 ? '...' : '')) : item.answer}</div>
                <div class="timestamp">$\{item.timestamp}</div>
              </div>
            \`).join('');
          }
          
          function toggleSize() {
            isCompact = !isCompact;
            updateContent();
          }
          
          function hideWindow() {
            window.electronAPI?.hideOverlay?.();
          }
          
          // Simulate receiving answers (will be replaced with real WebSocket connection)
          setTimeout(() => {
            addAnswer(
              "What is your greatest strength?",
              "My greatest strength is my ability to adapt quickly to new situations and technologies. I'm naturally curious and enjoy learning, which allows me to stay current with industry trends and continuously improve my skills."
            );
          }, 3000);
        </script>
      </body>
      </html>
    `;
  }

  showOverlay() {
    if (this.overlayWindow) {
      this.overlayWindow.show();
      this.isVisible = true;
      console.log('Stealth overlay shown');
    }
  }

  hideOverlay() {
    if (this.overlayWindow) {
      this.overlayWindow.hide();
      this.isVisible = false;
      console.log('Stealth overlay hidden');
    }
  }

  toggleOverlay() {
    if (this.isVisible) {
      this.hideOverlay();
    } else {
      this.showOverlay();
    }
  }

  updateOverlayContent(question: string, answer: string) {
    if (this.overlayWindow) {
      this.overlayWindow.webContents.executeJavaScript(`
        addAnswer(\`${question.replace(/`/g, '\\`')}\`, \`${answer.replace(/`/g, '\\`')}\`);
      `);
    }
  }

  setPosition(position: OverlayPosition) {
    if (this.overlayWindow) {
      this.overlayWindow.setBounds(position);
      this.currentPosition = position;
    }
  }

  getPosition(): OverlayPosition | null {
    return this.currentPosition;
  }

  destroyOverlay() {
    if (this.overlayWindow) {
      this.overlayWindow.destroy();
      this.overlayWindow = null;
      this.isVisible = false;
      this.currentPosition = null;
      console.log('Stealth overlay destroyed');
    }
  }

  isOverlayVisible(): boolean {
    return this.isVisible && this.overlayWindow !== null;
  }
}
