import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Brain, Mail, ArrowLeft, CheckCircle, AlertCircle, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AuthStep = 'email' | 'otp' | 'success';

// Constants for Supabase configuration
const SUPABASE_URL = "https://jafylkqbmvdptrqwwyed.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [currentStep, setCurrentStep] = useState<AuthStep>('email');
  const [loading, setLoading] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState<number>(0);
  const [canResend, setCanResend] = useState(false);
  const [otpError, setOtpError] = useState<string>("");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get plan and device mode from URL params
  const searchParams = new URLSearchParams(location.search);
  const selectedPlan = searchParams.get('plan') || 'basic';
  const deviceMode = searchParams.get('device') || 'single';

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (otpExpiry > 0) {
      const timer = setInterval(() => {
        setOtpExpiry(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [otpExpiry]);

  useEffect(() => {
    // Check for auth errors in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');

    if (error) {
      console.log('Auth error detected:', error, errorDescription);
      
      // Clear the hash from URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      
      if (error === 'access_denied' && errorDescription?.includes('expired')) {
        toast({
          title: "Session expired",
          description: "Please try logging in again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Authentication error",
          description: errorDescription || "There was an error with authentication. Please try again.",
          variant: "destructive"
        });
      }
      setCurrentStep('email');
      return;
    }

    // If no plan is selected, redirect to homepage
    if (!selectedPlan) {
      navigate('/');
    }
  }, [navigate, selectedPlan, toast]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setOtpError("");

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-otp-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setCurrentStep('otp');
      setOtpExpiry(300); // 5 minutes
      setCanResend(false);
      setOtp(""); // Clear any previous OTP
      toast({
        title: "OTP sent!",
        description: "Check your email for the 6-digit code. It will expire in 5 minutes.",
      });

    } catch (error: any) {
      console.error('Send OTP error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otpValue: string) => {
    if (otpValue.length !== 6) return;
    
    setLoading(true);
    setOtpError("");

    try {
      // Validate OTP format on client side
      if (!/^\d{6}$/.test(otpValue)) {
        throw new Error('OTP must be a 6-digit number');
      }

      console.log('Verifying OTP:', { email, otpLength: otpValue.length });

      // Verify the OTP
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, otp: otpValue }),
      });

      const data = await response.json();
      console.log('OTP verification response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      console.log('OTP verified successfully, redirecting to payment...');

      toast({
        title: "Email verified!",
        description: "Redirecting to payment...",
      });

      setCurrentStep('success');

      // Redirect to payment with verified email and plan data
      setTimeout(() => {
        navigate(`/payment?plan=${selectedPlan}&device=${deviceMode}&email=${encodeURIComponent(email)}`);
      }, 1500);

    } catch (error: any) {
      console.error('Verify OTP error:', error);
      const errorMessage = error.message || "Invalid or expired OTP. Please try again.";
      setOtpError(errorMessage);
      
      // Show specific error messages
      if (errorMessage.includes("expired")) {
        toast({
          title: "OTP Expired",
          description: "Your verification code has expired. Please request a new one.",
          variant: "destructive"
        });
        setCanResend(true);
        setOtpExpiry(0);
      } else if (errorMessage.includes("attempts")) {
        toast({
          title: "Too Many Attempts",
          description: "Please request a new verification code.",
          variant: "destructive"
        });
        setCanResend(true);
        setOtpExpiry(0);
      } else {
        toast({
          title: "Verification Failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
      
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setOtpError("");
    await handleSendOtp(new Event('submit') as any);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Email Verified!</CardTitle>
            <CardDescription>
              Redirecting to payment...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (currentStep === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => setCurrentStep('email')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to email
            </Button>
            
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Brain className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">InterviewAce</span>
            </div>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
              <CardDescription>
                We've sent a 6-digit code to <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="otp" className="text-center block">Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    value={otp}
                    onChange={(value) => {
                      setOtp(value);
                      setOtpError(""); // Clear error when user types
                      if (value.length === 6) {
                        handleVerifyOtp(value);
                      }
                    }}
                    maxLength={6}
                    disabled={loading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {otpError && (
                  <p className="text-sm text-red-600 text-center">{otpError}</p>
                )}
              </div>

              {otpExpiry > 0 && (
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                    <Timer className="h-4 w-4" />
                    <span>Code expires in {formatTime(otpExpiry)}</span>
                  </div>
                </div>
              )}

              <div className="text-center">
                {canResend || otpExpiry === 0 ? (
                  <Button 
                    variant="ghost" 
                    onClick={handleResendOtp}
                    disabled={loading}
                  >
                    Resend code
                  </Button>
                ) : (
                  <p className="text-sm text-gray-500">
                    Didn't receive the code? You can resend in {formatTime(otpExpiry)}
                  </p>
                )}
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Tips:</p>
                    <ul className="mt-1 space-y-1">
                      <li>• Check your spam folder if you don't see the email</li>
                      <li>• The code is valid for 5 minutes</li>
                      <li>• Enter all 6 digits to automatically verify</li>
                      <li>• Make sure to use the most recent code if you requested multiple</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <CardTitle className="text-2xl">Verify Your Email</CardTitle>
            <CardDescription>
              Complete email verification for your {selectedPlan} plan ({deviceMode} device)
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-blue-900">{selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan</p>
                  <p className="text-sm text-blue-700">{deviceMode === 'single' ? 'Single Device' : 'Cross-Device'}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Mail className="h-4 w-4 mr-2 animate-pulse" />
                    Sending code...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send verification code
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                We'll send you a 6-digit code to verify your email address before payment.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>By continuing, you agree to our</p>
          <p>
            <span className="underline cursor-pointer hover:text-gray-700">Terms of Service</span> and{' '}
            <span className="underline cursor-pointer hover:text-gray-700">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
