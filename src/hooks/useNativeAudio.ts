
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
      // Check if Electron preload API is available
      if (typeof window !== 'undefined' && (window as any).nativeAudio) {
        const caps = await (window as any).nativeAudio.getCapabilities();
        setCapabilities(caps);
        return caps.available;
      }
      
      // Fallback: try to connect to local helper via WebSocket
      return new Promise<boolean>((resolve) => {
        const testWs = new WebSocket('ws://localhost:8765');
        const timeout = setTimeout(() => {
          testWs.close();
          resolve(false);
        }, 2000);

        testWs.onopen = () => {
          clearTimeout(timeout);
          testWs.close();
          setCapabilities({
            available: true,
            drivers: {
              windows: navigator.platform.includes('Win'),
              macos: navigator.platform.includes('Mac')
            }
          });
          resolve(true);
        };

        testWs.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('Native helper check failed:', error);
      return false;
    }
  }, []);

  // Connect to native helper
  const connectToHelper = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket('ws://localhost:8765');
      
      ws.onopen = () => {
        console.log('Connected to native helper');
        setIsConnected(true);
        wsRef.current = ws;
      };

      ws.onclose = () => {
        console.log('Disconnected from native helper');
        setIsConnected(false);
        wsRef.current = null;
      };

      ws.onerror = (error) => {
        console.error('Native helper connection error:', error);
        setIsConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleHelperMessage(data);
        } catch (error) {
          console.error('Failed to parse helper message:', error);
        }
      };
    } catch (error) {
      console.error('Failed to connect to native helper:', error);
    }
  }, []);

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
    if (!sessionId || !isConnected || !wsRef.current) {
      throw new Error('Native helper not available');
    }

    setSession({
      sessionId,
      jwt,
      status: 'starting'
    });

    wsRef.current.send(JSON.stringify({
      action: 'startCapture',
      sessionId,
      jwt,
      supabaseConfig: {
        url: 'https://jafylkqbmvdptrqwwyed.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY'
      }
    }));
  }, [sessionId, isConnected]);

  // Stop audio capture
  const stopCapture = useCallback(() => {
    if (!wsRef.current || !session) return;

    setSession(prev => prev ? { ...prev, status: 'stopping' } : null);
    
    wsRef.current.send(JSON.stringify({
      action: 'stopCapture',
      sessionId: session.sessionId
    }));
  }, [session]);

  // Initialize on mount
  useEffect(() => {
    checkNativeHelper().then(available => {
      if (available) {
        connectToHelper();
      }
    });

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
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
