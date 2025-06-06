
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CrossDeviceStatus } from "@/components/CrossDeviceStatus";
import { Brain, Clock, Smartphone, Wifi, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Transcript {
  id: string;
  question_text: string;
  generated_answer: string;
  timestamp: string;
  session_id: string;
}

const MobileCompanion = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const sessionId = searchParams.get('session_id');
  const [session, setSession] = useState<any>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      if (!sessionId) {
        toast({
          title: "No session found",
          description: "Please use the link provided in your email.",
          variant: "destructive"
        });
        return;
      }

      try {
        // Fetch session details
        const { data: sessionData, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('device_mode', 'cross')
          .single();

        if (error || !sessionData) {
          toast({
            title: "Session not found",
            description: "This session is not available for cross-device access.",
            variant: "destructive"
          });
          return;
        }

        setSession(sessionData);
        setIsConnected(true);

        // Set up real-time subscription for transcripts
        const channel = supabase
          .channel('transcripts')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'transcripts',
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              console.log('New transcript received:', payload);
              setTranscripts(prev => [payload.new as Transcript, ...prev]);
            }
          )
          .subscribe();

        // Fetch existing transcripts
        const { data: existingTranscripts } = await supabase
          .from('transcripts')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false });

        if (existingTranscripts) {
          setTranscripts(existingTranscripts);
        }

        return () => {
          supabase.removeChannel(channel);
        };

      } catch (error) {
        console.error('Error checking session:', error);
        toast({
          title: "Error",
          description: "Failed to connect to session.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [sessionId, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Smartphone className="h-8 w-8 animate-pulse mx-auto mb-4 text-purple-600" />
          <p>Connecting to session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Session Not Found</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              This session is not available for cross-device access. Please check your email for the correct mobile link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Brain className="h-6 w-6 text-purple-600" />
          <span className="text-xl font-bold text-gray-900">InterviewAce Mobile</span>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <Badge variant={session.status === 'in_progress' ? "default" : "secondary"}>
            {session.status === 'in_progress' ? 'Live Interview' : 'Waiting...'}
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{session.duration_minutes}m</span>
          </Badge>
        </div>
      </div>

      {/* Connection Status */}
      {sessionId && (
        <CrossDeviceStatus 
          sessionId={sessionId} 
          deviceType="mobile" 
          className="mb-6"
        />
      )}

      {/* Interview Status */}
      {session.status !== 'in_progress' && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Wifi className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">Waiting for interview to start</p>
                <p className="text-sm text-gray-600">
                  AI answers will appear here in real-time when your interview begins.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Answers */}
      <div className="space-y-4">
        {transcripts.length === 0 && session.status === 'in_progress' && (
          <Card>
            <CardContent className="p-6 text-center">
              <Smartphone className="h-8 w-8 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600">
                Listening for questions... AI answers will appear here in real-time.
              </p>
            </CardContent>
          </Card>
        )}

        {transcripts.map((transcript, index) => (
          <Card key={transcript.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      Question {transcripts.length - index}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(transcript.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    {transcript.question_text}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">AI Answer</span>
                </div>
                <p className="text-sm text-blue-900 leading-relaxed">
                  {transcript.generated_answer}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          Keep this page open to receive real-time AI assistance
        </p>
      </div>
    </div>
  );
};

export default MobileCompanion;
