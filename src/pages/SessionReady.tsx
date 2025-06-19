import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

export default function SessionReady() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        console.error("No session ID provided");
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (error) {
          console.error("Error fetching session:", error);
          return;
        }

        setSession(data);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-2xl font-bold">
              Interview Session Ready
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Session Code Display */}
        {session?.session_code && (
          <Card className="mb-8 border-2 border-green-500 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  Your Session Code
                </h3>
                <div className="bg-white p-4 rounded-lg border-2 border-green-300 mb-4">
                  <code className="text-2xl font-mono font-bold text-green-700">
                    {session.session_code}
                  </code>
                </div>
                <p className="text-green-700 text-sm">
                  Use this code to connect your overlay assistant during the interview
                </p>
                <Button
                  onClick={() => window.open('/overlay', '_blank')}
                  className="mt-4 bg-green-600 hover:bg-green-700"
                >
                  Open Overlay Assistant
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading session details...
              </div>
            ) : (
              <>
                {session ? (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Session Details</h2>
                    <p>
                      Session ID: <code>{session.id}</code>
                    </p>
                    <p>
                      Job Role: <code>{session.job_role}</code>
                    </p>
                    <p>
                      Duration: <code>{session.duration_minutes} minutes</code>
                    </p>
                    <Button onClick={() => navigate(`/interview?session_id=${sessionId}`)}>
                      Start Interview
                    </Button>
                  </div>
                ) : (
                  <p>Session not found.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
