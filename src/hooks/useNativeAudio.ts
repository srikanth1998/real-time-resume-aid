
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NativeAudioCapabilities {
  available: boolean;
  version?: string;
  drivers: {
    windows: boolean; // VB-Cable/WASAPI
    macos: boolean;   // BlackHole
  };
}

interface CaptureSession {
  sessionId: string;
  jwt: string;
  status: 'idle' | 'starting' | 'active' | 'stopping' | 'error';
  error?: string;
}

export const useNativeAudio = (sessionId: string | null) => {
  const [capabilities, setCapabilities] = useState<NativeAudioCapabilities>({
    available: false,
    drivers: { windows: false, macos: false }
  });
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // Check if native helper is available
  const checkNativeHelper = useCallback(async () => {
    try {
      // Check Rust native helper via HTTP ping
      const response = await fetch('http://localhost:4580/ping', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log('✅ Rust native helper detected');
        setCapabilities({
          available: true,
          version: '1.0.0-rust',
          drivers: {
            windows: navigator.platform.includes('Win'),
            macos: navigator.platform.includes('Mac')
          }
        });
        return true;
      }
      
      // Fallback: Check if Electron preload API is available
      if (typeof window !== 'undefined' && (window as any).nativeAudio) {
        const caps = await (window as any).nativeAudio.getCapabilities();
        setCapabilities(caps);
        return caps.available;
      }
      
      console.warn('❌ No native helper detected');
      return false;
    } catch (error) {
      console.error('Native helper check failed:', error);
      return false;
    }
  }, []);

  // Connect to native helper (Rust version uses HTTP, not WebSocket)
  const connectToHelper = useCallback(async () => {
    if (isConnected) return;

    try {
      // Test connection to Rust helper
      const response = await fetch('http://localhost:4580/ping');
      if (response.ok) {
        console.log('✅ Connected to Rust native helper');
        setIsConnected(true);
      } else {
        throw new Error('Helper not responding');
      }
    } catch (error) {
      console.error('Failed to connect to native helper:', error);
      setIsConnected(false);
    }
  }, [isConnected]);

  // Handle messages from native helper
  const handleHelperMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'captureStatus':
        setSession(prev => prev ? { ...prev, status: data.status } : null);
        break;
      case 'error':
        setSession(prev => prev ? { ...prev, status: 'error', error: data.message } : null);
        toast({
          title: "Audio Capture Error",
          description: data.message,
          variant: "destructive"
        });
        break;
      case 'audioData':
        // Audio data is handled by the native helper and sent directly to Supabase
        break;
    }
  }, [toast]);

  // Start audio capture
  const startCapture = useCallback(async (jwt: string) => {
    if (!sessionId || !isConnected) {
      throw new Error('Native helper not available');
    }

    setSession({
      sessionId,
      jwt,
      status: 'starting'
    });

    try {
      // Call Rust helper's /start endpoint
      const response = await fetch('http://localhost:4580/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          jwt
        })
      });

      if (response.ok) {
        console.log('✅ Started audio capture');
        setSession(prev => prev ? { ...prev, status: 'active' } : null);
      } else {
        throw new Error('Failed to start capture');
      }
    } catch (error) {
      console.error('❌ Failed to start capture:', error);
      setSession(prev => prev ? { ...prev, status: 'error', error: error.message } : null);
      throw error;
    }
  }, [sessionId, isConnected]);

  // Stop audio capture
  const stopCapture = useCallback(async () => {
    if (!session) return;

    setSession(prev => prev ? { ...prev, status: 'stopping' } : null);
    
    try {
      // Call Rust helper's /stop endpoint
      const response = await fetch('http://localhost:4580/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        console.log('✅ Stopped audio capture');
        setSession(null);
      } else {
        throw new Error('Failed to stop capture');
      }
    } catch (error) {
      console.error('❌ Failed to stop capture:', error);
      setSession(prev => prev ? { ...prev, status: 'error', error: error.message } : null);
    }
  }, [session]);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      const available = await checkNativeHelper();
      if (available) {
        await connectToHelper();
      }
    };
    
    initialize();
  }, [checkNativeHelper, connectToHelper]);

  return {
    capabilities,
    isConnected,
    session,
    startCapture,
    stopCapture,
    checkNativeHelper
  };
};
