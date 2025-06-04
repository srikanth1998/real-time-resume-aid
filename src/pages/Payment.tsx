import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, ArrowLeft, CreditCard, Loader2, Smartphone, Monitor, SquareStack, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Payment = () => {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const { sessionId, plan } = location.state || {};

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        navigate('/auth');
        return;
      }

      // If no session data in state, redirect back
      if (!sessionId || !plan) {
        navigate('/');
        return;
      }

      // Verify the session belongs to the user
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', authSession.user.id)
        .single();

      if (error || !sessionData) {
        toast({
          title: "Session not found",
          description: "Please select a plan again.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setSession(sessionData);
    };

    checkAuth();
  }, [sessionId, plan, navigate, toast]);

  const handleStripeCheckout = async () => {
    if (!session || !plan) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          sessionId: session.id,
          planType: plan.id,
          priceAmount: plan.priceCents,
          planName: plan.name,
          duration: plan.duration,
          deviceMode: plan.deviceMode || 'single'
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!session || !plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const deviceMode = plan.deviceMode || 'single';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to pricing
          </Button>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">InterviewAce</span>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Complete Your Purchase</CardTitle>
            <CardDescription>
              Secure checkout powered by Stripe
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Plan Summary */}
            <div className={`p-4 rounded-lg border ${
              deviceMode === 'cross' 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <h3 className={`font-semibold ${
                  deviceMode === 'cross' ? 'text-orange-900' : 'text-blue-900'
                }`}>
                  {plan.name} Plan
                </h3>
                <span className={`text-2xl font-bold ${
                  deviceMode === 'cross' ? 'text-orange-900' : 'text-blue-900'
                }`}>
                  {plan.price}
                </span>
              </div>
              <div className={`space-y-2 text-sm ${
                deviceMode === 'cross' ? 'text-orange-700' : 'text-blue-700'
              }`}>
                <p>• {plan.duration} of real-time assistance</p>
                <p>• AI-powered answer generation</p>
                <p>• Resume & job description analysis</p>
                <p>• Live speech-to-text</p>
                <p>• Session transcript access</p>
              </div>
            </div>

            {/* Device Mode Display */}
            <div className={`p-4 rounded-lg border ${
              deviceMode === 'cross' 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className={`font-semibold ${
                  deviceMode === 'cross' ? 'text-orange-900' : 'text-blue-900'
                }`}>
                  Interview Setup
                </h4>
                {deviceMode === 'cross' && (
                  <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                    +20% Premium
                  </span>
                )}
              </div>
              
              {deviceMode === 'single' ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <Monitor className="h-5 w-5 text-blue-600" />
                    <SquareStack className="h-3 w-3 text-blue-500" />
                  </div>
                  <div className="text-sm text-blue-700">
                    <div className="font-medium">Single Device Mode</div>
                    <div className="text-xs">Alt+Tab between meeting & answers</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <Monitor className="h-4 w-4 text-orange-600" />
                    <Wifi className="h-3 w-3 text-orange-500" />
                    <Smartphone className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="text-sm text-orange-700">
                    <div className="font-medium">Cross-Device Mode</div>
                    <div className="text-xs">Laptop for meeting, phone/tablet for answers</div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div className="text-center text-sm text-gray-600 mb-4">
              <p className="mb-2">Secure payment via Stripe</p>
              <div className="flex justify-center items-center space-x-4 text-xs">
                <span>💳 Card</span>
                <span>🍎 Apple Pay</span>
                <span>📱 Google Pay</span>
                <span>💙 PayPal</span>
              </div>
            </div>

            <Button 
              onClick={handleStripeCheckout}
              className="w-full h-12 text-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating checkout...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay {plan.price}
                </>
              )}
            </Button>

            <div className="text-xs text-gray-500 text-center">
              <p>• No refunds after session starts</p>
              <p>• Session expires automatically after {plan.duration}</p>
              <p>• Secure SSL encryption</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>By proceeding, you agree to our</p>
          <p>
            <span className="underline cursor-pointer hover:text-gray-700">Terms of Service</span> and{' '}
            <span className="underline cursor-pointer hover:text-gray-700">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Payment;
