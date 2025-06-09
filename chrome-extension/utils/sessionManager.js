
/* global chrome */

/**
 * Manages session persistence and state
 */
export class SessionManager {
  constructor() {
    this.currentSessionId = null;
    this.sessionPersisted = false;
    this.permissionGranted = false;
  }

  async loadPersistedSession() {
    if (!this.isChromeExtensionContext()) return;
    
    try {
      const result = await chrome.storage.local.get(['sessionId', 'sessionPersisted', 'permissionGranted']);
      if (result.sessionId && result.sessionPersisted) {
        this.currentSessionId = result.sessionId;
        this.sessionPersisted = true;
        this.permissionGranted = result.permissionGranted || false;
        console.log('✅ Loaded persisted session ID (silent mode):', this.currentSessionId);
        console.log('🔐 Permission granted status:', this.permissionGranted);
      }
    } catch (error) {
      console.warn('Error loading persisted session:', error);
    }
  }

  async savePermissionState() {
    if (!this.isChromeExtensionContext()) return;
    
    try {
      await chrome.storage.local.set({ 
        sessionId: this.currentSessionId,
        sessionPersisted: this.sessionPersisted,
        permissionGranted: this.permissionGranted
      });
    } catch (error) {
      console.warn('Error saving permission state:', error);
    }
  }

  async setSessionId(sessionId) {
    this.currentSessionId = sessionId;
    this.sessionPersisted = true;
    try {
      await chrome.storage.local.set({ 
        sessionId: this.currentSessionId,
        sessionPersisted: true 
      });
      console.log('✅ Session ID set:', this.currentSessionId);
    } catch (error) {
      console.warn('Error saving session ID:', error);
    }
  }

  async clearSession() {
    this.currentSessionId = null;
    this.sessionPersisted = false;
    this.permissionGranted = false;
    try {
      await chrome.storage.local.remove(['sessionId', 'sessionPersisted', 'permissionGranted']);
      console.log('🧹 Session cleared');
    } catch (error) {
      console.warn('Error clearing session:', error);
    }
  }

  grantPermission() {
    this.permissionGranted = true;
    this.savePermissionState();
  }

  extractSessionId(url) {
    try {
      console.log('🔍 EXTRACTING SESSION ID FROM URL:', url);
      
      if (!url) {
        console.log('❌ No URL provided');
        return null;
      }

      // Method 1: Direct search for session_id parameter
      if (url.includes('session_id=')) {
        const match = url.match(/[?&]session_id=([^&#+]*)/);
        if (match && match[1]) {
          const sessionId = decodeURIComponent(match[1]);
          console.log('✅ Found session_id in query params:', sessionId);
          return sessionId;
        }
      }

      // Method 2: Search for sessionId parameter (camelCase)
      if (url.includes('sessionId=')) {
        const match = url.match(/[?&]sessionId=([^&#+]*)/);
        if (match && match[1]) {
          const sessionId = decodeURIComponent(match[1]);
          console.log('✅ Found sessionId in query params:', sessionId);
          return sessionId;
        }
      }

      // Method 3: Try URL object parsing
      try {
        const urlObj = new URL(url);
        const sessionFromQuery = urlObj.searchParams.get('session_id') || urlObj.searchParams.get('sessionId');
        if (sessionFromQuery) {
          console.log('✅ Extracted session ID from URL object:', sessionFromQuery);
          return sessionFromQuery;
        }
      } catch (urlError) {
        console.warn('Error parsing URL object:', urlError);
      }

      // Method 4: Check for session ID in path like /interview/session-id
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
        console.log('🔍 Path parts:', pathParts);
        
        const interviewIndex = pathParts.findIndex(part => part.toLowerCase().includes('interview'));
        if (interviewIndex !== -1 && pathParts[interviewIndex + 1]) {
          const sessionId = pathParts[interviewIndex + 1];
          console.log('✅ Extracted session ID from path:', sessionId);
          return sessionId;
        }
      } catch (pathError) {
        console.warn('Error parsing URL path:', pathError);
      }

      console.log('❌ No session ID found in URL');
      return null;
    } catch (error) {
      console.error('❌ Error extracting session ID:', error);
      return null;
    }
  }

  isChromeExtensionContext() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  }

  getState() {
    return {
      currentSessionId: this.currentSessionId,
      sessionPersisted: this.sessionPersisted,
      permissionGranted: this.permissionGranted
    };
  }
}
