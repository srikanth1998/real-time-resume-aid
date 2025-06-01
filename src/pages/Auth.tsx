
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Brain, Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const selectedPlan = location.state?.selectedPlan;

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
          title: "Magic link expired",
          description: "The magic link has expired. Please request a new one.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Authentication error",
          description: errorDescription || "There was an error with authentication. Please try again.",
          variant: "destructive"
        });
      }
      return;
    }

    // Check if user is already authenticated
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (selectedPlan) {
          // Create a new session for the selected plan
          try {
            const { data: newSession, error } = await supabase
              .from('sessions')
              .insert({
                user_id: session.user.id,
                plan_type: selectedPlan.id as 'standard' | 'pro' | 'elite',
                duration_minutes: selectedPlan.durationMinutes,
                price_cents: selectedPlan.priceCents,
                status: 'pending_assets'
              })
              .select()
              .single();

            if (error) {
              console.error('Error creating session:', error);
              toast({
                title: "Error",
                description: "Failed to create session. Please try again.",
                variant: "destructive"
              });
              return;
            }

            // Redirect to upload page with session ID
            navigate(`/upload?session_id=${newSession.id}`);
          } catch (error) {
            console.error('Session creation error:', error);
            toast({
              title: "Error",
              description: "Failed to create session. Please try again.",
              variant: "destructive"
            });
          }
        } else {
          navigate('/');
        }
      }
    };
    
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        if (selectedPlan) {
          // Create session and redirect to upload
          setTimeout(async () => {
            try {
              const { data: newSession, error } = await supabase
                .from('sessions')
                .insert({
                  user_id: session.user.id,
                  plan_type: selectedPlan.id as 'standard' | 'pro' | 'elite',
                  duration_minutes: selectedPlan.durationMinutes,
                  price_cents: selectedPlan.priceCents,
                  status: 'pending_assets'
                })
                .select()
                .single();

              if (error) {
                console.error('Error creating session:', error);
                toast({
                  title: "Error",
                  description: "Failed to create session. Please try again.",
                  variant: "destructive"
                });
                return;
              }

              navigate(`/upload?session_id=${newSession.id}`);
            } catch (error) {
              console.error('Session creation error:', error);
              navigate('/');
            }
          }, 100);
        } else {
          navigate('/');
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, selectedPlan, toast]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clear any existing auth state
      await supabase.auth.signOut();
      
      // Use the current origin for redirect URL
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true
        }
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      toast({
        title: "Magic link sent!",
        description: "Check your email for the login link. The link will expire in 60 minutes.",
      });

    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send magic link. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a magic link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Important:</p>
                  <p>Click the link in your email within 60 minutes. If you don't see the email, check your spam folder.</p>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setEmailSent(false);
                setEmail("");
              }}
            >
              Send another link
            </Button>
          </CardContent>
        </Card>
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
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              {selectedPlan 
                ? `Continue with your ${selectedPlan.name} plan`
                : "Enter your email to get started"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {selectedPlan && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-blue-900">{selectedPlan.name} Plan</p>
                    <p className="text-sm text-blue-700">{selectedPlan.duration} • {selectedPlan.price}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleMagicLink} className="space-y-4">
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
                    Sending magic link...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send magic link
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                No password required. We'll send you a secure login link that expires in 60 minutes.
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
