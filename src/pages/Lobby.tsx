
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Mic, Monitor, Wifi, CheckCircle, AlertCircle, Clock, Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Lobby = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const sessionId = searchParams.get('session_id');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [systemChecks, setSystemChecks] = useState({
    microphone: false,
    browser: false,
    connection: false
  });

  useEffect(() => {
    const checkSession = async () => {
      if (!sessionId) {
        toast({
          title: "No session found",
          description: "Please start a new session from the homepage.",
          variant: "destructive"
        });
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
        toast({
          title: "Session not found",
          description: "Please start a new session.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      if (sessionData.status !== 'assets_received') {
        if (sessionData.status === 'pending_assets') {
          navigate(`/upload?session_id=${sessionId}`);
          return;
        }
        toast({
          title: "Session not ready",
          description: "Please complete the previous steps first.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setSession(sessionData);
      setLoading(false);
      
      // Run system checks
      runSystemChecks();
    };

    checkSession();
  }, [sessionId, navigate, toast]);

  const runSystemChecks = async () => {
    // Browser check
    const userAgent = navigator.userAgent;
    const isSupported = /Chrome|Firefox|Safari|Edge/.test(userAgent);
    setSystemChecks(prev => ({ ...prev, browser: isSupported }));

    // Connection check
    try {
      const start = Date.now();
      await fetch('/favicon.ico');
      const latency = Date.now() - start;
      setSystemChecks(prev => ({ ...prev, connection: latency < 1000 }));
    } catch {
      setSystemChecks(prev => ({ ...prev, connection: false }));
    }

    // Microphone check
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setSystemChecks(prev => ({ ...prev, microphone: true }));
      stream.getTracks().forEach(track => track.stop());
    } catch {
      setSystemChecks(prev => ({ ...prev, microphone: false }));
    }
  };

  const handleStartInterview = async () => {
    if (!Object.values(systemChecks).every(check => check)) {
      toast({
        title: "System checks failed",
        description: "Please resolve the system issues before starting.",
        variant: "destructive"
      });
      return;
    }

    setStarting(true);

    try {
      // Update session status and set start time
      const now = new Date();
      const expiresAt = new Date(now.getTime() + session.duration_minutes * 60 * 1000);

      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'in_progress',
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Interview started!",
        description: `Your ${session.duration_minutes}-minute session is now active.`,
      });

      // Navigate to interview interface
      navigate(`/interview?session_id=${sessionId}`);

    } catch (error: any) {
      console.error('Start interview error:', error);
      toast({
        title: "Failed to start interview",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const allChecksPass = Object.values(systemChecks).every(check => check);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Brain className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">InterviewAce</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pre-Interview Lobby</h1>
        <p className="text-gray-600">System checks and final preparations</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Session Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{session.plan_type.charAt(0).toUpperCase() + session.plan_type.slice(1)} Plan Ready</span>
              </span>
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{session.duration_minutes} minutes</span>
              </Badge>
            </CardTitle>
            <CardDescription>
              Documents uploaded and processed • Session will expire automatically after {session.duration_minutes} minutes
            </CardDescription>
          </CardHeader>
        </Card>

        {/* System Checks */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>System Compatibility Check</CardTitle>
            <CardDescription>
              We need to verify your system is ready for the live interview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Mic className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Microphone Access</p>
                    <p className="text-sm text-gray-600">Required for speech recognition</p>
                  </div>
                </div>
                {systemChecks.microphone ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Monitor className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Browser Compatibility</p>
                    <p className="text-sm text-gray-600">Modern browser required</p>
                  </div>
                </div>
                {systemChecks.browser ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Wifi className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Internet Connection</p>
                    <p className="text-sm text-gray-600">Stable connection needed</p>
                  </div>
                </div>
                {systemChecks.connection ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>

            {!allChecksPass && (
              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Action Required</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Please resolve the failed checks above before starting your interview.
                      {!systemChecks.microphone && " Grant microphone permission when prompted."}
                      {!systemChecks.browser && " Use a modern browser like Chrome, Firefox, Safari, or Edge."}
                      {!systemChecks.connection && " Check your internet connection."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Interview Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">During Your Interview</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Speak clearly and at normal pace</li>
                  <li>• AI answers will appear in real-time</li>
                  <li>• Use answers as talking points, not scripts</li>
                  <li>• Timer will be visible throughout</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Best Practices</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Keep this tab active and visible</li>
                  <li>• Minimize other applications</li>
                  <li>• Have water nearby</li>
                  <li>• Test your audio setup once more</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Start Button */}
        <div className="text-center">
          <Button
            onClick={handleStartInterview}
            disabled={!allChecksPass || starting}
            className="w-full md:w-auto px-8 py-4 text-lg"
            size="lg"
          >
            {starting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Starting interview...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Start Interview ({session.duration_minutes} minutes)
              </>
            )}
          </Button>
          
          <p className="text-sm text-gray-500 mt-4">
            Your session will begin immediately and cannot be paused
          </p>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
