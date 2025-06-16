/**
 * Stable Stealth Transparent Overlay
 * 
 * Lightweight version with minimal resource usage
 * Uses your proven stealth techniques
 * Optimized for stability and performance
 */

const overlay = require('./build/Release/layeredoverlay');
const process = require('process');
const readline = require('readline');

// Simple configuration
const config = {
  width: 300,              
  height: 100,             
  initialX: 640,           
  initialY: 40,            
  moveStep: 15,            
  refreshRate: 2000        // Slower refresh rate to reduce CPU usage
};

// State
let currentX = config.initialX;
let currentY = config.initialY;
let isVisible = true;
let updateInterval = null;
let lastUpdateTime = 0;

console.log('Starting Stable Stealth Overlay...');

// Initialize overlay window
function initialize() {
  console.log(`Initializing at position (${currentX}, ${currentY})`);
  
  const success = overlay.init(currentX, currentY, config.width, config.height);
  if (!success) {
    console.error('Failed to initialize overlay');
    return false;
  }
  
  // Show the overlay
  overlay.show(true);
  
  // Initial content update
  updateContent();
  
  // Set up content refresh interval - less frequent to reduce CPU usage
  updateInterval = setInterval(() => {
    // Only update if sufficient time has passed to prevent excessive updates
    const now = Date.now();
    if (now - lastUpdateTime >= config.refreshRate) {
      updateContent();
      lastUpdateTime = now;
    }
  }, config.refreshRate);
  
  return true;
}

// Update content with minimal processing
function updateContent() {
  if (!isVisible) return;
  
  const time = new Date().toLocaleTimeString();
  const content = `${time}\n\nArrow keys: Move\nT: Toggle\nQ: Quit`;
  
  try {
    overlay.update(content);
  } catch (err) {
    console.error('Error updating content:', err);
  }
}

// Move window with throttling to prevent rapid successive moves
let isMoveInProgress = false;
function moveWindow(deltaX, deltaY) {
  if (isMoveInProgress) return;
  
  isMoveInProgress = true;
  
  // Calculate new position
  currentX += deltaX;
  currentY += deltaY;
  
  console.log(`Moving to (${currentX}, ${currentY})`);
  
  // Recreate at new position
  clearInterval(updateInterval);
  overlay.show(false);
  overlay.shutdown();
  
  // Short delay before recreation
  setTimeout(() => {
    if (initialize()) {
      console.log('Overlay repositioned');
    }
    isMoveInProgress = false;
  }, 200);
}

// Toggle visibility
function toggleVisibility() {
  isVisible = !isVisible;
  overlay.show(isVisible);
  console.log(`Visibility: ${isVisible ? 'Visible' : 'Hidden'}`);
}

// Setup minimal keyboard handling
function setupKeyboard() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  
  process.stdin.on('keypress', (str, key) => {
    if (key) {
      // Navigation
      if (key.name === 'up') moveWindow(0, -config.moveStep);
      if (key.name === 'down') moveWindow(0, config.moveStep);
      if (key.name === 'left') moveWindow(-config.moveStep, 0);
      if (key.name === 'right') moveWindow(config.moveStep, 0);
      
      // Visibility
      if (key.name === 't') toggleVisibility();
      
      // Exit
      if ((key.ctrl && key.name === 'c') || key.name === 'q') {
        cleanup();
        process.exit(0);
      }
    }
  });
}

// Cleanup
function cleanup() {
  console.log('Shutting down...');
  clearInterval(updateInterval);
  overlay.show(false);
  overlay.shutdown();
}

// Setup cleanup handlers
function setupCleanupHandlers() {
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

// Main entry point
function start() {
  if (initialize()) {
    console.log('Stealth overlay initialized');
    setupKeyboard();
    setupCleanupHandlers();
    
    console.log(`
Controls:
- Arrow keys: Move overlay
- T: Toggle visibility
- Q or Ctrl+C: Quit
`);
  } else {
    console.error('Failed to initialize. Exiting...');
    process.exit(1);
  }
}

// Start the application
start();
