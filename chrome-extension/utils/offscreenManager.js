
/* global chrome */

/**
 * Manages offscreen document creation and lifecycle
 */
export class OffscreenManager {
  static async ensureOffscreen() {
    try {
      if (await chrome.offscreen.hasDocument?.()) {
        console.log('Offscreen document already exists');
        return;
      }
      console.log('Creating offscreen document');
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('offscreen.html'),
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Process tab audio in hidden page'
      });
      console.log('Offscreen document created successfully');
    } catch (error) {
      console.error('Error creating offscreen document:', error);
      throw error;
    }
  }
}
