
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Clock, DollarSign, CheckCircle, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Payment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const planType = searchParams.get('plan') || 'pay-as-you-go';
  
  const [email, setEmail] = useState('');
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(false);

  const basePrice = 9.99; // $9.99 per hour
  const totalPrice = basePrice * hours;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);

    try {
      console.log('Creating checkout session for quick session');
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planType: 'pay-as-you-go',
          userEmail: email || 'guest@interviewace.com', // Default email for guest checkout
          deviceMode: 'single', // Quick sessions are single device
          hours: hours,
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Interview Session</h1>
        <p className="text-gray-600">Pay per hour - No account required</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleCheckout} className="space-y-8">
          
          {/* Hour Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Session Duration</span>
              </CardTitle>
              <CardDescription>
                Select how many hours you need for your interview session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => setHours(hour)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        hours === hour
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg font-semibold">{hour}h</div>
                      <div className="text-sm text-gray-500">${(basePrice * hour).toFixed(2)}</div>
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Selected: {hours} hour{hours > 1 ? 's' : ''}</p>
                    <p className="text-sm text-gray-600">
                      ${basePrice}/hour × {hours} = ${totalPrice.toFixed(2)}
                    </p>
                  </div>
                  <Badge variant="outline">
                    ${totalPrice.toFixed(2)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optional Email Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Email (Optional)</span>
              </CardTitle>
              <CardDescription>
                We'll send your interview report and session details to this email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-sm text-gray-600">
                  Leave empty for anonymous session. You'll still get a session code to connect.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features Display */}
          <Card>
            <CardHeader>
              <CardTitle>What's Included</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  'Real-time AI coaching overlay',
                  'Invisible to screen sharing',
                  'Technical & behavioral question support',
                  'Session recording & report',
                  '6-digit code for native helper access'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
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
                Processing Payment...
              </>
            ) : (
              <>
                <DollarSign className="h-5 w-5 mr-2" />
                Pay ${totalPrice.toFixed(2)} & Continue
              </>
            )}
          </Button>
        </form>

        <div className="text-center mt-6 text-sm text-gray-500">
          After payment, you'll upload your resume and job details to prepare your AI coach
        </div>
      </div>
    </div>
  );
};

export default Payment;
