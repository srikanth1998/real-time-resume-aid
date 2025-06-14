
// Node.js bridge for native audio capture modules
import { EventEmitter } from 'events';

declare var require: NodeRequire;

interface NativeAudioCapture extends EventEmitter {
  initialize(): boolean;
  startCapture(): boolean;
  stopCapture(): void;
  destroy(): void;
}

class WindowsAudioCapture extends EventEmitter implements NativeAudioCapture {
  private nativeBinding: any;
  private captureHandle: any = null;

  constructor() {
    super();
    try {
      this.nativeBinding = require('../../build/Release/wasapi_capture.node');
    } catch (error) {
      console.error('Failed to load Windows audio capture module:', error);
      throw error;
    }
  }

  initialize(): boolean {
    try {
      this.captureHandle = this.nativeBinding.createCapture();
      return this.captureHandle !== null;
    } catch (error) {
      console.error('Failed to initialize Windows audio capture:', error);
      return false;
    }
  }

  startCapture(): boolean {
    if (!this.captureHandle) {
      console.error('Audio capture not initialized');
      return false;
    }

    try {
      // Set up audio data callback
      this.nativeBinding.setAudioCallback((audioData: Buffer) => {
        this.emit('audioData', audioData);
      });

      return this.nativeBinding.startCapture(this.captureHandle);
    } catch (error) {
      console.error('Failed to start Windows audio capture:', error);
      return false;
    }
  }

  stopCapture(): void {
    if (this.captureHandle) {
      try {
        this.nativeBinding.stopCapture(this.captureHandle);
      } catch (error) {
        console.error('Failed to stop Windows audio capture:', error);
      }
    }
  }

  destroy(): void {
    if (this.captureHandle) {
      try {
        this.nativeBinding.destroyCapture(this.captureHandle);
        this.captureHandle = null;
      } catch (error) {
        console.error('Failed to destroy Windows audio capture:', error);
      }
    }
  }
}

class MacOSAudioCapture extends EventEmitter implements NativeAudioCapture {
  private nativeBinding: any;
  private captureHandle: any = null;

  constructor() {
    super();
    try {
      this.nativeBinding = require('../../build/Release/macos_capture.node');
    } catch (error) {
      console.error('Failed to load macOS audio capture module:', error);
      throw error;
    }
  }

  initialize(): boolean {
    try {
      this.captureHandle = this.nativeBinding.createMacOSCapture();
      return this.captureHandle !== null;
    } catch (error) {
      console.error('Failed to initialize macOS audio capture:', error);
      return false;
    }
  }

  startCapture(): boolean {
    if (!this.captureHandle) {
      console.error('Audio capture not initialized');
      return false;
    }

    try {
      // Set up audio data callback
      this.nativeBinding.setAudioCallback((audioData: Buffer) => {
        this.emit('audioData', audioData);
      });

      return this.nativeBinding.startMacOSCapture(this.captureHandle);
    } catch (error) {
      console.error('Failed to start macOS audio capture:', error);
      return false;
    }
  }

  stopCapture(): void {
    if (this.captureHandle) {
      try {
        this.nativeBinding.stopMacOSCapture(this.captureHandle);
      } catch (error) {
        console.error('Failed to stop macOS audio capture:', error);
      }
    }
  }

  destroy(): void {
    if (this.captureHandle) {
      try {
        this.nativeBinding.destroyMacOSCapture(this.captureHandle);
        this.captureHandle = null;
      } catch (error) {
        console.error('Failed to destroy macOS audio capture:', error);
      }
    }
  }
}

export function createNativeAudioCapture(): NativeAudioCapture | null {
  try {
    if (process.platform === 'win32') {
      return new WindowsAudioCapture();
    } else if (process.platform === 'darwin') {
      return new MacOSAudioCapture();
    } else {
      console.error('Unsupported platform for native audio capture');
      return null;
    }
  } catch (error) {
    console.error('Failed to create native audio capture:', error);
    return null;
  }
}

export { NativeAudioCapture };
