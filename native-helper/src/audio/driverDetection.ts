
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DriverStatus {
  installed: boolean;
  version?: string;
  deviceName?: string;
  error?: string;
}

export class DriverDetector {
  
  static async detectWindowsVBCable(): Promise<DriverStatus> {
    try {
      // Check for VB-Cable in Windows audio devices using PowerShell
      const { stdout } = await execAsync(`
        powershell -Command "
          Get-WmiObject -Class Win32_SoundDevice | 
          Where-Object { $_.Name -like '*VB-Audio*' -or $_.Name -like '*CABLE*' } | 
          Select-Object Name, Status
        "
      `);

      if (stdout.includes('VB-Audio') || stdout.includes('CABLE')) {
        const deviceName = stdout.match(/Name\s+:\s+(.+)/)?.[1]?.trim();
        return {
          installed: true,
          deviceName: deviceName || 'VB-Audio Virtual Cable',
          version: 'Unknown'
        };
      }

      return { installed: false };
    } catch (error) {
      console.error('Error detecting VB-Cable:', error);
      return { 
        installed: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async detectMacOSBlackHole(): Promise<DriverStatus> {
    try {
      // Check for BlackHole using system_profiler
      const { stdout } = await execAsync('system_profiler SPAudioDataType');
      
      if (stdout.includes('BlackHole')) {
        // Extract version if possible
        const versionMatch = stdout.match(/BlackHole.*?(\d+\.\d+\.\d+)/);
        return {
          installed: true,
          deviceName: 'BlackHole',
          version: versionMatch?.[1] || 'Unknown'
        };
      }

      // Also check using audiodevice list (if available)
      try {
        const { stdout: deviceList } = await execAsync('ls /System/Library/Extensions/ | grep -i blackhole');
        if (deviceList.trim()) {
          return {
            installed: true,
            deviceName: 'BlackHole',
            version: 'Unknown'
          };
        }
      } catch {
        // Ignore error, primary check above is more reliable
      }

      return { installed: false };
    } catch (error) {
      console.error('Error detecting BlackHole:', error);
      return { 
        installed: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getCurrentPlatformDriver(): Promise<DriverStatus> {
    if (process.platform === 'win32') {
      return this.detectWindowsVBCable();
    } else if (process.platform === 'darwin') {
      return this.detectMacOSBlackHole();
    } else {
      return { 
        installed: false, 
        error: 'Unsupported platform' 
      };
    }
  }

  static getDriverDownloadUrl(): string {
    if (process.platform === 'win32') {
      return 'https://vb-audio.com/Cable/';
    } else if (process.platform === 'darwin') {
      return 'https://github.com/ExistentialAudio/BlackHole/releases';
    }
    return '';
  }

  static getDriverName(): string {
    if (process.platform === 'win32') {
      return 'VB-Cable';
    } else if (process.platform === 'darwin') {
      return 'BlackHole';
    }
    return 'Unknown Driver';
  }
}
