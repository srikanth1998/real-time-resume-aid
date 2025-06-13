
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OverlayPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OverlayState {
  isVisible: boolean;
  isAvailable: boolean;
  position: OverlayPosition | null;
}

export const useStealthOverlay = (sessionId: string) => {
  const [state, setState] = useState<OverlayState>({
    isVisible: false,
    isAvailable: false,
    position: null
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Check if native helper is available
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        const response = await fetch('http://localhost:8765', {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        setState(prev => ({ ...prev, isAvailable: true }));
      } catch (error) {
        setState(prev => ({ ...prev, isAvailable: false }));
      }
    };

    checkAvailability();
    const interval = setInterval(checkAvailability, 5000);
    return () => clearInterval(interval);
  }, []);

  const createOverlay = useCallback(async (position?: OverlayPosition) => {
    if (!state.isAvailable || !sessionId) return;

    setLoading(true);
    try {
      const ws = new WebSocket('ws://localhost:8765');
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          action: 'createOverlay',
          sessionId,
          position
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'overlayCreated') {
          setState(prev => ({ 
            ...prev, 
            isVisible: true,
            position: message.position 
          }));
          
          toast({
            title: "Stealth Overlay Active",
            description: "Discrete overlay window is now ready for cross-device viewing.",
          });
        }
      };

      ws.onerror = () => {
        throw new Error('Failed to communicate with native helper');
      };

    } catch (error: any) {
      console.error('Failed to create stealth overlay:', error);
      toast({
        title: "Overlay Error",
        description: error.message || "Failed to create stealth overlay",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [state.isAvailable, sessionId, toast]);

  const showOverlay = useCallback(async () => {
    if (!state.isAvailable) return;

    try {
      const ws = new WebSocket('ws://localhost:8765');
      ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'showOverlay' }));
      };
      
      setState(prev => ({ ...prev, isVisible: true }));
    } catch (error) {
      console.error('Failed to show overlay:', error);
    }
  }, [state.isAvailable]);

  const hideOverlay = useCallback(async () => {
    if (!state.isAvailable) return;

    try {
      const ws = new WebSocket('ws://localhost:8765');
      ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'hideOverlay' }));
      };
      
      setState(prev => ({ ...prev, isVisible: false }));
    } catch (error) {
      console.error('Failed to hide overlay:', error);
    }
  }, [state.isAvailable]);

  const updateOverlayContent = useCallback(async (question: string, answer: string) => {
    if (!state.isAvailable || !state.isVisible) return;

    try {
      const ws = new WebSocket('ws://localhost:8765');
      ws.onopen = () => {
        ws.send(JSON.stringify({
          action: 'updateOverlay',
          question,
          answer
        }));
      };
    } catch (error) {
      console.error('Failed to update overlay content:', error);
    }
  }, [state.isAvailable, state.isVisible]);

  const setPosition = useCallback(async (position: OverlayPosition) => {
    if (!state.isAvailable) return;

    try {
      const ws = new WebSocket('ws://localhost:8765');
      ws.onopen = () => {
        ws.send(JSON.stringify({
          action: 'setOverlayPosition',
          position
        }));
      };
      
      setState(prev => ({ ...prev, position }));
    } catch (error) {
      console.error('Failed to set overlay position:', error);
    }
  }, [state.isAvailable]);

  const toggleOverlay = useCallback(async () => {
    if (state.isVisible) {
      await hideOverlay();
    } else {
      await showOverlay();
    }
  }, [state.isVisible, showOverlay, hideOverlay]);

  return {
    ...state,
    loading,
    createOverlay,
    showOverlay,
    hideOverlay,
    toggleOverlay,
    updateOverlayContent,
    setPosition
  };
};
