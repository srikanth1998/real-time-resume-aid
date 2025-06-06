
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
  
  const planType = (searchParams.get('plan') as 'basic' | 'pro') || 'basic';
  const [email, setEmail] = useState('');
  const [deviceMode, setDeviceMode] = useState<'single' | 'cross'>('single');
  const [loading, setLoading] = useState(false);

  const planConfig = {
    basic: {
      price: 9.99,
      duration: 15,
      description: "Basic interview preparation",
      features: [
        "15-minute session",
        "AI-powered question generation",
        "Real-time answer suggestions",
      ],
    },
    pro: {
      price: 19.99,
      duration: 30,
      description: "Advanced interview preparation",
      features: [
        "30-minute session",
        "AI-powered question generation",
        "Real-time answer suggestions",
        "Detailed performance analysis",
      ],
    },
  }[planType];

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
          planType,
          userEmail: email, // Changed from 'email' to 'userEmail'
          deviceMode,
          priceAmount: Math.round(planConfig.price * 100), // Convert to cents
          planName: `${planType.charAt(0).toUpperCase() + planType.slice(1)}`, // Capitalize plan name
          duration: `${planConfig.duration} minutes`, // Add duration string
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/payment?plan=${planType}`
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
        <p className="text-gray-600">Start your interview preparation session</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleCheckout} className="space-y-8">
          {/* Plan Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="capitalize">{planType} Plan</span>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <DollarSign className="h-4 w-4" />
                  <span>${planConfig.price}</span>
                </Badge>
              </CardTitle>
              <CardDescription>
                {planConfig.duration} minutes • {planConfig.description}
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
          <DeviceModeSelector 
            value={deviceMode} 
            onChange={setDeviceMode}
          />

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
                />
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
            ) : (
              <>
                Continue to Payment • ${planConfig.price}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Payment;
