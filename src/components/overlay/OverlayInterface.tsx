
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Briefcase, AlertCircle } from 'lucide-react';
import { useStealthOverlay } from '@/hooks/useStealthOverlay';

interface OverlayInterfaceProps {
  sessionData?: any;
  userData?: any;
  mode: 'session' | 'account';
  onDisconnect: () => void;
}

export const OverlayInterface = ({ 
  sessionData, 
  userData, 
  mode, 
  onDisconnect 
}: OverlayInterfaceProps) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');

  const sessionId = mode === 'session' ? sessionData?.id : null;
  const {
    isVisible,
    isAvailable,
    loading,
    toggleOverlay,
    updateOverlayContent
  } = useStealthOverlay(sessionId);

  // Timer for session mode
  useEffect(() => {
    if (mode === 'session' && sessionData?.expires_at) {
      const timer = setInterval(() => {
        const now = new Date();
        const expiresAt = new Date(sessionData.expires_at);
        const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
        setTimeRemaining(timeLeft);
        
        if (timeLeft <= 0) {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [mode, sessionData]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpdateOverlay = () => {
    if (currentQuestion && currentAnswer) {
      updateOverlayContent(currentQuestion, currentAnswer);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                {mode === 'session' ? (
                  <>
                    <Briefcase className="h-5 w-5" />
                    Interview Session
                  </>
                ) : (
                  <>
                    <User className="h-5 w-5" />
                    Account Mode
                  </>
                )}
              </CardTitle>
              <p className="text-gray-400">
                {mode === 'session' 
                  ? `Session: ${sessionData?.session_code || 'Unknown'}`
                  : `Logged in as: ${userData?.user?.email || 'Unknown'}`
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'session' && (
                <Badge variant="outline" className="text-white border-gray-600">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatTime(timeRemaining)}
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDisconnect}
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                Disconnect
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Session Info */}
        {mode === 'session' && sessionData && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Job Role</p>
                  <p className="text-white">{sessionData.job_role || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Duration</p>
                  <p className="text-white">{sessionData.duration_minutes} minutes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overlay Controls */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Overlay Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Stealth Overlay</p>
                <p className="text-gray-400 text-sm">
                  {isAvailable 
                    ? 'Native helper connected'
                    : 'Native helper not available'
                  }
                </p>
              </div>
              <div className="flex gap-2">
                <Badge 
                  variant={isVisible ? "default" : "secondary"}
                  className={isVisible ? "bg-green-600" : "bg-gray-600"}
                >
                  {isVisible ? 'Visible' : 'Hidden'}
                </Badge>
                <Button
                  onClick={toggleOverlay}
                  disabled={!isAvailable || loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Loading...' : 'Toggle Overlay'}
                </Button>
              </div>
            </div>

            {!isAvailable && (
              <div className="flex items-center gap-2 p-3 bg-yellow-900/20 border border-yellow-700 rounded">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <p className="text-yellow-300 text-sm">
                  Native helper not detected. Make sure the overlay application is running.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question & Answer Interface */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Interview Assistant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-white text-sm block mb-2">Current Question</label>
              <textarea
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                placeholder="Enter the interview question here..."
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="text-white text-sm block mb-2">Generated Answer</label>
              <textarea
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                placeholder="AI-generated answer will appear here..."
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                rows={4}
              />
            </div>
            <Button
              onClick={handleUpdateOverlay}
              disabled={!currentQuestion || !currentAnswer || !isAvailable}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Update Overlay Content
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
