
/* global chrome */

import { FloatingUI } from './ui/floatingUI.js';
import { TranscriptionHandler } from './handlers/transcriptionHandler.js';
import { MessageHandler } from './handlers/messageHandler.js';
import { AppInitializer } from './utils/appInitializer.js';

// Initialize the modules
const uiManager = new FloatingUI();
const transcriptionHandler = new TranscriptionHandler(uiManager);
const messageHandler = new MessageHandler(transcriptionHandler, uiManager);

// Create UI elements
uiManager.createManualTriggerButton();
uiManager.createFloatingTrigger();

// Add click handlers
uiManager.addButtonClickHandler(() => {
  console.log('🖱️ Manual trigger button clicked');
  transcriptionHandler.handleManualTranscriptionStart();
});

uiManager.addTriggerClickHandler(() => {
  console.log('🖱️ Manual transcription trigger clicked');
  transcriptionHandler.handleManualStart();
});

// Setup message listeners
messageHandler.setupChromeMessageListener();
messageHandler.setupWindowMessageListener();

// Setup scroll handler for UI elements
uiManager.setupScrollHandler();

// Initialize the application
AppInitializer.initializeApp(uiManager);
