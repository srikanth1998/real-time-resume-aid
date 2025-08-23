
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

  static async getCurrentPlatformDriver(): Promise<DriverStatus> {
    if (process.platform === 'win32') {
      return this.detectWindowsVBCable();
    } else {
      return { 
        installed: false, 
        error: 'Unsupported platform - only Windows is supported' 
      };
    }
  }

  static getDriverDownloadUrl(): string {
    if (process.platform === 'win32') {
      return 'https://vb-audio.com/Cable/';
    }
    return '';
  }

  static getDriverName(): string {
    if (process.platform === 'win32') {
      return 'VB-Cable';
    }
    return 'Unknown Driver';
  }
}
