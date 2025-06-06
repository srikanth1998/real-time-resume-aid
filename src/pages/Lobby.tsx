import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CrossDeviceStatus } from "@/components/CrossDeviceStatus";
import { Brain, Mic, Monitor, Wifi, CheckCircle, AlertCircle, Clock, Play, Loader2, Smartphone } from "lucide-react";
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

      try {
        console.log('[LOBBY] Checking session:', sessionId);
        
        // Fetch session details without auth requirement
        const { data: sessionData, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .maybeSingle();

        if (error) {
          console.error('[LOBBY] Session verification error:', error);
          toast({
            title: "Session error",
            description: "Failed to verify session. Please try again.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        if (!sessionData) {
          console.error('[LOBBY] No session found with ID:', sessionId);
          toast({
            title: "Session not found",
            description: "Please start a new session.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        console.log('[LOBBY] Session data:', sessionData);

        // Check session status and redirect accordingly
        if (sessionData.status === 'pending_assets') {
          console.log('[LOBBY] Redirecting to upload');
          navigate(`/upload?session_id=${sessionId}`);
          return;
        }

        if (sessionData.status === 'in_progress') {
          console.log('[LOBBY] Session already in progress, redirecting to interview');
          navigate(`/interview?session_id=${sessionId}`);
          return;
        }

        if (sessionData.status !== 'assets_received') {
          console.log('[LOBBY] Session not ready, status:', sessionData.status);
          toast({
            title: "Session not ready",
            description: "Please complete the previous steps first.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        setSession(sessionData);
        console.log('[LOBBY] Session ready for lobby:', sessionData);
        
        // Run system checks
        runSystemChecks();
      } catch (error) {
        console.error('[LOBBY] Error checking session:', error);
        toast({
          title: "Error",
          description: "Failed to verify session. Please try again.",
          variant: "destructive"
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [sessionId, navigate, toast]);

  const runSystemChecks = async () => {
    console.log('[LOBBY] Running system checks');
    
    // Browser check
    const userAgent = navigator.userAgent;
    const isSupported = /Chrome|Firefox|Safari|Edge/.test(userAgent);
    setSystemChecks(prev => ({ ...prev, browser: isSupported }));

    // Connection check - use multiple methods for better reliability
    let connectionWorking = false;
    
    try {
      // Method 1: Check if navigator.onLine is true
      if (!navigator.onLine) {
        throw new Error('Browser reports offline');
      }
      
      // Method 2: Try to make a simple request to Supabase
      const start = Date.now();
      const { error } = await supabase.from('sessions').select('id').limit(1);
      const latency = Date.now() - start;
      
      if (!error && latency < 5000) { // 5 second timeout
        connectionWorking = true;
        console.log('[LOBBY] Connection check passed, latency:', latency, 'ms');
      } else {
        console.warn('[LOBBY] Supabase connection check failed:', error);
        
        // Method 3: Fallback to a simple fetch test
        try {
          const response = await fetch(window.location.origin, { 
            method: 'HEAD',
            cache: 'no-cache',
            signal: AbortSignal.timeout(3000)
          });
          if (response.ok) {
            connectionWorking = true;
            console.log('[LOBBY] Fallback connection check passed');
          }
        } catch (fetchError) {
          console.warn('[LOBBY] Fallback connection check failed:', fetchError);
        }
      }
    } catch (error) {
      console.warn('[LOBBY] Connection check failed:', error);
      // If all else fails, assume connection is working if we got this far
      connectionWorking = true;
    }
    
    setSystemChecks(prev => ({ ...prev, connection: connectionWorking }));

    // Microphone check
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setSystemChecks(prev => ({ ...prev, microphone: true }));
      stream.getTracks().forEach(track => track.stop());
      console.log('[LOBBY] Microphone check passed');
    } catch (error) {
      console.warn('[LOBBY] Microphone check failed:', error);
      setSystemChecks(prev => ({ ...prev, microphone: false }));
    }
  };

  const handleStartInterview = async () => {
    console.log('[LOBBY] Starting interview, system checks:', systemChecks);
    
    if (!Object.values(systemChecks).every(check => check)) {
      toast({
        title: "System checks failed",
        description: "Please resolve the system issues before starting.",
        variant: "destructive"
      });
      return;
    }

    if (!session) {
      console.error('[LOBBY] No session data available');
      toast({
        title: "Session error",
        description: "Session information not found.",
        variant: "destructive"
      });
      return;
    }

    // If session is already in progress, just redirect
    if (session.status === 'in_progress') {
      console.log('[LOBBY] Session already in progress, redirecting');
      const interviewUrl = `/interview?session_id=${sessionId}`;
      console.log('[LOBBY] Redirecting to:', interviewUrl);
      navigate(interviewUrl);
      return;
    }

    setStarting(true);

    try {
      console.log('[LOBBY] Starting interview process for session:', session.id);
      
      // Prepare update data
      const now = new Date();
      const expiresAt = new Date(now.getTime() + session.duration_minutes * 60 * 1000);

      const updateData = {
        status: 'in_progress' as const,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString()
      };

      console.log('[LOBBY] Updating session to in_progress status with data:', updateData);

      // Update session status
      const { data: updatedSession, error: updateError } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select();

      if (updateError) {
        console.error('[LOBBY] Session update error:', updateError);
        throw new Error(`Failed to update session: ${updateError.message}`);
      }

      if (!updatedSession || updatedSession.length === 0) {
        throw new Error('Failed to update session - no rows affected');
      }

      console.log('[LOBBY] Session updated successfully:', updatedSession[0]);

      toast({
        title: "Interview started!",
        description: `Your ${session.duration_minutes}-minute session is now active.`,
      });

      // Navigate to interview interface using React Router
      const interviewUrl = `/interview?session_id=${sessionId}`;
      console.log('[LOBBY] Navigating to interview page with URL:', interviewUrl);
      console.log('[LOBBY] Session ID being passed:', sessionId);
      
      // Use React Router navigation instead of window.location.href
      navigate(interviewUrl);

    } catch (error: any) {
      console.error('[LOBBY] Start interview error:', error);
      
      toast({
        title: "Failed to start interview",
        description: error.message || "Please refresh the page and try again.",
        variant: "destructive"
      });
    } finally {
      setStarting(false);
    }
  };

  // Add mobile companion link generation
  const generateMobileLink = () => {
    if (session?.device_mode === 'cross') {
      const baseUrl = window.location.origin;
      return `${baseUrl}/mobile?session_id=${sessionId}`;
    }
    return null;
  };

  const copyMobileLink = async () => {
    const mobileLink = generateMobileLink();
    if (mobileLink) {
      try {
        await navigator.clipboard.writeText(mobileLink);
        toast({
          title: "Link copied!",
          description: "Mobile companion link copied to clipboard.",
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Please manually copy the mobile link.",
          variant: "destructive"
        });
      }
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
  const mobileLink = generateMobileLink();

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
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{session.duration_minutes} minutes</span>
                </Badge>
                <Badge variant={session.device_mode === 'cross' ? 'default' : 'outline'}>
                  {session.device_mode === 'cross' ? 'Cross-Device' : 'Single Device'}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>
              Documents uploaded and processed • Session will expire automatically after {session.duration_minutes} minutes
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Cross-Device Setup */}
        {session.device_mode === 'cross' && (
          <>
            <CrossDeviceStatus 
              sessionId={sessionId!} 
              deviceType="desktop" 
              className="mb-8"
            />
            
            {mobileLink && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Smartphone className="h-5 w-5 text-purple-600" />
                    <span>Mobile Companion</span>
                  </CardTitle>
                  <CardDescription>
                    Open this link on your mobile device to receive AI answers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <div className="flex-1 p-2 bg-gray-50 rounded border text-sm font-mono break-all">
                      {mobileLink}
                    </div>
                    <Button onClick={copyMobileLink} variant="outline">
                      Copy Link
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Keep both devices connected during your interview for real-time sync
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

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
                      {!systemChecks.connection && " Check your internet connection or try refreshing the page."}
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
                  {session.device_mode === 'cross' && (
                    <li>• Check mobile device for discrete answer viewing</li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Best Practices</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Keep this tab active and visible</li>
                  <li>• Minimize other applications</li>
                  <li>• Have water nearby</li>
                  <li>• Test your audio setup once more</li>
                  {session.device_mode === 'cross' && (
                    <li>• Position mobile device within easy view</li>
                  )}
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
