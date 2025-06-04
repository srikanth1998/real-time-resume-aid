
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, CreditCard, Clock, CheckCircle, Loader2, Monitor, Smartphone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const planData = location.state?.plan;

  useEffect(() => {
    if (!planData) {
      toast({
        title: "Missing plan information",
        description: "Please select a plan from the homepage.",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [planData, navigate, toast]);

  const handlePayment = async () => {
    if (!planData) {
      toast({
        title: "Missing information",
        description: "Plan data is missing.",
        variant: "destructive"
      });
      return;
    }

    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Get auth session if available
      const { data: { session: authSession } } = await supabase.auth.getSession();

      console.log('[PAYMENT] Creating checkout session for plan:', planData.id);

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planType: planData.id,
          priceAmount: planData.priceCents,
          planName: planData.name,
          duration: planData.duration,
          deviceMode: planData.deviceMode,
          userEmail: email
        },
        headers: authSession ? {
          Authorization: `Bearer ${authSession.access_token}`
        } : {}
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        console.log('[PAYMENT] Redirecting to Stripe checkout:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      console.error('[PAYMENT] Payment error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to start payment process. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!planData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">Plan information not found.</p>
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
        <p className="text-gray-600">Enter your email and pay securely with Stripe</p>
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
                    <span className="ml-1">Cross-Device</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <Monitor className="h-3 w-3" />
                    <span className="ml-1">Single Device</span>
                  </div>
                )}
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

        {/* Email Input */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <span>Your Email Address</span>
            </CardTitle>
            <CardDescription>
              We'll send your session link to this email after payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-lg"
                required
              />
            </div>
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
                <span className="text-sm">Payment processed securely by Stripe</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                <span className="text-sm">Email sent with your session upload link</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                <span className="text-sm">Click email link to upload documents</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
                <span className="text-sm">Start your AI-powered interview session</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handlePayment}
              disabled={loading || !email}
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
      </div>
    </div>
  );
};

export default Payment;
