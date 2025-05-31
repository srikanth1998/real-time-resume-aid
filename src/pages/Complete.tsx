
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, CheckCircle, Download, Home, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Complete = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const sessionId = searchParams.get('session_id');
  const [session, setSession] = useState<any>(null);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessionData = async () => {
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

      setSession(sessionData);

      // Fetch transcripts
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!transcriptError) {
        setTranscripts(transcriptData || []);
      }

      setLoading(false);
    };

    loadSessionData();
  }, [sessionId, navigate]);

  const downloadTranscript = () => {
    const content = transcripts.map((t, index) => {
      return `Q${index + 1}: ${t.question_text}\n\nA${index + 1}: ${t.generated_answer}\n\n---\n\n`;
    }).join('');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Transcript downloaded",
      description: "Your interview transcript has been saved.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading session summary...</p>
        </div>
      </div>
    );
  }

  const sessionDuration = session?.started_at && session?.completed_at 
    ? Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Brain className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">InterviewAce</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Complete!</h1>
        <p className="text-gray-600">Your interview session has ended successfully</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Success Card */}
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-700">Interview Session Completed</CardTitle>
            <CardDescription>
              You successfully completed your {session?.plan_type} plan interview session
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Session Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Session Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{sessionDuration}</p>
                <p className="text-sm text-gray-600">Minutes Used</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{transcripts.length}</p>
                <p className="text-sm text-gray-600">Questions Answered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{session?.plan_type?.toUpperCase()}</p>
                <p className="text-sm text-gray-600">Plan Used</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transcript Download */}
        {transcripts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Interview Transcript</CardTitle>
              <CardDescription>
                Download your complete question and answer history (available for 24 hours)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={downloadTranscript} className="w-full md:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Download Transcript
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>How was your experience?</CardTitle>
            <CardDescription>
              Your feedback helps us improve InterviewAce
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center space-x-2 mb-4">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button key={rating} variant="outline" size="sm">
                  <Star className="h-4 w-4" />
                </Button>
              ))}
            </div>
            <p className="text-center text-sm text-gray-600 mb-4">
              Click to rate your experience (optional)
            </p>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Button 
                onClick={() => navigate('/')}
                variant="outline" 
                className="w-full h-12"
              >
                <Home className="h-4 w-4 mr-2" />
                Book Another Session
              </Button>
              <Button 
                onClick={() => window.open('mailto:support@interviewace.com', '_blank')}
                variant="outline" 
                className="w-full h-12"
              >
                Contact Support
              </Button>
            </div>
            
            <div className="text-center mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-800 font-medium mb-2">🎉 Limited Time Offer</p>
              <p className="text-blue-700 text-sm">
                Get 20% off your next session with code: <strong>NEXTROUND20</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Retention Notice */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <p className="text-amber-800 text-sm text-center">
              <strong>Privacy Notice:</strong> Your interview data will be automatically deleted after 24 hours for your security and privacy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Complete;
