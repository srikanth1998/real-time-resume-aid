
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, CreditCard, Clock, CheckCircle, Loader2, Monitor, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);

  const planData = location.state?.plan;
  const sessionId = location.state?.sessionId;

  useEffect(() => {
    const verifySession = async () => {
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
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession) {
          navigate('/auth');
          return;
        }

        // Verify session exists and belongs to user
        const { data: session, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('user_id', authSession.user.id)
          .single();

        if (error || !session) {
          toast({
            title: "Session not found",
            description: "Please start a new session.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // Check if session is already paid
        if (session.status !== 'pending_payment') {
          if (session.status === 'pending_assets') {
            navigate(`/upload?session_id=${sessionId}`);
            return;
          } else if (session.status === 'assets_received') {
            navigate(`/lobby?session_id=${sessionId}`);
            return;
          } else if (session.status === 'in_progress') {
            navigate(`/interview?session_id=${sessionId}`);
            return;
          }
        }

        setSessionData(session);
      } catch (error) {
        console.error('Error verifying session:', error);
        toast({
          title: "Error",
          description: "Failed to verify session. Please try again.",
          variant: "destructive"
        });
        navigate('/');
      } finally {
        setVerifyingSession(false);
      }
    };

    verifySession();
  }, [sessionId, navigate, toast]);

  const handlePayment = async () => {
    if (!sessionData || !planData) {
      toast({
        title: "Missing information",
        description: "Session or plan data is missing.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        navigate('/auth');
        return;
      }

      console.log('Creating checkout session with data:', {
        sessionId: sessionData.id,
        planType: planData.id,
        priceAmount: planData.priceCents,
        planName: planData.name,
        duration: planData.duration,
        deviceMode: planData.deviceMode
      });

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          sessionId: sessionData.id,
          planType: planData.id,
          priceAmount: planData.priceCents,
          planName: planData.name,
          duration: planData.duration,
          deviceMode: planData.deviceMode
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to start payment process. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifyingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!sessionData || !planData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">Session information not found.</p>
            <Button onClick={() => navigate('/')}>
              Return to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Brain className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">InterviewAce</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Payment</h1>
        <p className="text-gray-600">Secure your interview session with Stripe</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Plan Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{planData.name} Plan</span>
              <Badge variant="secondary">
                {planData.deviceMode === 'cross' ? (
                  <div className="flex items-center space-x-1">
                    <Monitor className="h-3 w-3" />
                    <span>+</span>
                    <Smartphone className="h-3 w-3" />
                  </div>
                ) : (
                  <Monitor className="h-3 w-3" />
                )}
                <span className="ml-1">
                  {planData.deviceMode === 'cross' ? 'Cross-Device' : 'Single Device'}
                </span>
              </Badge>
            </CardTitle>
            <CardDescription>
              {planData.duration} of AI-powered interview assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center text-lg">
              <span className="font-medium">Total:</span>
              <span className="text-2xl font-bold text-blue-600">{planData.price}</span>
            </div>
            {planData.deviceMode === 'cross' && (
              <p className="text-sm text-orange-600 mt-2">
                Includes 20% premium for cross-device experience
              </p>
            )}
          </CardContent>
        </Card>

        {/* What Happens Next */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>What happens after payment?</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                <span className="text-sm">Payment confirmation & session activation</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                <span className="text-sm">Email sent with document upload link</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                <span className="text-sm">Upload resume and job description</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
                <span className="text-sm">Start your AI-powered interview</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-6 text-lg font-semibold"
              size="lg"
            >
              {loading ? (
                <>
                  <Clock className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pay {planData.price} - Start Session
                </>
              )}
            </Button>

            <div className="mt-6 text-center">
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <span>🔒 SSL Encrypted</span>
                <span>💳 Stripe Secure</span>
                <span>🛡️ PCI Compliant</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Your payment information is processed securely by Stripe
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Session Info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          Session ID: {sessionData.id}
        </div>
      </div>
    </div>
  );
};

export default Payment;
