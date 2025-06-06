
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useSpeechRecognition = (onTranscription: (text: string) => void) => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const lastTranscriptRef = useRef("");

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Speech recognition not supported",
        description: "Your browser doesn't support speech recognition. Please use text input instead.",
        variant: "destructive"
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const fullTranscript = finalTranscript || interimTranscript;
      setCurrentTranscript(fullTranscript);

      if (finalTranscript && finalTranscript !== lastTranscriptRef.current) {
        lastTranscriptRef.current = finalTranscript;
        console.log('🎯 Final transcript received:', finalTranscript);
        onTranscription(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      toast({
        title: "Speech recognition error",
        description: `Error: ${event.error}`,
        variant: "destructive"
      });
    };
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      initializeSpeechRecognition();
      if (!recognitionRef.current) return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setCurrentTranscript("");
      lastTranscriptRef.current = "";
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  return {
    isListening,
    currentTranscript,
    setCurrentTranscript,
    toggleListening,
    initializeSpeechRecognition,
    cleanup
  };
};
