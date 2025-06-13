
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeviceModeSelector } from "@/components/DeviceModeSelector";
import { Brain, Clock, DollarSign, CheckCircle, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Payment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const planType = (searchParams.get('plan') as 'pay-as-you-go' | 'pro' | 'coach' | 'enterprise') || 'pay-as-you-go';
  const verifiedEmail = searchParams.get('email') || '';
  const initialDeviceMode = (searchParams.get('device') as 'single' | 'cross') || 'single';
  
  const [email, setEmail] = useState(verifiedEmail);
  const [deviceMode, setDeviceMode] = useState<'single' | 'cross'>(initialDeviceMode);
  const [loading, setLoading] = useState(false);

  const planConfigs = {
    'pay-as-you-go': {
      price: 18.00,
      duration: '60 minutes',
      billing: 'one-time',
      dbPlanType: 'standard', // Map to database enum
      description: "Single session clarity coaching",
      features: [
        "60-min private coaching overlay",
        "Real-time insight reminders", 
        "Zero data retention",
        "Works on all video platforms",
        "Instant session activation"
      ],
    },
    'pro': {
      price: 29.00,
      duration: '4 sessions',
      billing: 'monthly',
      dbPlanType: 'pro',
      description: "Active job seekers",
      features: [
        "4 coaching sessions per month",
        "Priority processing (≤3s)",
        "Session rollover (1 month)",
        "Extended storage (24h)",
        "Performance insights"
      ],
    },
    'coach': {
      price: 99.00,
      duration: '20 credits',
      billing: 'monthly',
      dbPlanType: 'elite',
      description: "Career coaches & consultants",
      features: [
        "20 session credits (shareable)",
        "Client management portal",
        "Branded session reports",
        "Custom coaching prompts", 
        "White-label options"
      ],
    },
    'enterprise': {
      price: 0,
      duration: '500+ credits',
      billing: 'custom',
      dbPlanType: 'elite',
      description: "Organizations & platforms",
      features: [
        "Unlimited sessions",
        "SSO integration",
        "API access",
        "Dedicated support",
        "Custom deployment"
      ],
    }
  };

  const planConfig = planConfigs[planType as keyof typeof planConfigs];
  
  if (!planConfig) {
    navigate('/');
    return null;
  }

  // Calculate total price with cross-device surcharge
  const basePrice = planConfig.price;
  const crossDeviceSurcharge = deviceMode === 'cross' ? 5.00 : 0;
  const totalPrice = basePrice + crossDeviceSurcharge;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Handle enterprise plan differently
    if (planType === 'enterprise') {
      toast({
        title: "Enterprise Plans",
        description: "Enterprise plans require custom pricing. Please contact our sales team.",
        variant: "default"
      });
      return;
    }
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      console.log('Creating checkout session with device mode:', deviceMode);
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planType: planConfig.dbPlanType, // Use mapped database enum value
          userEmail: email,
          deviceMode,
          totalPrice: Math.round(totalPrice * 100) // Convert to cents
        }
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create checkout session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Brain className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">InterviewAce</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Purchase</h1>
        <p className="text-gray-600">Secure payment for your interview preparation session</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleCheckout} className="space-y-8">
          {/* Plan Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="capitalize">{planType.replace('-', ' ')} Plan</span>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <DollarSign className="h-4 w-4" />
                  <span>{totalPrice === 0 ? 'Custom quote' : `$${totalPrice.toFixed(2)}`}</span>
                </Badge>
              </CardTitle>
              <CardDescription>
                {planConfig.duration} • {planConfig.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {planConfig.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Device Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Session Configuration</CardTitle>
              <CardDescription>
                Choose how you'll access your coaching session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceModeSelector 
                value={deviceMode} 
                onChange={setDeviceMode}
              />
              {deviceMode === 'cross' && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Cross-Device Mode
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Mobile companion app included
                      </p>
                    </div>
                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                      +$5.00
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Contact Information</span>
              </CardTitle>
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
                  required
                  disabled={!!verifiedEmail}
                />
                {verifiedEmail && (
                  <p className="text-sm text-green-600 flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>Email verified</span>
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  {deviceMode === 'cross' 
                    ? "We'll send you a mobile companion link after payment"
                    : "We'll send you the upload link after payment"
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Checkout Button */}
          <Button 
            type="submit" 
            className="w-full py-6 text-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : planType === 'enterprise' ? (
              'Contact Sales Team'
            ) : (
              <>
                Complete Payment • ${totalPrice.toFixed(2)}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Payment;
