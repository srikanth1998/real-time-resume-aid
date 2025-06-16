/**
 * Ultra Simple Stealth Overlay
 * 
 * Implements your successfully proven stealth techniques:
 * - Standard window with WS_EX_TOPMOST
 * - WS_POPUP | WS_VISIBLE window styles
 * - SetWindowDisplayAffinity with WDA_EXCLUDEFROMCAPTURE
 * - Direct GDI rendering with double-buffering
 */

const overlay = require('./build/Release/layeredoverlay');
const process = require('process');

// Configuration
const config = {
  width: 300,
  height: 100,
  x: 640,
  y: 40,
  refreshInterval: 1000
};

// Initialize and show the overlay
console.log('Initializing stealth overlay...');
const initialized = overlay.init(config.x, config.y, config.width, config.height);

if (initialized) {
  console.log('✅ Successfully initialized stealth overlay');
  console.log('Applying WDA_EXCLUDEFROMCAPTURE for screen capture protection');
  
  // Show the overlay
  overlay.show(true);
  
  // Update content periodically
  const refreshInterval = setInterval(() => {
    const time = new Date().toLocaleTimeString();
    const date = new Date().toLocaleDateString();
    overlay.update(`${time}\n${date}\n\nStealth Overlay Active`);
  }, config.refreshInterval);
  
  console.log(`
Stealth overlay is now active and should be:
- Visible locally on your screen
- Hidden from screen capture applications

To control the overlay, use ultra_minimal_overlay.js with keyboard controls.
Press Ctrl+C in this terminal to close the overlay.
`);
  
  // Handle cleanup on exit
  function cleanup() {
    clearInterval(refreshInterval);
    overlay.show(false);
    overlay.shutdown();
    console.log('Overlay shut down.');
    process.exit(0);
  }
  
  // Register cleanup handlers
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
} else {
  console.error('❌ Failed to initialize overlay');
  process.exit(1);
}
