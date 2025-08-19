import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Brain, Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthModeSelector } from "@/components/auth/AuthModeSelector";
import { useHybridAuth } from "@/hooks/useHybridAuth";

type AuthStep = 'mode-select' | 'login' | 'signup' | 'success';
type AuthAction = 'signin' | 'signup';

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentStep, setCurrentStep] = useState<AuthStep>('mode-select');
  const [authAction, setAuthAction] = useState<AuthAction>('signin');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const {
    mode,
    user,
    session,
    isLoading,
    startSessionMode,
    upgradeToAccount,
    signInToAccount,
    signOut
  } = useHybridAuth();
  
  // Get plan and device mode from URL params
  const searchParams = new URLSearchParams(location.search);
  const selectedPlan = searchParams.get('plan');
  const deviceMode = searchParams.get('device') || 'single';
  const quota = searchParams.get('quota');
  const total = searchParams.get('total');
  const returnUrl = searchParams.get('return') || '/dashboard';

  // Check if user is already authenticated
  useEffect(() => {
    if (!isLoading && user && session) {
      // User is already logged in, redirect appropriately
      if (selectedPlan) {
        const paymentParams = new URLSearchParams({
          plan: selectedPlan,
          device: deviceMode
        });
        if (quota) paymentParams.append('quota', quota);
        if (total) paymentParams.append('total', total);
        navigate(`/payment?${paymentParams.toString()}`);
      } else {
        navigate(returnUrl);
      }
    }
  }, [user, session, isLoading, navigate, selectedPlan, deviceMode, quota, total, returnUrl]);

  const handleModeSelect = (selectedMode: 'session' | 'account') => {
    if (selectedMode === 'session') {
      startSessionMode();
      if (selectedPlan) {
        const paymentParams = new URLSearchParams({
          plan: selectedPlan,
          device: deviceMode,
          session: 'true'
        });
        if (quota) paymentParams.append('quota', quota);
        if (total) paymentParams.append('total', total);
        navigate(`/payment?${paymentParams.toString()}`);
      } else {
        navigate('/dashboard?session=true');
      }
    } else {
      setCurrentStep('login');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInToAccount(email, password);
      
      toast({
        title: "Welcome back!",
        description: "Successfully signed in to your account.",
      });

      if (selectedPlan) {
        const paymentParams = new URLSearchParams({
          plan: selectedPlan,
          device: deviceMode
        });
        if (quota) paymentParams.append('quota', quota);
        if (total) paymentParams.append('total', total);
        navigate(`/payment?${paymentParams.toString()}`);
      } else {
        navigate(returnUrl);
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      await upgradeToAccount(email, password);
      
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      setCurrentStep('success');
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: "Sign up failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-white">Account Created!</CardTitle>
            <CardDescription className="text-gray-300">
              Please check your email to verify your account.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (currentStep === 'mode-select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <Button
              variant="ghost"
              className="mb-4 text-white hover:text-gray-300"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to home
            </Button>
            
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Brain className="h-8 w-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">InterviewAce</span>
            </div>
          </div>

          <AuthModeSelector onModeSelect={handleModeSelect} />
        </div>
      </div>
    );
  }

  if (currentStep === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Button
              variant="ghost"
              className="mb-4 text-white hover:text-gray-300"
              onClick={() => setCurrentStep('mode-select')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to mode selection
            </Button>
            
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Brain className="h-8 w-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">InterviewAce</span>
            </div>
          </div>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white">
                {authAction === 'signin' ? 'Sign In' : 'Create Account'}
              </CardTitle>
              <CardDescription className="text-gray-300">
                {authAction === 'signin' 
                  ? 'Welcome back to your InterviewAce account'
                  : 'Join InterviewAce for enhanced features'
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    authAction === 'signin'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  onClick={() => setAuthAction('signin')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    authAction === 'signup'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  onClick={() => setAuthAction('signup')}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={authAction === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                {authAction === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {authAction === 'signin' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      {authAction === 'signin' ? 'Sign In' : 'Create Account'}
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-gray-400">
                  {authAction === 'signin' ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    className="text-blue-400 hover:text-blue-300 underline"
                    onClick={() => setAuthAction(authAction === 'signin' ? 'signup' : 'signin')}
                  >
                    {authAction === 'signin' ? 'Create one' : 'Sign in'}
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // This should never be reached, but just in case
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <Brain className="h-16 w-16 mx-auto mb-4 text-blue-400" />
        <h1 className="text-2xl font-bold mb-2">InterviewAce</h1>
        <p className="text-gray-300">Loading authentication...</p>
      </div>
    </div>
  );
};

export default Auth;
