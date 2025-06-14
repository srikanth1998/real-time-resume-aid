
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

  // Check if native helper is available by using the native audio hook
  const { capabilities, isConnected, showOverlay, hideOverlay, updateOverlay } = require('@/hooks/useNativeAudio')(sessionId);

  useEffect(() => {
    setState(prev => ({ ...prev, isAvailable: capabilities.available && isConnected }));
  }, [capabilities.available, isConnected]);

  const createOverlay = useCallback(async (position?: OverlayPosition) => {
    if (!state.isAvailable || !sessionId) return;

    setLoading(true);
    try {
      await showOverlay();
      
      setState(prev => ({ 
        ...prev, 
        isVisible: true,
        position: position || {
          x: window.screen.width - 350,
          y: 20,
          width: 320,
          height: 450
        }
      }));
      
      toast({
        title: "Stealth Overlay Active",
        description: "Discrete overlay window is now ready for cross-device viewing.",
      });

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
  }, [state.isAvailable, sessionId, toast, showOverlay]);

  const show = useCallback(async () => {
    if (!state.isAvailable) return;

    try {
      await showOverlay();
      setState(prev => ({ ...prev, isVisible: true }));
    } catch (error) {
      console.error('Failed to show overlay:', error);
    }
  }, [state.isAvailable, showOverlay]);

  const hide = useCallback(async () => {
    if (!state.isAvailable) return;

    try {
      await hideOverlay();
      setState(prev => ({ ...prev, isVisible: false }));
    } catch (error) {
      console.error('Failed to hide overlay:', error);
    }
  }, [state.isAvailable, hideOverlay]);

  const updateOverlayContent = useCallback(async (question: string, answer: string) => {
    if (!state.isAvailable || !state.isVisible) return;

    try {
      await updateOverlay(question, answer);
    } catch (error) {
      console.error('Failed to update overlay content:', error);
    }
  }, [state.isAvailable, state.isVisible, updateOverlay]);

  const setPosition = useCallback(async (position: OverlayPosition) => {
    if (!state.isAvailable) return;

    try {
      // Position setting would be handled by the native helper
      setState(prev => ({ ...prev, position }));
    } catch (error) {
      console.error('Failed to set overlay position:', error);
    }
  }, [state.isAvailable]);

  const toggleOverlay = useCallback(async () => {
    if (state.isVisible) {
      await hide();
    } else {
      if (!state.position) {
        await createOverlay();
      } else {
        await show();
      }
    }
  }, [state.isVisible, state.position, hide, show, createOverlay]);

  return {
    ...state,
    loading,
    createOverlay,
    showOverlay: show,
    hideOverlay: hide,
    toggleOverlay,
    updateOverlayContent,
    setPosition
  };
};
