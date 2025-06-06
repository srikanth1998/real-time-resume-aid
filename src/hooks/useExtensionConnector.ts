
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { checkExtensionAvailability, initializeExtensionConnector } from '@/utils/extensionConnector';

export const useExtensionConnector = (onTranscription: (text: string, timestamp?: number) => void) => {
  const { toast } = useToast();
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState("Connecting...");
  const processingRef = useRef(false);

  const handleExtensionTranscriptionData = async (transcriptionText: string, timestamp?: number) => {
    console.log('🎯 [INTERVIEW] PROCESSING TRANSCRIPTION FROM EXTENSION:', transcriptionText);
    
    if (processingRef.current) {
      console.log('⚠️ [INTERVIEW] Already processing, skipping...');
      return;
    }
    
    if (!transcriptionText || transcriptionText.trim().length < 3) {
      console.log('⚠️ [INTERVIEW] Transcription too short, skipping:', transcriptionText);
      return;
    }
    
    processingRef.current = true;
    setExtensionStatus("Processing question...");
    
    try {
      toast({
        title: "🎤 Question Detected",
        description: `Processing: "${transcriptionText.substring(0, 50)}..."`,
      });
      
      onTranscription(transcriptionText, timestamp);
      setExtensionStatus("Listening for questions");
    } catch (error) {
      console.error('❌ [INTERVIEW] Error processing extension transcription:', error);
      setExtensionStatus("Error - Please try again");
      
      toast({
        title: "Error processing question",
        description: "There was an error generating an answer. Please try again.",
        variant: "destructive"
      });
    } finally {
      processingRef.current = false;
    }
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const initExtension = async () => {
      console.log('🚀 [INTERVIEW] Initializing extension connector...');
      setExtensionStatus("Connecting...");
      
      cleanup = initializeExtensionConnector();
      
      const handleExtensionReady = (event: CustomEvent) => {
        console.log('✅ [INTERVIEW] Extension ready event received:', event.detail);
        setExtensionConnected(true);
        setExtensionStatus("Listening for questions");
        (window as any).__extensionReady = true;
        
        toast({
          title: "🎤 Extension Connected",
          description: "Chrome extension is now capturing meeting audio automatically",
        });
      };

      const handleExtensionTranscription = (event: CustomEvent) => {
        console.log('📥 [INTERVIEW] TRANSCRIPTION RECEIVED FROM EXTENSION:', event.detail);
        
        if (event.detail?.text && event.detail.text.trim()) {
          console.log('🔄 [INTERVIEW] Processing transcription:', event.detail.text);
          handleExtensionTranscriptionData(event.detail.text, event.detail.timestamp);
        } else {
          console.warn('⚠️ [INTERVIEW] Empty or invalid transcription received');
        }
      };

      const handleWindowMessage = (event: MessageEvent) => {
        console.log('📨 [INTERVIEW] Window message received:', event.data);
        
        if (event.source !== window) {
          console.log('❌ [INTERVIEW] Message not from same window, ignoring');
          return;
        }
        
        if (event.data.action === 'extensionReady' && event.data.source === 'interviewace-extension') {
          console.log('✅ [INTERVIEW] Extension ready via window message');
          setExtensionConnected(true);
          setExtensionStatus("Listening for questions");
          
          toast({
            title: "🎤 Extension Connected",
            description: "Chrome extension is now capturing meeting audio automatically",
          });
        }
        
        if (event.data.action === 'processTranscription' && event.data.source === 'interviewace-extension' && event.data.text) {
          console.log('📝 [INTERVIEW] Processing transcription via window message:', event.data.text);
          handleExtensionTranscriptionData(event.data.text, event.data.timestamp);
        }
      };

      window.addEventListener('extensionReady', handleExtensionReady as EventListener);
      window.addEventListener('extensionTranscription', handleExtensionTranscription as EventListener);
      window.addEventListener('message', handleWindowMessage);

      const isAvailable = checkExtensionAvailability();
      if (isAvailable) {
        setExtensionConnected(true);
        setExtensionStatus("Listening for questions");
      }

      console.log('📢 [INTERVIEW] Sending interviewAppReady message');
      window.postMessage({
        action: 'interviewAppReady',
        timestamp: Date.now()
      }, '*');

      return () => {
        window.removeEventListener('extensionReady', handleExtensionReady as EventListener);
        window.removeEventListener('extensionTranscription', handleExtensionTranscription as EventListener);
        window.removeEventListener('message', handleWindowMessage);
        if (cleanup) cleanup();
      };
    };

    const cleanupPromise = initExtension();
    
    return () => {
      cleanupPromise.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [toast, onTranscription]);

  return {
    extensionConnected,
    extensionStatus,
    processingRef
  };
};
