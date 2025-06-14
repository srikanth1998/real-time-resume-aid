
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NativeAudioCapabilities {
  available: boolean;
  version?: string;
  platform: string;
  systemAudio: {
    available: boolean;
    method: string; // WASAPI or CoreAudio
  };
}

interface CaptureSession {
  sessionId: string;
  jwt: string;
  status: 'idle' | 'starting' | 'active' | 'stopping' | 'error';
  error?: string;
}

// Supabase configuration - these should match your actual config
const SUPABASE_CONFIG = {
  url: 'https://jafylkqbmvdptrqwwyed.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY'
};

export const useNativeAudio = (sessionId: string | null) => {
  const [capabilities, setCapabilities] = useState<NativeAudioCapabilities>({
    available: false,
    platform: 'unknown',
    systemAudio: { available: false, method: 'none' }
  });
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // Check if native helper is available
  const checkNativeHelper = useCallback(async () => {
    try {
      // Try to connect to Electron native helper on port 8765
      const ws = new WebSocket('ws://localhost:8765');
      
      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          console.warn('❌ Native helper connection timeout');
          resolve(false);
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ Electron native helper detected');
          
          // Send capabilities request
          ws.send(JSON.stringify({ action: 'getCapabilities' }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'capabilities') {
              console.log('📋 Received capabilities:', data.data);
              setCapabilities({
                available: data.data.available,
                version: data.data.version,
                platform: data.data.platform,
                systemAudio: data.data.systemAudio
              });
              ws.close();
              clearTimeout(timeout);
              resolve(true);
            }
          } catch (error) {
            console.error('Failed to parse capabilities:', error);
            ws.close();
            clearTimeout(timeout);
            resolve(false);
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          console.warn('❌ Failed to connect to native helper');
          resolve(false);
        };

        ws.onclose = () => {
          clearTimeout(timeout);
        };
      });
    } catch (error) {
      console.error('Native helper check failed:', error);
      return false;
    }
  }, []);

  // Connect to native helper
  const connectToHelper = useCallback(async () => {
    if (isConnected || wsRef.current) return;

    try {
      const ws = new WebSocket('ws://localhost:8765');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to native helper WebSocket');
        setIsConnected(true);
        
        // Request capabilities again
        ws.send(JSON.stringify({ action: 'getCapabilities' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleHelperMessage(data);
        } catch (error) {
          console.error('Failed to parse helper message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Native helper WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('Native helper WebSocket connection closed');
        setIsConnected(false);
        wsRef.current = null;
      };

    } catch (error) {
      console.error('Failed to connect to native helper:', error);
      setIsConnected(false);
    }
  }, [isConnected]);

  // Handle messages from native helper
  const handleHelperMessage = useCallback((data: any) => {
    console.log('📨 Helper message:', data);
    
    switch (data.type) {
      case 'capabilities':
        setCapabilities({
          available: data.data.available,
          version: data.data.version,
          platform: data.data.platform,
          systemAudio: data.data.systemAudio
        });
        break;
        
      case 'captureStatus':
        setSession(prev => prev ? { ...prev, status: data.status } : null);
        
        if (data.status === 'active') {
          toast({
            title: "Audio Capture Started",
            description: "Native system audio capture is now active",
          });
        } else if (data.status === 'idle') {
          toast({
            title: "Audio Capture Stopped",
            description: "Native system audio capture has been stopped",
          });
        }
        break;
        
      case 'error':
        setSession(prev => prev ? { ...prev, status: 'error', error: data.message } : null);
        toast({
          title: "Audio Capture Error",
          description: data.message,
          variant: "destructive"
        });
        break;
        
      case 'overlayStatus':
        console.log('Overlay status:', data.visible ? 'shown' : 'hidden');
        break;
        
      case 'overlayUpdated':
        console.log('Overlay content updated');
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

    try {
      // Send start capture command to native helper
      wsRef.current.send(JSON.stringify({
        action: 'startCapture',
        sessionId,
        jwt,
        supabaseConfig: SUPABASE_CONFIG
      }));

      console.log('📤 Sent start capture command');
      
    } catch (error) {
      console.error('❌ Failed to start capture:', error);
      setSession(prev => prev ? { ...prev, status: 'error', error: error.message } : null);
      throw error;
    }
  }, [sessionId, isConnected]);

  // Stop audio capture
  const stopCapture = useCallback(async () => {
    if (!session || !wsRef.current) return;

    setSession(prev => prev ? { ...prev, status: 'stopping' } : null);
    
    try {
      // Send stop capture command to native helper
      wsRef.current.send(JSON.stringify({
        action: 'stopCapture'
      }));

      console.log('📤 Sent stop capture command');
      
    } catch (error) {
      console.error('❌ Failed to stop capture:', error);
      setSession(prev => prev ? { ...prev, status: 'error', error: error.message } : null);
    }
  }, [session]);

  // Show/hide overlay
  const showOverlay = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ action: 'showOverlay' }));
    }
  }, []);

  const hideOverlay = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ action: 'hideOverlay' }));
    }
  }, []);

  const updateOverlay = useCallback((question: string, answer: string) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        action: 'updateOverlay',
        question,
        answer
      }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

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
    checkNativeHelper,
    showOverlay,
    hideOverlay,
    updateOverlay
  };
};
