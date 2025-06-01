import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Mic, MicOff, Copy, RotateCcw, Clock, AlertTriangle, MessageSquare, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Interview = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const sessionId = searchParams.get('session_id');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [listeningMode, setListeningMode] = useState<'question' | 'answer'>('question');
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{question: string, answer: string, timestamp: string}>>([]);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef("");
  const processingRef = useRef(false);

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
      
      // Initialize speech recognition
      initializeSpeechRecognition();
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
  }, [sessionId, navigate]);

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

      // Only process questions when in question mode
      if (finalTranscript && finalTranscript.trim().length > 10 && !processingRef.current && listeningMode === 'question') {
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
      if (listeningMode === 'question') {
        setCurrentAnswer("");
      }
      lastTranscriptRef.current = "";
      processingRef.current = false;
    }
  };

  const switchMode = (mode: 'question' | 'answer') => {
    // Stop current listening session when switching modes
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    setListeningMode(mode);
    setCurrentTranscript("");
    processingRef.current = false;
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
      <div className="border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-blue-400" />
            <span className="font-semibold">InterviewAce</span>
          </div>
          
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${isLowTime ? 'bg-red-900 text-red-200' : 'bg-gray-800'}`}>
            <Clock className="h-4 w-4" />
            <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
            {isLowTime && <AlertTriangle className="h-4 w-4 text-red-400" />}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid lg:grid-cols-2 gap-6 h-[calc(100vh-80px)]">
        {/* Left Panel - Current Question & Controls */}
        <div className="space-y-6">
          {/* Mode Toggle */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Listening Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button
                  onClick={() => switchMode('question')}
                  variant={listeningMode === 'question' ? "default" : "outline"}
                  className="flex items-center space-x-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Question Mode</span>
                </Button>
                <Button
                  onClick={() => switchMode('answer')}
                  variant={listeningMode === 'answer' ? "default" : "outline"}
                  className="flex items-center space-x-2"
                >
                  <User className="h-4 w-4" />
                  <span>Answer Mode</span>
                </Button>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                {listeningMode === 'question' 
                  ? "AI will listen for interviewer questions and generate responses automatically"
                  : "Use this mode when you're speaking your answer (no AI generation)"
                }
              </p>
            </CardContent>
          </Card>

          {/* Microphone Control */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span>Voice Recognition</span>
                <Button
                  onClick={toggleListening}
                  variant={isListening ? "destructive" : "default"}
                  size="lg"
                  className="flex items-center space-x-2"
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  <span>{isListening ? "Stop Listening" : "Start Listening"}</span>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 p-4 rounded-lg min-h-[100px]">
                <p className="text-gray-400 text-sm mb-2">
                  Current transcript ({listeningMode === 'question' ? 'Question' : 'Answer'} mode):
                </p>
                <p className="text-white">
                  {currentTranscript || (isListening 
                    ? (listeningMode === 'question' 
                      ? "Listening for interviewer question... AI will generate response instantly." 
                      : "Listening to your answer... (No AI generation in this mode)")
                    : `Click 'Start Listening' to begin ${listeningMode} mode`
                  )}
                </p>
                {isListening && listeningMode === 'question' && (
                  <p className="text-blue-400 text-sm mt-2">
                    💡 Question Mode: Speak your question clearly. AI will generate a response automatically.
                  </p>
                )}
                {isListening && listeningMode === 'answer' && (
                  <p className="text-green-400 text-sm mt-2">
                    💡 Answer Mode: Practice speaking your answer. No AI generation will occur.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Answer - Only show in question mode */}
          {listeningMode === 'question' && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <span>AI-Generated Answer</span>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => copyToClipboard(currentAnswer)}
                      variant="outline"
                      size="sm"
                      disabled={!currentAnswer || isGeneratingAnswer}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => generateAnswer(currentTranscript)}
                      variant="outline"
                      size="sm"
                      disabled={!currentTranscript || isGeneratingAnswer}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 p-4 rounded-lg min-h-[200px]">
                  <p className="text-white leading-relaxed">
                    {currentAnswer || "Switch to Question Mode and ask a question. The AI will automatically analyze your resume and job description to provide a tailored response instantly."}
                  </p>
                  {isGeneratingAnswer && (
                    <div className="flex items-center space-x-2 mt-4 text-blue-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                      <span className="text-sm">Analyzing documents and generating personalized answer...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Conversation History */}
        <div>
          <Card className="bg-gray-800 border-gray-700 h-full">
            <CardHeader>
              <CardTitle className="text-white">Conversation History</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)] overflow-y-auto">
              <div className="space-y-4">
                {conversationHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">
                      Your conversation history will appear here as you ask questions in Question Mode.
                    </p>
                    <div className="text-sm text-blue-400 bg-blue-900/20 p-4 rounded-lg">
                      <p className="font-medium mb-2">🤖 AI Interview Assistant Active</p>
                      <p>• Use Question Mode to get AI responses</p>
                      <p>• Use Answer Mode to practice speaking</p>
                      <p>• Switch modes as needed during interview</p>
                      <p>• Powered by your resume and job description</p>
                    </div>
                  </div>
                ) : (
                  conversationHistory.map((entry, index) => (
                    <div key={index} className="border-b border-gray-700 pb-4">
                      <div className="mb-2">
                        <p className="text-gray-400 text-sm">Question:</p>
                        <p className="text-white">{entry.question}</p>
                      </div>
                      <div className="mb-2">
                        <p className="text-gray-400 text-sm">AI Answer:</p>
                        <p className="text-gray-200 text-sm leading-relaxed">{entry.answer}</p>
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
      </div>
    </div>
  );
};

export default Interview;
