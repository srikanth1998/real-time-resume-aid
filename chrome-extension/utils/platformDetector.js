
/**
 * Detects meeting platforms and audio sources
 */
export class PlatformDetector {
  static MEETING_PLATFORMS = [
    'meet.google.com',
    'zoom.us',
    'teams.microsoft.com',
    'webex.com',
    'gotomeeting.com',
    'skype.com'
  ];

  static INTERVIEW_PLATFORMS = [
    'lovableproject.com',
    'lovable.app',
    'real-time-resume-aid',
    'preview--'
  ];

  static AUDIO_SOURCES = [
    'youtube.com',
    'youtu.be',
    'soundcloud.com',
    'spotify.com',
    'open.spotify.com',
    'podcasts.google.com',
    'music.apple.com',
    'tidal.com',
    'deezer.com',
    'pandora.com'
  ];

  static isMeetingTab(url) {
    return this.MEETING_PLATFORMS.some(platform => url.includes(platform));
  }

  static isInterviewTab(url) {
    return this.INTERVIEW_PLATFORMS.some(platform => url.includes(platform));
  }

  static isAudioSourceTab(url) {
    return this.AUDIO_SOURCES.some(source => url.includes(source)) || this.isMeetingTab(url);
  }

  static canCaptureTab(url) {
    if (!url) return false;
    
    // Filter out Chrome internal pages and extension pages
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:') ||
        url.startsWith('moz-extension://') ||
        url.startsWith('chrome-search://') ||
        url.startsWith('chrome-devtools://')) {
      return false;
    }
    
    // Only allow http and https protocols
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }
    
    return true;
  }
}
