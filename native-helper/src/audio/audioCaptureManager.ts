
import { spawn, ChildProcess } from 'child_process';
import { WebSocket } from 'ws';

export class AudioCaptureManager {
  private captureProcess: ChildProcess | null = null;
  private supabaseWs: WebSocket | null = null;
  private isCapturing = false;

  async startCapture(sessionId: string, jwt: string, supabaseConfig: any) {
    if (this.isCapturing) {
      throw new Error('Capture already in progress');
    }

    try {
      // Connect to Supabase WebSocket
      await this.connectToSupabase(supabaseConfig, sessionId, jwt);
      
      // Start native audio capture based on platform
      if (process.platform === 'win32') {
        await this.startWindowsCapture();
      } else if (process.platform === 'darwin') {
        await this.startMacOSCapture();
      } else {
        throw new Error('Unsupported platform');
      }

      this.isCapturing = true;
      console.log('Audio capture started');
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw error;
    }
  }

  async stopCapture() {
    if (!this.isCapturing) return;

    // Stop capture process
    if (this.captureProcess) {
      this.captureProcess.kill();
      this.captureProcess = null;
    }

    // Close Supabase connection
    if (this.supabaseWs) {
      this.supabaseWs.close();
      this.supabaseWs = null;
    }

    this.isCapturing = false;
    console.log('Audio capture stopped');
  }

  private async connectToSupabase(config: any, sessionId: string, jwt: string) {
    const wsUrl = `${config.url.replace('https://', 'wss://')}/realtime/v1/websocket`;
    this.supabaseWs = new WebSocket(wsUrl);

    return new Promise<void>((resolve, reject) => {
      this.supabaseWs!.onopen = () => {
        // Join the session channel
        this.supabaseWs!.send(JSON.stringify({
          topic: `session:${sessionId}`,
          event: 'phx_join',
          payload: { access_token: jwt },
          ref: '1'
        }));
        resolve();
      };

      this.supabaseWs!.onerror = (error) => {
        reject(new Error('Failed to connect to Supabase WebSocket'));
      };
    });
  }

  private async startWindowsCapture() {
    // This would spawn a native Windows process using WASAPI
    // For now, we'll simulate with a placeholder
    this.captureProcess = spawn('native-windows-capture.exe', [
      '--device', 'VB-Cable',
      '--format', 'opus',
      '--rate', '16000'
    ]);

    this.captureProcess.stdout?.on('data', (data) => {
      // Opus-encoded audio data
      this.sendAudioToSupabase(data);
    });

    this.captureProcess.on('error', (error) => {
      console.error('Windows capture process error:', error);
    });
  }

  private async startMacOSCapture() {
    // This would spawn a native macOS process using AVAudioEngine
    // For now, we'll simulate with a placeholder
    this.captureProcess = spawn('native-macos-capture', [
      '--device', 'BlackHole 2ch',
      '--format', 'opus',
      '--rate', '16000'
    ]);

    this.captureProcess.stdout?.on('data', (data) => {
      // Opus-encoded audio data
      this.sendAudioToSupabase(data);
    });

    this.captureProcess.on('error', (error) => {
      console.error('macOS capture process error:', error);
    });
  }

  private sendAudioToSupabase(audioData: Buffer) {
    if (!this.supabaseWs) return;

    // Send Opus audio data to speech-to-text function
    this.supabaseWs.send(JSON.stringify({
      topic: 'audio-stream',
      event: 'audio_chunk',
      payload: {
        audio: audioData.toString('base64'),
        format: 'opus',
        timestamp: Date.now()
      }
    }));
  }
}
