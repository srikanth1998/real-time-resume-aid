/**
 * Stealth Overlay Preload Script
 * 
 * Exposes secure APIs to the renderer process for the glass overlay.
 * Handles IPC communication between the renderer and main process.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Trigger an action from the overlay UI
   * @param {string} action - The action type ('accept', 'decline', 'pause')
   */
  triggerAction: (action) => {
    ipcRenderer.send('trigger-action', action);
  },
  
  /**
   * Forward a keypress event from the renderer to the main process
   * @param {string} key - The key that was pressed
   */
  keyPressed: (key) => {
    ipcRenderer.send('key-pressed', key);
  },
  
  /**
   * Update the overlay opacity value
   * @param {number} value - Opacity value between 0-100
   */
  updateOpacity: (value) => {
    ipcRenderer.send('opacity-changed', value);
  },
  
  /**
   * Register a callback to handle click-through mode changes
   * @param {function} callback - Function to call when click-through mode changes
   */
  onClickThroughChanged: (callback) => {
    ipcRenderer.on('click-through-changed', (_, value) => callback(value));
  },

  /**
   * Get current system information
   * @returns {Promise<Object>} - Promise that resolves with system info
   */
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  /**
   * Request the overlay position to be updated
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  setPosition: (x, y) => {
    ipcRenderer.send('set-position', { x, y });
  }
});

// Log when preload script has initialized
console.log('Stealth overlay preload script initialized');
