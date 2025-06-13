
/* global chrome */

/**
 * Manages floating UI elements (triggers and buttons)
 */
export class FloatingUI {
  constructor() {
    this.floatingTrigger = null;
    this.manualTriggerButton = null;
  }

  // Create a manual trigger button for starting transcription
  createManualTriggerButton() {
    if (this.manualTriggerButton) return this.manualTriggerButton;
    
    this.manualTriggerButton = document.createElement('div');
    this.manualTriggerButton.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 120px;
      height: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2147483647;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      font-size: 12px;
      color: white;
      font-weight: 600;
      backdrop-filter: blur(10px);
      opacity: 0.9;
      border: 1px solid rgba(255,255,255,0.2);
    `;
    
    this.manualTriggerButton.innerHTML = '🎤 Start Recording';
    this.manualTriggerButton.title = 'Click to start audio transcription';
    
    // Hover effects
    this.manualTriggerButton.addEventListener('mouseenter', () => {
      this.manualTriggerButton.style.opacity = '1';
      this.manualTriggerButton.style.transform = 'scale(1.05) translateY(-2px)';
      this.manualTriggerButton.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
    });
    
    this.manualTriggerButton.addEventListener('mouseleave', () => {
      this.manualTriggerButton.style.opacity = '0.9';
      this.manualTriggerButton.style.transform = 'scale(1) translateY(0px)';
      this.manualTriggerButton.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    });
    
    document.documentElement.appendChild(this.manualTriggerButton);
    return this.manualTriggerButton;
  }

  // Create a subtle floating trigger element
  createFloatingTrigger() {
    if (this.floatingTrigger) return this.floatingTrigger;
    
    this.floatingTrigger = document.createElement('div');
    this.floatingTrigger.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      background: rgba(52, 168, 83, 0.9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2147483647;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      font-size: 18px;
      backdrop-filter: blur(10px);
      opacity: 0.7;
    `;
    
    this.floatingTrigger.innerHTML = '🎤';
    this.floatingTrigger.title = 'Start InterviewAce Transcription';
    
    // Hover effects
    this.floatingTrigger.addEventListener('mouseenter', () => {
      this.floatingTrigger.style.opacity = '1';
      this.floatingTrigger.style.transform = 'scale(1.1)';
    });
    
    this.floatingTrigger.addEventListener('mouseleave', () => {
      this.floatingTrigger.style.opacity = '0.7';
      this.floatingTrigger.style.transform = 'scale(1)';
    });
    
    document.documentElement.appendChild(this.floatingTrigger);
    return this.floatingTrigger;
  }

  updateButtonState(state) {
    if (!this.manualTriggerButton) return;
    
    switch (state) {
      case 'active':
        this.manualTriggerButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)';
        this.manualTriggerButton.innerHTML = '🔴 Recording';
        this.manualTriggerButton.title = 'Transcription Active - Click to stop';
        break;
      case 'processing':
        this.manualTriggerButton.style.background = 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';
        this.manualTriggerButton.innerHTML = '🟡 Processing';
        this.manualTriggerButton.title = 'Processing Audio...';
        break;
      case 'stopped':
        this.manualTriggerButton.style.background = 'linear-gradient(135deg, #757575 0%, #424242 100%)';
        this.manualTriggerButton.innerHTML = '⚪ Stopped';
        this.manualTriggerButton.title = 'Transcription Stopped';
        break;
      case 'error':
        this.manualTriggerButton.style.background = 'linear-gradient(135deg, #f44336 0%, #c62828 100%)';
        this.manualTriggerButton.innerHTML = '❌ Error';
        this.manualTriggerButton.title = 'Error - Click to retry';
        break;
      default:
        this.manualTriggerButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        this.manualTriggerButton.innerHTML = '🎤 Start Recording';
        this.manualTriggerButton.title = 'Click to start audio transcription';
    }
  }

  updateTriggerState(state) {
    if (!this.floatingTrigger) return;
    
    switch (state) {
      case 'active':
        this.floatingTrigger.style.background = 'rgba(25, 118, 210, 0.9)';
        this.floatingTrigger.innerHTML = '🔵';
        this.floatingTrigger.title = 'InterviewAce Transcription Active';
        break;
      case 'processing':
        this.floatingTrigger.style.background = 'rgba(255, 193, 7, 0.9)';
        this.floatingTrigger.innerHTML = '🟡';
        this.floatingTrigger.title = 'Processing Audio...';
        break;
      case 'stopped':
        this.floatingTrigger.style.background = 'rgba(117, 117, 117, 0.9)';
        this.floatingTrigger.innerHTML = '⚪';
        this.floatingTrigger.title = 'Transcription Stopped';
        break;
      default:
        this.floatingTrigger.style.background = 'rgba(52, 168, 83, 0.9)';
        this.floatingTrigger.innerHTML = '🎤';
        this.floatingTrigger.title = 'Start InterviewAce Transcription';
    }
  }

  hideTrigger() {
    if (this.floatingTrigger) {
      this.floatingTrigger.style.display = 'none';
    }
  }

  showTrigger() {
    if (this.floatingTrigger) {
      this.floatingTrigger.style.display = 'flex';
    } else {
      this.createFloatingTrigger();
    }
  }

  hideButton() {
    if (this.manualTriggerButton) {
      this.manualTriggerButton.style.display = 'none';
    }
  }

  showButton() {
    if (this.manualTriggerButton) {
      this.manualTriggerButton.style.display = 'flex';
    } else {
      this.createManualTriggerButton();
    }
  }

  addButtonClickHandler(handler) {
    if (this.manualTriggerButton) {
      this.manualTriggerButton.addEventListener('click', handler);
    }
  }

  addTriggerClickHandler(handler) {
    if (this.floatingTrigger) {
      this.floatingTrigger.addEventListener('click', handler);
    }
  }

  setupScrollHandler() {
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (this.floatingTrigger) {
        this.floatingTrigger.style.opacity = '0.3';
      }
      if (this.manualTriggerButton) {
        this.manualTriggerButton.style.opacity = '0.6';
      }
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (this.floatingTrigger) {
          this.floatingTrigger.style.opacity = '0.7';
        }
        if (this.manualTriggerButton) {
          this.manualTriggerButton.style.opacity = '0.9';
        }
      }, 1000);
    });
  }
}
