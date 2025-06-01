
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

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef("");
  const processingRef = useRef(false);
  const audioBufferRef = useRef<string>("");

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
      
      // Check for extension
      checkExtensionConnection();
      
      // Initialize extension connector
      const cleanup = initializeExtensionConnector();
      
      return cleanup;
    };

    checkSession();

    // Listen for extension audio events
    const handleExtensionAudio = (event: CustomEvent) => {
      if (event.detail?.audioData) {
        handleExtensionAudioData(event.detail.audioData);
      }
    };

    window.addEventListener('extensionAudio', handleExtensionAudio as EventListener);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.removeEventListener('extensionAudio', handleExtensionAudio as EventListener);
    };
  }, [sessionId, navigate, inputMode]);

  const startTimer = (expiresAt: Date) => {
    timerRef.current = setInterval(() => {
      const now = new Date();
      const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeRemaining(timeLeft);
      
      if (timeLeft <= 0) {
        handleSessionExpired();
      } else if (timeLeft === 300) { // 5 minutes warning
        toast({
          title: "5 minutes remaining",
          description: "Your session will end in 5 minutes.",
          variant: "destructive"
        });
      } else if (timeLeft === 60) { // 1 minute warning
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

    // Update session status
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

  const checkExtensionConnection = () => {
    const isConnected = checkExtensionAvailability();
    setExtensionConnected(isConnected);
    if (isConnected) {
      setInputMode('extension');
    }
  };

  const handleExtensionAudioData = (audioData: string) => {
    console.log('Received audio from extension');
    
    // Buffer audio data
    audioBufferRef.current += audioData;
    
    // Process audio when we have enough data (adjust threshold as needed)
    if (audioBufferRef.current.length > 10000) {
      processAudioBuffer();
    }
  };

  const processAudioBuffer = async () => {
    if (processingRef.current || !audioBufferRef.current) return;
    
    processingRef.current = true;
    setCurrentTranscript("Processing audio from meeting...");
    
    try {
      // Send audio to speech-to-text
      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: {
          audio: audioBufferRef.current
        }
      });

      if (error) {
        console.error('Speech to text error:', error);
        return;
      }

      const transcript = data.text;
      if (transcript && transcript.trim().length > 10) {
        setCurrentTranscript(transcript);
        
        // Auto-generate answer if this looks like a question
        if (transcript.includes('?') || transcript.toLowerCase().includes('tell me') || 
            transcript.toLowerCase().includes('describe') || transcript.toLowerCase().includes('explain')) {
          generateAnswer(transcript);
        }
      }
      
      // Clear buffer
      audioBufferRef.current = "";
      
    } catch (error) {
      console.error('Audio processing error:', error);
    } finally {
      processingRef.current = false;
    }
  };

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Speech recognition not supported",
        description: "Please use a compatible browser.",
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
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const fullTranscript = finalTranscript + interimTranscript;
      setCurrentTranscript(fullTranscript);

      // Process questions automatically when final transcript is received
      if (finalTranscript && finalTranscript.trim().length > 10 && !processingRef.current) {
        const newQuestion = finalTranscript.trim();
        if (newQuestion !== lastTranscriptRef.current) {
          processingRef.current = true;
          generateAnswer(newQuestion);
          lastTranscriptRef.current = newQuestion;
        }
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      processingRef.current = false;
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      processingRef.current = false;
    };
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      processingRef.current = false;
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setCurrentTranscript("");
      setCurrentAnswer("");
      lastTranscriptRef.current = "";
      processingRef.current = false;
    }
  };

  const handleManualSubmit = () => {
    if (!manualQuestion.trim()) return;
    
    setCurrentTranscript(manualQuestion);
    generateAnswer(manualQuestion);
    setManualQuestion("");
  };

  const generateAnswer = async (question: string) => {
    if (isGeneratingAnswer || !question.trim()) return;
    
    setIsGeneratingAnswer(true);
    setCurrentAnswer("Analyzing your documents and generating a tailored response...");

    try {
      const { data, error } = await supabase.functions.invoke('generate-interview-answer', {
        body: {
          sessionId: sessionId,
          question: question
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate answer');
      }

      const aiAnswer = data.answer;
      setCurrentAnswer(aiAnswer);
      
      // Save to conversation history
      const newEntry = {
        question,
        answer: aiAnswer,
        timestamp: new Date().toISOString()
      };
      
      setConversationHistory(prev => [...prev, newEntry]);
      
      // Save to database
      await supabase
        .from('transcripts')
        .insert({
          session_id: sessionId,
          question_text: question,
          generated_answer: aiAnswer
        });

      toast({
        title: "Response generated",
        description: "AI has analyzed your documents and provided a tailored answer.",
      });

    } catch (error: any) {
      console.error('Answer generation error:', error);
      let errorMessage = "Sorry, there was an error generating the answer. Please try again.";
      
      // Check for specific error types
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
      processingRef.current = false;
    }
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

  const isLowTime = timeRemaining <= 300; // 5 minutes or less

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
        {/* Main Panel - Controls and Current Session */}
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

          {/* Input Control Based on Mode */}
          {inputMode === 'extension' && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-white text-base md:text-lg">
                  <span>Meeting Audio Capture</span>
                  <div className="flex items-center space-x-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs">Listening</span>
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
                <span>AI-Generated Answer</span>
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
                    onClick={() => generateAnswer(currentTranscript)}
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
                {isGeneratingAnswer && (
                  <div className="flex items-center space-x-2 mt-4 text-blue-400">
                    <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-blue-400"></div>
                    <span className="text-xs md:text-sm">Analyzing documents and generating personalized answer...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Panel - Collapsible on mobile */}
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
                        <p className="font-medium mb-2">🤖 AI Interview Assistant Active</p>
                        {extensionConnected ? (
                          <>
                            <p>• Extension capturing meeting audio automatically</p>
                            <p>• Questions will be processed in real-time</p>
                          </>
                        ) : (
                          <>
                            <p>• Choose your input method above</p>
                            <p>• Ask questions and get AI responses</p>
                          </>
                        )}
                        <p>• Powered by your resume and job description</p>
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
