/**
 * Enhanced Stealth Transparent Overlay
 * 
 * Features:
 * - Fully stealth (invisible to screen capture)
 * - Glass-effect styling with adjustable transparency
 * - Keyboard controls for positioning and actions
 * - Minimal visual footprint
 * - Toggle visibility on demand
 */

const overlay = require('./build/Release/layeredoverlay');
const process = require('process');
const readline = require('readline');

// Configuration
const config = {
  width: 300,              // Width of overlay
  height: 100,             // Height of overlay
  initialX: 640,           // Initial X position  
  initialY: 40,            // Initial Y position
  moveStep: 15,            // Pixels to move with each arrow key
  refreshRate: 1000,       // Update interval in milliseconds
  showCoordinates: false,  // Whether to show position coordinates
  showBorders: true        // Whether to show subtle borders
};

// State variables
let currentX = config.initialX;
let currentY = config.initialY;
let isVisible = true;
let updateInterval = null;

console.log('▶️ Starting Enhanced Stealth Transparent Overlay');

// Initialize the overlay window
function initializeOverlay() {
  console.log(`Initializing overlay at x=${currentX}, y=${currentY}, width=${config.width}, height=${config.height}`);
  
  const initialized = overlay.init(currentX, currentY, config.width, config.height);
  if (!initialized) {
    console.error('❌ Failed to initialize overlay window');
    process.exit(1);
  }
  
  // Make overlay visible
  overlay.show(true);
  
  // Setup content refresh interval
  updateInterval = setInterval(updateContent, config.refreshRate);
  
  // Initial content update
  updateContent();
  
  return initialized;
}

// Update overlay content with time and status
function updateContent() {
  if (!isVisible) return;
  
  const time = new Date().toLocaleTimeString();
  const date = new Date().toLocaleDateString();
  
  // Build content string
  let content = `${time}\n${date}`;
  
  // Add status info if configured
  if (config.showCoordinates) {
    content += `\nPosition: ${currentX}, ${currentY}`;
  }
  
  // Add keyboard shortcut reminder
  content += `\n\nPress [A]ccept [D]ecline [P]ause [T]oggle [Q]uit`;
  
  // Update the overlay
  overlay.update(content);
}

// Move overlay window
function moveWindow(deltaX, deltaY) {
  // Calculate new position
  const newX = currentX + deltaX;
  const newY = currentY + deltaY;
  
  console.log(`Moving overlay from (${currentX}, ${currentY}) to (${newX}, ${newY})`);
  
  // Update position state
  currentX = newX;
  currentY = newY;
  
  // Recreate overlay at new position
  recreateOverlay();
}

// Recreate overlay (used after position changes)
function recreateOverlay() {
  // Clean up existing resources
  clearInterval(updateInterval);
  overlay.show(false);
  overlay.shutdown();
  
  // Short delay before recreation to prevent flicker
  setTimeout(() => {
    if (initializeOverlay()) {
      console.log(`✅ Overlay recreated at x=${currentX}, y=${currentY}`);
    }
  }, 100);
}

// Toggle overlay visibility
function toggleVisibility() {
  isVisible = !isVisible;
  overlay.show(isVisible);
  console.log(isVisible ? '👁️ Overlay visible' : '🔒 Overlay hidden');
}

// Setup advanced keyboard input handling with readline
function setupKeyboardControl() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  
  process.stdin.on('keypress', (str, key) => {
    if (key) {
      // Navigation keys
      if (key.name === 'up') moveWindow(0, -config.moveStep);
      if (key.name === 'down') moveWindow(0, config.moveStep);
      if (key.name === 'left') moveWindow(-config.moveStep, 0);
      if (key.name === 'right') moveWindow(config.moveStep, 0);
      
      // Action keys
      if (key.name === 'a') console.log('ACTION: Accept');
      if (key.name === 'd') console.log('ACTION: Decline');
      if (key.name === 'p') console.log('ACTION: Pause');
      if (key.name === 't') toggleVisibility();
      
      // Visibility toggle with shortcut
      if (key.ctrl && key.name === 'h') toggleVisibility();
      
      // Exit application
      if ((key.ctrl && key.name === 'c') || key.name === 'q') {
        cleanup();
      }
    }
  });
}

// Clean up resources
function cleanup() {
  console.log('\n🛑 Shutting down stealth overlay...');
  clearInterval(updateInterval);
  overlay.show(false);
  overlay.shutdown();
  process.exit(0);
}

// Handle process termination signals
function setupCleanupHandlers() {
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

// Main startup sequence
function start() {
  if (initializeOverlay()) {
    console.log('✅ Stealth overlay initialized successfully');
    setupKeyboardControl();
    setupCleanupHandlers();
    
    // Print control instructions
    console.log('\n📋 Enhanced Stealth Overlay Controls:');
    console.log('--------------------------------');
    console.log('↑ ↓ ← →  : Move overlay');
    console.log('A        : Accept action');
    console.log('D        : Decline action');
    console.log('P        : Pause/resume');
    console.log('T        : Toggle visibility');
    console.log('Q or Ctrl+C : Quit');
    console.log('--------------------------------');
  }
}

// Start the application
start();
