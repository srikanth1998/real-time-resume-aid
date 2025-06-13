import { useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Brain, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInterviewSession } from "@/hooks/useInterviewSession";

import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useNativeAudio } from "@/hooks/useNativeAudio";
import { InterviewHeader } from "@/components/interview/InterviewHeader";
import { InputModeSelector } from "@/components/interview/InputModeSelector";

import { VoiceModeUI } from "@/components/interview/VoiceModeUI";
import { TextModeUI } from "@/components/interview/TextModeUI";
import { NativeAudioMode } from "@/components/interview/NativeAudioMode";
import { AnswerDisplay } from "@/components/interview/AnswerDisplay";
import { ConversationHistory } from "@/components/interview/ConversationHistory";
import { StealthOverlayPanel } from "@/components/interview/StealthOverlayPanel";

const Interview = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const sessionId = searchParams.get('session_id');
  const { session, loading, sessionCheckFailed, timeRemaining } = useInterviewSession(sessionId);
  
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{question: string, answer: string, timestamp: string}>>([]);
  const [showHistory, setShowHistory] = useState(!isMobile);
  const [inputMode, setInputMode] = useState<'voice' | 'text' | 'native'>('native');
  const [manualQuestion, setManualQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const streamingAnswerRef = useRef("");

  // Initialize hooks
  const speechRecognition = useSpeechRecognition(handleSpeechTranscription);
  const { capabilities: nativeCapabilities } = useNativeAudio(sessionId);

  // Supabase configuration constants
  const SUPABASE_URL = "https://jafylkqbmvdptrqwwyed.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY";

  // Generate streaming answer from AI
  const generateStreamingAnswer = async (question: string) => {
    if (isGeneratingAnswer || !question.trim()) return;
    
    console.log('🚀 [INTERVIEW] Generating streaming answer for question:', question);
    setIsGeneratingAnswer(true);
    setIsStreaming(true);
    setCurrentAnswer("");
    streamingAnswerRef.current = "";

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-interview-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          sessionId: sessionId,
          question: question,
          streaming: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate streaming answer');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data.trim()) {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'delta' && parsed.content) {
                    streamingAnswerRef.current += parsed.content;
                    setCurrentAnswer(streamingAnswerRef.current);
                  } else if (parsed.type === 'done') {
                    const finalAnswer = parsed.fullAnswer || streamingAnswerRef.current;
                    setCurrentAnswer(finalAnswer);
                    
                    const newEntry = {
                      question,
                      answer: finalAnswer,
                      timestamp: new Date().toISOString()
                    };
                    
                    setConversationHistory(prev => [...prev, newEntry]);
                    
                    await supabase
                      .from('transcripts')
                      .insert({
                        session_id: sessionId,
                        question_text: question,
                        generated_answer: finalAnswer
                      });
                  }
                } catch (parseError) {
                  console.warn('Failed to parse streaming data:', parseError);
                }
              }
            }
          }
        }
      }

      toast({
        title: "✅ Response Generated",
        description: "AI has provided a tailored answer using streaming.",
      });

    } catch (error: any) {
      console.error('❌ [INTERVIEW] Streaming answer generation error:', error);
      let errorMessage = "Sorry, there was an error generating the answer. Please try again.";
      
      if (error.message && error.message.includes('quota')) {
        errorMessage = "OpenAI API quota exceeded. Please check your OpenAI account billing and usage limits.";
      } else if (error.message && error.message.includes('API key')) {
        errorMessage = "OpenAI API key issue. Please check your API key configuration.";
      }
      
      setCurrentAnswer(errorMessage);
      
      toast({
        title: "Error generating response",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAnswer(false);
      setIsStreaming(false);
    }
  };


  // Handle transcription from speech recognition
  function handleSpeechTranscription(text: string) {
    generateStreamingAnswer(text);
  }

  // Handle transcription from native audio
  const handleNativeTranscription = (text: string) => {
    console.log('🎯 [INTERVIEW] Received transcription from native helper:', text);
    speechRecognition.setCurrentTranscript(text);
    generateStreamingAnswer(text);
  };

  const handleManualSubmit = () => {
    if (!manualQuestion.trim()) return;
    
    speechRecognition.setCurrentTranscript(manualQuestion);
    generateStreamingAnswer(manualQuestion);
    setManualQuestion("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Answer copied successfully.",
    });
  };

  // Handle answer generation for stealth overlay
  const handleAnswerGenerated = (question: string, answer: string) => {
    const newEntry = {
      question,
      answer,
      timestamp: new Date().toISOString()
    };
    setConversationHistory(prev => [...prev, newEntry]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading interview session...</p>
          <p className="text-sm text-gray-400 mt-2">Session ID: {sessionId}</p>
        </div>
      </div>
    );
  }

  if (sessionCheckFailed) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-4" />
          <p className="text-xl mb-4">Session Not Found</p>
          <p className="text-gray-400 mb-6">The interview session could not be found or has expired.</p>
          <Button onClick={() => navigate('/')}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <InterviewHeader
        isStreaming={isStreaming}
        timeRemaining={timeRemaining}
        isMobile={isMobile}
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory(!showHistory)}
      />

      <div className={`max-w-7xl mx-auto p-3 md:p-4 ${isMobile ? 'space-y-4' : 'grid lg:grid-cols-2 gap-6'} ${isMobile ? 'h-auto' : 'h-[calc(100vh-80px)]'}`}>
        {/* Main Panel */}
        <div className="space-y-4 md:space-y-6">
          <InputModeSelector
            inputMode={inputMode}
            nativeAudioAvailable={nativeCapabilities.available}
            onModeChange={setInputMode}
          />

          {/* Stealth Overlay Panel */}
          <StealthOverlayPanel
            sessionId={sessionId || ''}
            onAnswerGenerated={handleAnswerGenerated}
            className="bg-gray-800 border-gray-700"
          />

          {inputMode === 'native' && (
            <NativeAudioMode
              sessionId={sessionId}
              onTranscriptionReceived={handleNativeTranscription}
            />
          )}

          {inputMode === 'voice' && (
            <VoiceModeUI
              isListening={speechRecognition.isListening}
              currentTranscript={speechRecognition.currentTranscript}
              isMobile={isMobile}
              onToggleListening={speechRecognition.toggleListening}
            />
          )}

          {inputMode === 'text' && (
            <TextModeUI
              manualQuestion={manualQuestion}
              currentTranscript={speechRecognition.currentTranscript}
              isGeneratingAnswer={isGeneratingAnswer}
              onQuestionChange={setManualQuestion}
              onSubmit={handleManualSubmit}
            />
          )}

          <AnswerDisplay
            currentAnswer={currentAnswer}
            isStreaming={isStreaming}
            isGeneratingAnswer={isGeneratingAnswer}
            currentTranscript={speechRecognition.currentTranscript}
            onCopy={() => copyToClipboard(currentAnswer)}
            onRegenerate={() => generateStreamingAnswer(speechRecognition.currentTranscript)}
          />
        </div>

        {/* History Panel */}
        {(!isMobile || showHistory) && (
          <div className={isMobile ? 'mt-4' : ''}>
            <ConversationHistory
              conversationHistory={conversationHistory}
              isMobile={isMobile}
              onClose={isMobile ? () => setShowHistory(false) : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Interview;
