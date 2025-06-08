
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock, Smartphone, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Transcript {
  id: string;
  question_text: string;
  generated_answer: string;
  timestamp: string;
  session_id: string;
  created_at: string;
}

const MobileCompanion = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const sessionId = searchParams.get('session_id');
  const [session, setSession] = useState<any>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔥 Mobile Companion mounted with session ID:', sessionId);
    
    const checkSession = async () => {
      if (!sessionId) {
        console.error('❌ No session ID provided');
        toast({
          title: "No session found",
          description: "Please use the link provided in your email.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching session details for:', sessionId);
        
        // Fetch session details
        const { data: sessionData, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        console.log('📊 Session data:', sessionData);
        console.log('❌ Session error:', error);

        if (error || !sessionData) {
          console.error('❌ Session not found:', error);
          toast({
            title: "Session not found",
            description: "This session ID is not valid or has expired.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        setSession(sessionData);

        console.log('✅ Session found, setting up real-time subscription...');

        // Set up real-time subscription for transcripts
        const channel = supabase
          .channel(`transcripts-${sessionId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'transcripts',
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              console.log('📥 New transcript received via real-time:', payload);
              const newTranscript = payload.new as Transcript;
              setTranscripts(prev => {
                // Check if transcript already exists to avoid duplicates
                const exists = prev.find(t => t.id === newTranscript.id);
                if (exists) {
                  console.log('⚠️ Transcript already exists, skipping duplicate');
                  return prev;
                }
                console.log('➕ Adding new transcript to list');
                return [newTranscript, ...prev];
              });
              
              toast({
                title: "New Question",
                description: `"${newTranscript.question_text.substring(0, 50)}..."`,
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'transcripts',
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              console.log('📝 Transcript updated via real-time:', payload);
              const updatedTranscript = payload.new as Transcript;
              setTranscripts(prev => 
                prev.map(t => t.id === updatedTranscript.id ? updatedTranscript : t)
              );
            }
          )
          .subscribe((status) => {
            console.log('📡 Real-time subscription status:', status);
          });

        console.log('📚 Fetching existing transcripts...');
        
        // Fetch existing transcripts
        const { data: existingTranscripts, error: transcriptError } = await supabase
          .from('transcripts')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false });

        console.log('📋 Existing transcripts:', existingTranscripts);
        console.log('❌ Transcript error:', transcriptError);

        if (existingTranscripts) {
          setTranscripts(existingTranscripts);
          console.log(`✅ Loaded ${existingTranscripts.length} existing transcripts`);
        }

        return () => {
          console.log('🧹 Cleaning up real-time subscription');
          supabase.removeChannel(channel);
        };

      } catch (error) {
        console.error('💥 Error checking session:', error);
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
          <p>Connecting...</p>
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
              This session ID is not valid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Minimal Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 p-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <span className="font-semibold text-gray-900">InterviewAce</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={session.status === 'in_progress' ? "default" : "secondary"} className="text-xs">
              {session.status === 'in_progress' ? 'Live' : 'Ready'}
            </Badge>
            <Badge variant="outline" className="flex items-center space-x-1 text-xs">
              <Clock className="h-3 w-3" />
              <span>{session.duration_minutes}m</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* Questions & Answers */}
      <div className="p-4 space-y-4">
        {transcripts.length === 0 && (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-6 text-center">
              <Smartphone className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <h3 className="font-medium text-gray-900 mb-2">Ready for Questions</h3>
              <p className="text-gray-600 text-sm">
                {session.status === 'in_progress' 
                  ? 'AI answers will appear here as questions are asked in your interview.'
                  : 'Start your interview and questions will appear here in real-time.'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {transcripts.map((transcript, index) => (
          <Card key={transcript.id} className="shadow-sm">
            <CardContent className="p-4">
              {/* Question */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    Q{transcripts.length - index}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(transcript.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="text-gray-800 font-medium leading-relaxed">
                  "{transcript.question_text}"
                </p>
              </div>

              {/* AI Answer */}
              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">AI Answer</span>
                </div>
                <p className="text-blue-900 leading-relaxed text-sm">
                  {transcript.generated_answer}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      {transcripts.length > 0 && (
        <div className="p-4 text-center">
          <p className="text-xs text-gray-500">
            {transcripts.length} question{transcripts.length !== 1 ? 's' : ''} answered
          </p>
        </div>
      )}
    </div>
  );
};

export default MobileCompanion;
