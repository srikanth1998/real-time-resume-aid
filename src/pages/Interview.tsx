import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Mic, MicOff, Copy, RotateCcw, Clock, AlertTriangle, Menu, Type, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { checkExtensionAvailability, initializeExtensionConnector } from "@/utils/extensionConnector";

const Interview = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const sessionId = searchParams.get('session_id');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{question: string, answer: string, timestamp: string}>>([]);
  const [showHistory, setShowHistory] = useState(!isMobile);
  const [inputMode, setInputMode] = useState<'voice' | 'text' | 'extension'>('voice');
  const [manualQuestion, setManualQuestion] = useState("");
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState("Connecting...");
  const [isStreaming, setIsStreaming] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef("");
  const processingRef = useRef(false);
  const streamingAnswerRef = useRef("");

  // Supabase configuration constants
  const SUPABASE_URL = "https://jafylkqbmvdptrqwwyed.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY";

  // Predictive caching for common questions
  const commonQuestions = [
    "Tell me about yourself",
    "What are your strengths?",
    "What are your weaknesses?",
    "Why do you want this job?",
    "Why should we hire you?",
    "Where do you see yourself in 5 years?",
    "Tell me about a challenge you overcame",
    "What motivates you?"
  ];

  useEffect(() => {
    const checkSession = async () => {
      if (!sessionId) {
        navigate('/');
        return;
      }

      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        navigate('/auth');
        return;
      }

      // Fetch session details
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', authSession.user.id)
        .single();

      if (error || !sessionData) {
        navigate('/');
        return;
      }

      if (sessionData.status !== 'in_progress') {
        navigate('/');
        return;
      }

      // Check if session has expired
      const now = new Date();
      const expiresAt = new Date(sessionData.expires_at);
      
      if (now >= expiresAt) {
        await handleSessionExpired();
        return;
      }

      setSession(sessionData);
      
      // Calculate time remaining
      const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeRemaining(timeLeft);
      
      setLoading(false);
      
      // Start timer
      startTimer(expiresAt);
      
      // Initialize speech recognition only if voice mode
      if (inputMode === 'voice') {
        initializeSpeechRecognition();
      }
      
      // Check for extension and initialize
      checkAndInitializeExtension();
      
      // Start predictive caching
      startPredictiveCaching();
    };

    checkSession();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [sessionId, navigate, inputMode]);

  // Extension initialization effect
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const initExtension = async () => {
      console.log('🚀 Initializing extension connector...');
      setExtensionStatus("Connecting...");
      
      cleanup = initializeExtensionConnector();
      
      const handleExtensionReady = (event: CustomEvent) => {
        console.log('✅ Extension ready event received:', event.detail);
        setExtensionConnected(true);
        setExtensionStatus("Listening");
        (window as any).__extensionReady = true;
        
        if (inputMode === 'voice') {
          setInputMode('extension');
        }
      };

      const handleExtensionTranscription = (event: CustomEvent) => {
        console.log('📥 EXTENSION TRANSCRIPTION EVENT RECEIVED:', event.detail);
        
        if (event.detail?.text) {
          console.log('🔄 Processing transcription data...');
          handleExtensionTranscriptionData(event.detail.text, event.detail.timestamp);
        }
      };

      window.addEventListener('extensionReady', handleExtensionReady as EventListener);
      window.addEventListener('extensionTranscription', handleExtensionTranscription as EventListener);

      const isAvailable = checkExtensionAvailability();
      setExtensionConnected(isAvailable);
      
      if (isAvailable) {
        setExtensionStatus("Listening");
        if (inputMode === 'voice') {
          setInputMode('extension');
        }
      }

      return () => {
        window.removeEventListener('extensionReady', handleExtensionReady as EventListener);
        window.removeEventListener('extensionTranscription', handleExtensionTranscription as EventListener);
        if (cleanup) cleanup();
      };
    };

    const cleanupPromise = initExtension();
    
    return () => {
      cleanupPromise.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [inputMode]);

  const startPredictiveCaching = async () => {
    console.log('🚀 Starting predictive caching for common questions...');
    
    // Cache common questions in background
    for (const question of commonQuestions) {
      try {
        // Use non-streaming mode for caching
        await supabase.functions.invoke('generate-interview-answer', {
          body: {
            sessionId: sessionId,
            question: question,
            streaming: false
          }
        });
        console.log('✅ Cached answer for:', question);
      } catch (error) {
        console.warn('⚠️ Failed to cache answer for:', question, error);
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

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
        generateStreamingAnswer(finalTranscript);
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

  const checkAndInitializeExtension = () => {
    const checks = [0, 500, 1000, 2000, 3000];
    
    checks.forEach(delay => {
      setTimeout(() => {
        const isConnected = checkExtensionAvailability();
        
        if (isConnected && !extensionConnected) {
          setExtensionConnected(true);
          setExtensionStatus("Listening");
          if (inputMode === 'voice') {
            setInputMode('extension');
          }
        }
      }, delay);
    });
  };

  const handleExtensionTranscriptionData = async (transcriptionText: string, timestamp?: number) => {
    console.log('🎯 PROCESSING TRANSCRIPTION FROM EXTENSION:', transcriptionText);
    
    if (processingRef.current) {
      console.log('⚠️ Already processing, skipping...');
      return;
    }
    
    processingRef.current = true;
    setExtensionStatus("Processing...");
    
    try {
      setCurrentTranscript(transcriptionText);
      await generateStreamingAnswer(transcriptionText);
      setExtensionStatus("Listening");
    } catch (error) {
      console.error('❌ Error processing extension transcription:', error);
      setExtensionStatus("Error");
    } finally {
      processingRef.current = false;
    }
  };

  const startTimer = (expiresAt: Date) => {
    timerRef.current = setInterval(() => {
      const now = new Date();
      const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeRemaining(timeLeft);
      
      if (timeLeft <= 0) {
        handleSessionExpired();
      } else if (timeLeft === 300) {
        toast({
          title: "5 minutes remaining",
          description: "Your session will end in 5 minutes.",
          variant: "destructive"
        });
      } else if (timeLeft === 60) {
        toast({
          title: "1 minute remaining",
          description: "Your session will end in 1 minute.",
          variant: "destructive"
        });
      }
    }, 1000);
  };

  const handleSessionExpired = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    toast({
      title: "Session completed",
      description: "Your interview session has ended.",
    });

    navigate(`/complete?session_id=${sessionId}`);
  };

  const handleManualSubmit = () => {
    if (!manualQuestion.trim()) return;
    
    setCurrentTranscript(manualQuestion);
    generateStreamingAnswer(manualQuestion);
    setManualQuestion("");
  };

  const generateStreamingAnswer = async (question: string) => {
    if (isGeneratingAnswer || !question.trim()) return;
    
    console.log('🚀 Generating streaming answer for question:', question);
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
                    // Final answer received
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
        title: "Response generated",
        description: "AI has provided a tailored answer using streaming.",
      });

    } catch (error: any) {
      console.error('❌ Streaming answer generation error:', error);
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
      processingRef.current = false;
    }
  };

  // Fallback to old generation method
  const generateAnswer = async (question: string) => {
    return generateStreamingAnswer(question);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Answer copied successfully.",
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading interview session...</p>
        </div>
      </div>
    );
  }

  const isLowTime = timeRemaining <= 300;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header with Timer */}
      <div className="border-b border-gray-800 p-3 md:p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
            <span className="font-semibold text-sm md:text-base">InterviewAce</span>
            {extensionConnected && (
              <span className="bg-green-800 text-green-200 text-xs px-2 py-1 rounded">
                Extension Connected
              </span>
            )}
            {isStreaming && (
              <span className="bg-blue-800 text-blue-200 text-xs px-2 py-1 rounded animate-pulse">
                Streaming Response
              </span>
            )}
          </div>
          
          {isMobile && (
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm md:text-base ${isLowTime ? 'bg-red-900 text-red-200' : 'bg-gray-800'}`}>
            <Clock className="h-3 w-3 md:h-4 md:w-4" />
            <span className="font-mono">{formatTime(timeRemaining)}</span>
            {isLowTime && <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-red-400" />}
          </div>
        </div>
      </div>

      <div className={`max-w-7xl mx-auto p-3 md:p-4 ${isMobile ? 'space-y-4' : 'grid lg:grid-cols-2 gap-6'} ${isMobile ? 'h-auto' : 'h-[calc(100vh-80px)]'}`}>
        {/* Main Panel */}
        <div className="space-y-4 md:space-y-6">
          {/* Input Mode Selection */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base md:text-lg">
                Question Input Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => setInputMode('extension')}
                  variant={inputMode === 'extension' ? "default" : "outline"}
                  size="sm"
                  className="flex flex-col items-center space-y-1 h-auto py-3"
                  disabled={!extensionConnected}
                >
                  <Volume2 className="h-4 w-4" />
                  <span className="text-xs">Extension</span>
                </Button>
                <Button
                  onClick={() => setInputMode('voice')}
                  variant={inputMode === 'voice' ? "default" : "outline"}
                  size="sm"
                  className="flex flex-col items-center space-y-1 h-auto py-3"
                >
                  <Mic className="h-4 w-4" />
                  <span className="text-xs">Voice</span>
                </Button>
                <Button
                  onClick={() => setInputMode('text')}
                  variant={inputMode === 'text' ? "default" : "outline"}
                  size="sm"
                  className="flex flex-col items-center space-y-1 h-auto py-3"
                >
                  <Type className="h-4 w-4" />
                  <span className="text-xs">Text</span>
                </Button>
              </div>
              
              {!extensionConnected && (
                <div className="mt-3 text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded">
                  💡 Install the InterviewAce Chrome Extension for automatic meeting audio capture
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extension Mode UI */}
          {inputMode === 'extension' && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-white text-base md:text-lg">
                  <span>Meeting Audio Capture</span>
                  <div className="flex items-center space-x-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs">{extensionStatus}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 p-3 md:p-4 rounded-lg min-h-[80px] md:min-h-[100px]">
                  <p className="text-gray-400 text-xs md:text-sm mb-2">
                    Audio from meeting:
                  </p>
                  <p className="text-white text-sm md:text-base leading-relaxed">
                    {currentTranscript || "Chrome extension will automatically capture and process meeting audio"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Voice Mode UI */}
          {inputMode === 'voice' && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-white text-base md:text-lg">
                  <span>Voice Recognition</span>
                  <Button
                    onClick={toggleListening}
                    variant={isListening ? "destructive" : "default"}
                    size={isMobile ? "sm" : "lg"}
                    className="flex items-center space-x-2"
                  >
                    {isListening ? <MicOff className="h-4 w-4 md:h-5 md:w-5" /> : <Mic className="h-4 w-4 md:h-5 md:w-5" />}
                    <span className="text-xs md:text-sm">{isListening ? "Stop" : "Start"}</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 p-3 md:p-4 rounded-lg min-h-[80px] md:min-h-[100px]">
                  <p className="text-gray-400 text-xs md:text-sm mb-2">
                    Current transcript:
                  </p>
                  <p className="text-white text-sm md:text-base leading-relaxed">
                    {currentTranscript || (isListening 
                      ? "Listening for interviewer question..." 
                      : "Tap 'Start' to begin listening for questions"
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Text Mode UI */}
          {inputMode === 'text' && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base md:text-lg">
                  Text Input
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Input
                      value={manualQuestion}
                      onChange={(e) => setManualQuestion(e.target.value)}
                      placeholder="Type the interviewer's question here..."
                      className="bg-gray-900 border-gray-600 text-white"
                      onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                    />
                    <Button
                      onClick={handleManualSubmit}
                      disabled={!manualQuestion.trim() || isGeneratingAnswer}
                      size="sm"
                    >
                      Submit
                    </Button>
                  </div>
                  {currentTranscript && (
                    <div className="bg-gray-900 p-3 rounded-lg">
                      <p className="text-gray-400 text-xs mb-1">Last question:</p>
                      <p className="text-white text-sm">{currentTranscript}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Answer */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-white text-base md:text-lg">
                <span>AI-Generated Answer {isStreaming && <span className="text-blue-400">(Streaming...)</span>}</span>
                <div className="flex space-x-1 md:space-x-2">
                  <Button
                    onClick={() => copyToClipboard(currentAnswer)}
                    variant="outline"
                    size="sm"
                    disabled={!currentAnswer || isGeneratingAnswer}
                    className="p-2"
                  >
                    <Copy className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  <Button
                    onClick={() => generateStreamingAnswer(currentTranscript)}
                    variant="outline"
                    size="sm"
                    disabled={!currentTranscript || isGeneratingAnswer}
                    className="p-2"
                  >
                    <RotateCcw className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 p-3 md:p-4 rounded-lg min-h-[120px] md:min-h-[200px] max-h-60 md:max-h-none overflow-y-auto">
                <p className="text-white leading-relaxed text-sm md:text-base">
                  {currentAnswer || "Ask a question to get an AI-generated response tailored to your resume and job description."}
                </p>
                {isGeneratingAnswer && !isStreaming && (
                  <div className="flex items-center space-x-2 mt-4 text-blue-400">
                    <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-blue-400"></div>
                    <span className="text-xs md:text-sm">Analyzing documents and generating personalized answer...</span>
                  </div>
                )}
                {isStreaming && (
                  <div className="flex items-center space-x-2 mt-4 text-green-400">
                    <div className="animate-pulse rounded-full h-3 w-3 md:h-4 md:w-4 bg-green-400"></div>
                    <span className="text-xs md:text-sm">Streaming response in real-time...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Panel */}
        {(!isMobile || showHistory) && (
          <div className={isMobile ? 'mt-4' : ''}>
            <Card className="bg-gray-800 border-gray-700 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base md:text-lg flex items-center justify-between">
                  <span>Conversation History</span>
                  {isMobile && (
                    <Button
                      onClick={() => setShowHistory(false)}
                      variant="ghost"
                      size="sm"
                      className="p-2"
                    >
                      ✕
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className={`${isMobile ? 'max-h-96' : 'h-[calc(100%-80px)]'} overflow-y-auto`}>
                <div className="space-y-3 md:space-y-4">
                  {conversationHistory.length === 0 ? (
                    <div className="text-center py-6 md:py-8">
                      <p className="text-gray-400 mb-4 text-sm md:text-base">
                        Your conversation history will appear here as you ask questions.
                      </p>
                      <div className="text-xs md:text-sm text-blue-400 bg-blue-900/20 p-3 md:p-4 rounded-lg">
                        <p className="font-medium mb-2">🚀 Enhanced AI Interview Assistant</p>
                        {extensionConnected ? (
                          <>
                            <p>• Extension capturing meeting audio automatically</p>
                            <p>• Real-time streaming responses</p>
                          </>
                        ) : (
                          <>
                            <p>• Choose your input method above</p>
                            <p>• Get streaming AI responses</p>
                          </>
                        )}
                        <p>• Predictive caching for instant answers</p>
                        <p>• Optimized for speed and accuracy</p>
                      </div>
                    </div>
                  ) : (
                    conversationHistory.map((entry, index) => (
                      <div key={index} className="border-b border-gray-700 pb-3 md:pb-4">
                        <div className="mb-2">
                          <p className="text-gray-400 text-xs md:text-sm">Question:</p>
                          <p className="text-white text-sm md:text-base">{entry.question}</p>
                        </div>
                        <div className="mb-2">
                          <p className="text-gray-400 text-xs md:text-sm">AI Answer:</p>
                          <p className="text-gray-200 text-xs md:text-sm leading-relaxed">{entry.answer}</p>
                        </div>
                        <p className="text-gray-500 text-xs">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Interview;
