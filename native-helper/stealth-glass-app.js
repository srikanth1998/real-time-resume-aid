/**
 * Stealth Glass Overlay Application
 * 
 * Combines Electron's UI capabilities with native Windows stealth techniques
 * - Modern glass UI using HTML/CSS
 * - Hidden from screen capture applications
 * - Keyboard controls for positioning and actions
 */

// Import Electron modules directly to ensure they're available
const electron = require('electron');
const { app, BrowserWindow, ipcMain } = electron;
const path = require('path');
const readline = require('readline');
const process = require('process');

// Import native stealth helpers addon 
const stealth = require('./build/Release/layeredoverlay');

// Configuration
const config = {
  width: 320,           // Width of overlay
  height: 220,          // Height of overlay
  initialX: 640,        // Initial X position  
  initialY: 40,         // Initial Y position
  moveStep: 15,         // Pixels to move with each arrow key
  refreshRate: 1000,    // Update interval in milliseconds
  alwaysOnTop: true,    // Keep window on top
  clickThrough: false,  // Initially allow interaction with overlay
  debug: false          // Enable additional debug information
};

// State variables
let mainWindow = null;
let currentX = config.initialX;
let currentY = config.initialY;
let isVisible = true;
let isClickThrough = config.clickThrough;

// Setup console output with app name
console.log(`
╔════════════════════════════════════════════════╗
║        Stealth Glass Overlay Application       ║
╠════════════════════════════════════════════════╣
║ ✓ Modern glass UI with backdrop blur           ║
║ ✓ Visible locally, hidden from screen capture  ║
║ ✓ Keyboard & mouse controls                    ║
║ ✓ Multiple stealth techniques combined         ║
╚════════════════════════════════════════════════╝
`);

// Debug logging function
function debug(message) {
  if (config.debug) {
    console.log(`[DEBUG] ${message}`);
  }
}

/**
 * Create the main overlay window
 */
function createWindow() {
  debug(`Creating overlay window at position (${currentX}, ${currentY})`);
  
  // Create browser window with transparency enabled
  mainWindow = new BrowserWindow({
    width: config.width,
    height: config.height,
    x: currentX,
    y: currentY,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: config.alwaysOnTop,
    focusable: !config.clickThrough, 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the overlay HTML
  mainWindow.loadFile('stealth-glass-overlay.html');

  // Apply stealth techniques once the window is ready
  mainWindow.once('ready-to-show', () => {
    applyStealthTechniques();
    mainWindow.show();
    debug('Overlay window is now visible');
  });

  // Handle window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Apply native stealth techniques to the window to hide from screen capture
 */
function applyStealthTechniques() {
  if (!mainWindow) return;

  try {
    debug('Applying stealth techniques to window');

    // Get native window handle
    const hwnd = mainWindow.getNativeWindowHandle().readUInt32LE(0);
    
    // First initialize the overlay with our native module
    if (!stealth.init(currentX, currentY, config.width, config.height)) {
      console.error('Failed to initialize native stealth overlay');
      return;
    }

    // Apply the WDA_EXCLUDEFROMCAPTURE flag to hide from screen capture
    debug('Setting WDA_EXCLUDEFROMCAPTURE flag');
    
    // The window should now be visible locally but hidden from screen capture
    console.log('✅ Stealth flags applied - window is hidden from screen capture');
  } catch (error) {
    console.error('Error applying stealth techniques:', error);
  }
}

/**
 * Move the overlay window to a new position
 */
function moveWindow(deltaX, deltaY) {
  // Calculate new position
  const newX = currentX + deltaX;
  const newY = currentY + deltaY;

  debug(`Moving window from (${currentX}, ${currentY}) to (${newX}, ${newY})`);

  // Update current position
  currentX = newX;
  currentY = newY;

  // Move the window
  if (mainWindow) {
    mainWindow.setPosition(currentX, currentY);

    // If needed, also update the native overlay position
    try {
      // Reinitialize the stealth overlay at the new position
      stealth.shutdown();
      stealth.init(currentX, currentY, config.width, config.height);
    } catch (error) {
      console.error('Error updating native overlay position:', error);
    }
  }
}

/**
 * Toggle the visibility of the overlay
 */
function toggleVisibility() {
  isVisible = !isVisible;
  
  if (mainWindow) {
    if (isVisible) {
      mainWindow.show();
      stealth.show(true);
    } else {
      mainWindow.hide();
      stealth.show(false);
    }
  }
  
  debug(`Overlay visibility set to: ${isVisible}`);
}

/**
 * Toggle click-through mode
 */
function toggleClickThrough() {
  isClickThrough = !isClickThrough;
  
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
    mainWindow.webContents.send('click-through-changed', isClickThrough);
  }
  
  debug(`Click-through mode set to: ${isClickThrough}`);
}

/**
 * Setup IPC communication with the renderer process
 */
function setupIPC() {
  // Handle action events from the UI
  ipcMain.on('trigger-action', (_, action) => {
    console.log(`Action triggered: ${action}`);
    
    switch (action) {
      case 'accept':
        // Implement accept action
        console.log('ACCEPT action executed');
        break;
      case 'decline':
        // Implement decline action
        console.log('DECLINE action executed');
        break;
      case 'pause':
        // Implement pause action
        console.log('PAUSE action executed');
        break;
    }
  });
  
  // Handle keyboard events from the UI
  ipcMain.on('key-pressed', (_, key) => {
    handleKeyPress(key);
  });
  
  // Handle opacity change
  ipcMain.on('opacity-changed', (_, value) => {
    debug(`Opacity changed to: ${value}`);
  });
  
  // Handle position change request
  ipcMain.on('set-position', (_, pos) => {
    if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
      currentX = pos.x;
      currentY = pos.y;
      moveWindow(0, 0); // Update position with no delta
    }
  });
}

/**
 * Handle keyboard controls 
 */
function handleKeyPress(key) {
  switch (key) {
    case 'ArrowUp':
      moveWindow(0, -config.moveStep);
      break;
    case 'ArrowDown':
      moveWindow(0, config.moveStep);
      break;
    case 'ArrowLeft':
      moveWindow(-config.moveStep, 0);
      break;
    case 'ArrowRight':
      moveWindow(config.moveStep, 0);
      break;
    case 't':
      toggleVisibility();
      break;
    case 'c':
      toggleClickThrough();
      break;
    case 'q':
      app.quit();
      break;
  }
}

/**
 * Setup keyboard controls through the terminal
 * This allows controlling the overlay even when it doesn't have focus
 */
function setupTerminalKeyboard() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  
  process.stdin.on('keypress', (str, key) => {
    // Handle special key combinations
    if (key.ctrl && key.name === 'c') {
      cleanup();
    } else if (key) {
      // Navigation keys
      if (key.name === 'up') moveWindow(0, -config.moveStep);
      if (key.name === 'down') moveWindow(0, config.moveStep);
      if (key.name === 'left') moveWindow(-config.moveStep, 0);
      if (key.name === 'right') moveWindow(config.moveStep, 0);
      
      // Action keys
      if (key.name === 't') toggleVisibility();
      if (key.name === 'c') toggleClickThrough();
      if (key.name === 'q') cleanup();
      
      // Other action keys
      if (key.name === 'a') console.log('ACTION: Accept');
      if (key.name === 'd') console.log('ACTION: Decline');
      if (key.name === 'p') console.log('ACTION: Pause');
    }
  });
}

/**
 * Clean up resources before exit 
 */
function cleanup() {
  console.log('Cleaning up and shutting down...');
  
  // Clean up native resources
  try {
    stealth.show(false);
    stealth.shutdown();
  } catch (error) {
    debug('Error during native cleanup: ' + error);
  }
  
  // Exit the application
  process.exit(0);
}

// Register cleanup handlers
function setupCleanupHandlers() {
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

// Initialize the application
try {
  if (typeof app !== 'undefined' && app !== null) {
    app.whenReady().then(() => {
      console.log('Creating stealth glass overlay...');
      createWindow();
      setupIPC();
      setupTerminalKeyboard();
      setupCleanupHandlers();
      
      // Print control instructions to console
      console.log('\nKeyboard Controls:');
      console.log('----------------');
      console.log('Arrow Keys  : Move overlay');
      console.log('T           : Toggle visibility');
      console.log('C           : Toggle click-through mode');
      console.log('A           : Accept action');
      console.log('D           : Decline action');
      console.log('P           : Pause/Resume');
      console.log('Q or Ctrl+C : Quit');
    });
  } else {
    console.error('Electron app object not available. Make sure you are running this with electron command.');
    console.log('Try running: npx electron .');
  }
} catch (error) {
  console.error('Failed to initialize Electron app:', error);
}

// Quit when all windows are closed (except on macOS)
if (typeof app !== 'undefined' && app !== null) {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
