
import { shell } from 'electron';
import { DriverDetector, DriverStatus } from './driverStub';

export interface InstallationStep {
  id: string;
  title: string;
  description: string;
  action?: () => Promise<void>;
  completed: boolean;
}

export class DriverInstaller {
  private static instance: DriverInstaller;
  private installationSteps: InstallationStep[] = [];
  private onStatusChange?: (steps: InstallationStep[]) => void;

  static getInstance(): DriverInstaller {
    if (!DriverInstaller.instance) {
      DriverInstaller.instance = new DriverInstaller();
    }
    return DriverInstaller.instance;
  }

  setStatusChangeCallback(callback: (steps: InstallationStep[]) => void) {
    this.onStatusChange = callback;
  }

  async initializeInstallationFlow(): Promise<InstallationStep[]> {
    const platform = process.platform;
    
    if (platform === 'win32') {
      this.installationSteps = await this.getWindowsInstallationSteps();
    } else {
      throw new Error('Unsupported platform for driver installation - only Windows is supported');
    }

    return this.installationSteps;
  }

  private async getWindowsInstallationSteps(): Promise<InstallationStep[]> {
    const driverStatus = await DriverDetector.detectWindowsVBCable();
    
    return [
      {
        id: 'download',
        title: 'Download VB-Cable',
        description: 'Download the VB-Cable virtual audio driver from the official website',
        action: async () => {
          await shell.openExternal('https://vb-audio.com/Cable/');
        },
        completed: false
      },
      {
        id: 'install',
        title: 'Install VB-Cable',
        description: 'Run the downloaded installer as Administrator and follow the setup wizard',
        completed: driverStatus.installed
      },
      {
        id: 'restart',
        title: 'Restart Computer',
        description: 'Restart your computer to complete the driver installation',
        completed: driverStatus.installed
      },
      {
        id: 'verify',
        title: 'Verify Installation',
        description: 'Check that VB-Cable appears in your audio devices',
        action: async () => {
          await this.verifyInstallation();
        },
        completed: driverStatus.installed
      }
    ];
  }

  async executeStep(stepId: string): Promise<void> {
    const step = this.installationSteps.find(s => s.id === stepId);
    if (!step || !step.action) return;

    try {
      await step.action();
      step.completed = true;
      this.notifyStatusChange();
    } catch (error) {
      console.error(`Failed to execute step ${stepId}:`, error);
      throw error;
    }
  }

  async verifyInstallation(): Promise<DriverStatus> {
    const status = await DriverDetector.getCurrentPlatformDriver();
    
    if (status.installed) {
      // Mark verification step as completed
      const verifyStep = this.installationSteps.find(s => s.id === 'verify');
      if (verifyStep) {
        verifyStep.completed = true;
        this.notifyStatusChange();
      }
    }

    return status;
  }

  async refreshStepStatus(): Promise<void> {
    const currentStatus = await DriverDetector.getCurrentPlatformDriver();
    
    if (currentStatus.installed) {
      // Mark all steps as completed if driver is installed
      this.installationSteps.forEach(step => {
        step.completed = true;
      });
      this.notifyStatusChange();
    }
  }

  getInstallationSteps(): InstallationStep[] {
    return this.installationSteps;
  }

  isInstallationComplete(): boolean {
    return this.installationSteps.every(step => step.completed);
  }

  private notifyStatusChange(): void {
    if (this.onStatusChange) {
      this.onStatusChange([...this.installationSteps]);
    }
  }
  
  // Get platform-specific installation instructions
  getDetailedInstructions(): string[] {
    if (process.platform === 'win32') {
      return [
        '1. Download VB-Cable from https://vb-audio.com/Cable/',
        '2. Right-click the installer and select "Run as Administrator"',
        '3. Follow the installation wizard prompts',
        '4. Restart your computer when prompted',
        '5. Open Sound settings and verify "CABLE Input" and "CABLE Output" appear',
        '6. Set "CABLE Input" as your default recording device if needed'
      ];
    }
    return ['Platform not supported - only Windows is supported'];
  }
}
