import { spawn, ChildProcess } from 'child_process';
import { WebSocket } from 'ws';
import { createNativeAudioCapture, NativeAudioCapture } from './nativeAudioBridge';
import { DriverDetector, DriverStatus } from './driverDetection';
import { DriverInstaller } from './driverInstaller';

export class AudioCaptureManager {
  private nativeCapture: NativeAudioCapture | null = null;
  private supabaseWs: WebSocket | null = null;
  private isCapturing = false;
  private sessionId: string | null = null;
  private driverStatus: DriverStatus | null = null;

  async initialize(): Promise<void> {
    // Check driver status on initialization
    await this.checkDriverStatus();
  }

  async checkDriverStatus(): Promise<DriverStatus> {
    this.driverStatus = await DriverDetector.getCurrentPlatformDriver();
    console.log('Driver status:', this.driverStatus);
    return this.driverStatus;
  }

  async startCapture(sessionId: string, jwt: string, supabaseConfig: any) {
    if (this.isCapturing) {
      throw new Error('Capture already in progress');
    }

    // Verify driver is installed before starting capture
    const driverStatus = await this.checkDriverStatus();
    if (!driverStatus.installed) {
      throw new Error(`Virtual audio driver not installed. Please install ${DriverDetector.getDriverName()} first.`);
    }

    this.sessionId = sessionId;

    try {
      // Connect to Supabase WebSocket first
      await this.connectToSupabase(supabaseConfig, sessionId, jwt);
      
      // Initialize native audio capture
      this.nativeCapture = createNativeAudioCapture();
      if (!this.nativeCapture) {
        throw new Error('Failed to create native audio capture');
      }

      if (!this.nativeCapture.initialize()) {
        throw new Error('Failed to initialize native audio capture');
      }

      // Set up audio data handler
      this.nativeCapture.on('audioData', (audioData: Buffer) => {
        this.sendAudioToSupabase(audioData);
      });

      // Start capturing
      if (!this.nativeCapture.startCapture()) {
        throw new Error('Failed to start native audio capture');
      }

      this.isCapturing = true;
      console.log('Native audio capture started successfully');
      
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      await this.cleanup();
      throw error;
    }
  }

  async stopCapture() {
    if (!this.isCapturing) return;

    console.log('Stopping native audio capture...');
    
    try {
      // Stop native capture
      if (this.nativeCapture) {
        this.nativeCapture.stopCapture();
        this.nativeCapture.destroy();
        this.nativeCapture = null;
      }

      // Close Supabase connection
      if (this.supabaseWs) {
        this.supabaseWs.close();
        this.supabaseWs = null;
      }

      this.isCapturing = false;
      this.sessionId = null;
      console.log('Native audio capture stopped');
      
    } catch (error) {
      console.error('Error stopping audio capture:', error);
    }
  }

  getStatus() {
    return {
      isCapturing: this.isCapturing,
      sessionId: this.sessionId,
      hasNativeSupport: this.nativeCapture !== null,
      platform: process.platform,
      driverStatus: this.driverStatus
    };
  }

  getDriverInstaller(): DriverInstaller {
    return DriverInstaller.getInstance();
  }

  private async connectToSupabase(config: any, sessionId: string, jwt: string) {
    const wsUrl = `${config.url.replace('https://', 'wss://')}/realtime/v1/websocket`;
    
    return new Promise<void>((resolve, reject) => {
      this.supabaseWs = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'apikey': config.key
        }
      });

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      this.supabaseWs.onopen = () => {
        clearTimeout(timeout);
        console.log('Connected to Supabase WebSocket');
        
        // Join the session channel
        this.supabaseWs!.send(JSON.stringify({
          topic: `session:${sessionId}`,
          event: 'phx_join',
          payload: { access_token: jwt },
          ref: Date.now().toString()
        }));
        
        resolve();
      };

      this.supabaseWs.onerror = (error) => {
        clearTimeout(timeout);
        console.error('Supabase WebSocket error:', error);
        reject(new Error('Failed to connect to Supabase WebSocket'));
      };

      this.supabaseWs.onclose = () => {
        console.log('Supabase WebSocket connection closed');
      };

      this.supabaseWs.onmessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? event.data : Buffer.from(event.data).toString();
          const message = JSON.parse(data);
          console.log('Received message from Supabase:', message);
        } catch (error) {
          console.error('Failed to parse Supabase message:', error);
        }
      };
    });
  }

  private sendAudioToSupabase(audioData: Buffer) {
    if (!this.supabaseWs || this.supabaseWs.readyState !== WebSocket.OPEN) {
      console.warn('Supabase WebSocket not connected, dropping audio data');
      return;
    }

    try {
      // Send Opus audio data to speech-to-text function
      const message = JSON.stringify({
        topic: 'realtime',
        event: 'audio_chunk',
        payload: {
          session_id: this.sessionId,
          audio_data: audioData.toString('base64'),
          format: 'opus',
          timestamp: Date.now(),
          sample_rate: 16000,
          channels: 1
        },
        ref: Date.now().toString()
      });

      this.supabaseWs.send(message);
    } catch (error) {
      console.error('Failed to send audio data to Supabase:', error);
    }
  }

  private async cleanup() {
    try {
      if (this.nativeCapture) {
        this.nativeCapture.destroy();
        this.nativeCapture = null;
      }

      if (this.supabaseWs) {
        this.supabaseWs.close();
        this.supabaseWs = null;
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}
