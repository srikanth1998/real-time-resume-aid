
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Clock, 
  MessageSquare, 
  Brain, 
  Settings, 
  LogOut,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { useStealthOverlay } from "@/hooks/useStealthOverlay";
import { supabase } from "@/integrations/supabase/client";

interface OverlayInterfaceProps {
  sessionData?: any;
  userData?: any;
  authMode: 'session' | 'account';
  onLogout: () => void;
}

export const OverlayInterface = ({ 
  sessionData, 
  userData, 
  authMode, 
  onLogout 
}: OverlayInterfaceProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [sessionTime, setSessionTime] = useState(0);
  const [questionsCount, setQuestionsCount] = useState(0);

  const sessionId = authMode === 'session' ? sessionData?.id : null;
  const { 
    isVisible: overlayVisible, 
    isAvailable: overlayAvailable,
    toggleOverlay,
    updateOverlayContent 
  } = useStealthOverlay(sessionId || '');

  // Timer for session tracking
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Real-time updates for session mode
  useEffect(() => {
    if (authMode === 'session' && sessionId) {
      const channel = supabase
        .channel(`session_${sessionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transcripts',
          filter: `session_id=eq.${sessionId}`
        }, (payload) => {
          if (payload.new) {
            setCurrentQuestion(payload.new.question_text);
            setCurrentAnswer(payload.new.generated_answer);
            setQuestionsCount(prev => prev + 1);
            
            // Update stealth overlay if available
            if (overlayAvailable) {
              updateOverlayContent(payload.new.question_text, payload.new.generated_answer);
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [authMode, sessionId, overlayAvailable, updateOverlayContent]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStealthToggle = async () => {
    if (!overlayAvailable) {
      toast.error("Native helper not available. Please ensure the desktop helper is installed and running.");
      return;
    }
    
    try {
      await toggleOverlay();
      toast.success(overlayVisible ? "Stealth overlay hidden" : "Stealth overlay activated");
    } catch (error) {
      toast.error("Failed to toggle stealth overlay");
    }
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Card className="backdrop-blur-md bg-glass border border-glass-border w-16 h-16 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setIsMinimized(false)}>
          <Brain className="h-6 w-6 text-primary" />
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-50 w-80"
    >
      <Card className="backdrop-blur-md bg-glass border border-glass-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg text-white">InterviewAce</CardTitle>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStealthToggle}
                className="h-8 w-8 p-0 text-white/70 hover:text-white"
                title={overlayVisible ? "Hide Stealth Overlay" : "Show Stealth Overlay"}
              >
                {overlayVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0 text-white/70 hover:text-white"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="h-8 w-8 p-0 text-white/70 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Status Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {authMode === 'session' ? (
                <User className="h-4 w-4 text-green-400" />
              ) : (
                <User className="h-4 w-4 text-blue-400" />
              )}
              <span className="text-sm text-white">
                {authMode === 'session' ? 'Session Mode' : 'Account Mode'}
              </span>
            </div>
            <Badge variant={overlayAvailable ? "default" : "secondary"}>
              {overlayAvailable ? "Connected" : "Offline"}
            </Badge>
          </div>

          {/* Session Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2 text-white/70">
              <Clock className="h-4 w-4" />
              <span>{formatTime(sessionTime)}</span>
            </div>
            <div className="flex items-center space-x-2 text-white/70">
              <MessageSquare className="h-4 w-4" />
              <span>{questionsCount} questions</span>
            </div>
          </div>

          <Separator className="bg-white/20" />

          {/* Current Q&A Display */}
          <AnimatePresence mode="wait">
            {currentQuestion && currentAnswer ? (
              <motion.div
                key="qa-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div>
                  <h4 className="text-sm font-medium text-white mb-1">Current Question:</h4>
                  <p className="text-xs text-white/80 bg-white/10 rounded p-2">
                    {currentQuestion}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-green-400 mb-1">AI Suggestion:</h4>
                  <p className="text-xs text-white/80 bg-green-500/10 border border-green-500/20 rounded p-2">
                    {currentAnswer}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Brain className="h-8 w-8 text-white/40 mx-auto mb-2" />
                <p className="text-sm text-white/60">
                  Waiting for interview questions...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stealth Overlay Status */}
          {overlayAvailable && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Stealth Overlay:</span>
              <Badge variant={overlayVisible ? "default" : "outline"}>
                {overlayVisible ? "Active" : "Hidden"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
