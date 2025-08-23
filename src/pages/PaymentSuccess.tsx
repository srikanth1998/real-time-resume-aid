import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, CheckCircle, Mail, Clock, Code, Image, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

console.log('PaymentSuccess module loading at:', new Date().toISOString());

const PaymentSuccess = () => {
  console.log('PaymentSuccess component rendering at:', new Date().toISOString());
  console.log('PaymentSuccess component loaded - URL:', window.location.href);
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  console.log('PaymentSuccess: sessionId from URL:', sessionId);
  
  const [loading, setLoading] = useState(true);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);

  useEffect(() => {
    console.log('PaymentSuccess: useEffect started');
    
    const processSession = async () => {
      try {
        console.log('PaymentSuccess: processSession function called');
        
        if (!sessionId) {
          console.error('PaymentSuccess: No session ID provided in URL');
          navigate('/');
          return;
        }

        setLoading(true);
        console.log('PaymentSuccess: Processing session:', sessionId);

        // Get session details to check plan type
        console.log('PaymentSuccess: Fetching session from database');
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('plan_type, device_mode, status, session_code')
          .eq('id', sessionId)
          .maybeSingle();

        console.log('PaymentSuccess: Session fetch result:', { session, sessionError });

        if (sessionError) {
          console.error('PaymentSuccess: Session fetch error:', sessionError);
          toast.error('Error fetching session details');
          navigate('/');
          return;
        }

        if (!session) {
          console.error('PaymentSuccess: Session not found for ID:', sessionId);
          toast.error('Session not found');
          navigate('/');
          return;
        }

        setPlanType(session.plan_type);
        console.log('PaymentSuccess: Session plan type:', session.plan_type);

        // For coding-helper and question-analysis, generate session code directly
        if (session.plan_type === 'coding-helper' || session.plan_type === 'question-analysis') {
          console.log('PaymentSuccess: Generating session code for plan:', session.plan_type);
          const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
          console.log('PaymentSuccess: Generated code:', generatedCode);
          
          // Update session with code and set status to assets_received
          const { error: updateError } = await supabase
            .from('sessions')
            .update({
              session_code: generatedCode,
              status: 'assets_received',
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);

          console.log('PaymentSuccess: Database update result:', { updateError });

          if (updateError) {
            console.error('PaymentSuccess: Session update error:', updateError);
            toast.error('Failed to prepare session');
            navigate('/');
            return;
          }

          setSessionCode(generatedCode);
          console.log('PaymentSuccess: Session code set in state:', generatedCode);
          
          // Send email with session code
          try {
            console.log('PaymentSuccess: Sending email with session code');
            await supabase.functions.invoke('send-session-email', {
              body: {
                email: searchParams.get('email') || '',
                sessionId,
                sessionCode: generatedCode,
                planType: session.plan_type === 'coding-helper' ? 'Coding Helper' : 'Question Analysis',
                jobRole: session.plan_type === 'coding-helper' ? 'Developer' : 'Analyst'
              }
            });
            console.log('PaymentSuccess: Email sent successfully');
            toast.success("Session code sent to your email!");
          } catch (emailError) {
            console.error('PaymentSuccess: Email sending error:', emailError);
            toast.warning("Session created but email could not be sent");
          }
          
        } else {
          // For quick-session, generate session code and redirect to upload page  
          console.log('PaymentSuccess: Processing quick-session plan');
          const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
          
          // Update session with code
          const { error: updateError } = await supabase
            .from('sessions')
            .update({
              session_code: generatedCode,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);

          if (updateError) {
            console.error('PaymentSuccess: Session update error:', updateError);
            toast.error('Failed to prepare session');
            navigate('/');
            return;
          }

          setSessionCode(generatedCode);
          
          // Redirect to upload page with session code
          setTimeout(() => {
            navigate(`/upload?sessionId=${sessionId}&session_id=${sessionId}&email=${encodeURIComponent(searchParams.get('email') || '')}`);
          }, 3000);
        }

      } catch (error) {
        console.error('PaymentSuccess: Processing error:', error);
        toast.error('Failed to process session');
        navigate('/');
      } finally {
        console.log('PaymentSuccess: Setting loading to false');
        setLoading(false);
      }
    };

    processSession();
  }, [sessionId, navigate, searchParams]);

  const getPlanIcon = () => {
    if (planType === 'coding-helper') return <Code className="h-8 w-8 text-green-600" />;
    if (planType === 'question-analysis') return <Image className="h-8 w-8 text-purple-600" />;
    return <Mail className="h-8 w-8 text-green-600" />;
  };

  const getPlanName = () => {
    if (planType === 'coding-helper') return 'Coding Helper';
    if (planType === 'question-analysis') return 'Question Analysis';
    return 'Interview Session';
  };

  const getNextStepMessage = () => {
    if (planType === 'coding-helper' || planType === 'question-analysis') {
      return 'Your session is ready! Use the code below to connect your desktop app.';
    }
    return 'Upload your resume and job description to complete setup.';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">InterviewAce</span>
          </div>
          <div className="flex items-center justify-center mb-4">
            {loading ? (
              <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
            ) : (
              <CheckCircle className="h-16 w-16 text-green-500" />
            )}
          </div>
          <CardTitle className="text-2xl text-green-600">
            {loading ? 'Processing Payment...' : 'Payment Successful!'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {loading ? (
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <Loader2 className="h-8 w-8 text-blue-600 mx-auto mb-3 animate-spin" />
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Setting up your session...</h3>
              <p className="text-blue-700">Please wait while we prepare your {planType ? getPlanName() : 'session'}.</p>
            </div>
          ) : (
            <>
              {/* Success Message */}
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                {getPlanIcon()}
                <h3 className="text-lg font-semibold text-green-800 mb-2">{getPlanName()} Ready!</h3>
                <p className="text-green-700">{getNextStepMessage()}</p>
              </div>

              {/* Session Code Display - Only for coding-helper and question-analysis */}
              {sessionCode && (planType === 'coding-helper' || planType === 'question-analysis') && (
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4">Your Session Code</h3>
                  <div className="text-4xl font-mono font-bold text-blue-900 tracking-wider mb-2 bg-white p-4 rounded border">
                    {sessionCode}
                  </div>
                  <p className="text-blue-700 text-sm">
                    Use this code in your desktop app to connect to your session
                  </p>
                </div>
              )}

              {/* General Info */}
              <div className="space-y-3 text-gray-600">
                <div className="flex items-center justify-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>⏰ Session expires automatically after 24 hours</span>
                </div>
                <p>🔒 Secure & private - your data is protected</p>
              </div>

              {sessionId && (
                <div className="text-sm text-gray-500 border-t pt-4">
                  <p><strong>Session ID:</strong> {sessionId}</p>
                </div>
              )}

              <div className="text-sm text-blue-700">
                This is your final session page. Use the code above in your desktop app.
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;