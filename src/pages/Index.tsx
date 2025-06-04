import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Shield, Zap, Mic, Brain, Timer, Smartphone, Monitor, ArrowRight, SquareStack, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedDeviceMode, setSelectedDeviceMode] = useState<'single' | 'cross'>('single');
  const navigate = useNavigate();
  const { toast } = useToast();

  const calculatePrice = (basePriceCents: number, deviceMode: 'single' | 'cross') => {
    const finalPrice = deviceMode === 'cross' ? Math.round(basePriceCents * 1.2) : basePriceCents;
    return {
      cents: finalPrice,
      display: `$${(finalPrice / 100).toFixed(0)}`
    };
  };

  const plans = [
    {
      id: "standard",
      name: "Standard",
      duration: "1 hour",
      basePriceCents: 5000,
      durationMinutes: 60,
      description: "Perfect for most technical interviews",
      features: [
        "60 minutes of real-time assistance",
        "Resume & job description analysis",
        "AI-powered answer generation",
        "Live speech-to-text",
        "Countdown timer",
        "24-hour transcript access"
      ],
      popular: false
    },
    {
      id: "pro",
      name: "Pro",
      duration: "2 hours",
      basePriceCents: 9000,
      durationMinutes: 120,
      description: "Ideal for panel interviews and extended sessions",
      features: [
        "120 minutes of real-time assistance",
        "Resume & job description analysis",
        "AI-powered answer generation",
        "Live speech-to-text",
        "Countdown timer",
        "24-hour transcript access",
        "Enhanced answer accuracy"
      ],
      popular: true
    },
    {
      id: "elite",
      name: "Elite",
      duration: "3 hours",
      basePriceCents: 12500,
      durationMinutes: 180,
      description: "For comprehensive interview processes",
      features: [
        "180 minutes of real-time assistance",
        "Resume & job description analysis",
        "AI-powered answer generation",
        "Live speech-to-text",
        "Countdown timer",
        "24-hour transcript access",
        "Priority answer generation",
        "Advanced context understanding"
      ],
      popular: false
    }
  ];

  const handleStartSession = async (plan: typeof plans[0]) => {
    setLoading(plan.id);
    
    try {
      // Check if user is authenticated
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (!authSession) {
        // Redirect to auth with plan info
        navigate('/auth', { state: { selectedPlan: { ...plan, deviceMode: selectedDeviceMode } } });
        return;
      }

      const finalPricing = calculatePrice(plan.basePriceCents, selectedDeviceMode);

      // Create session record
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: authSession.user.id,
          plan_type: plan.id as 'standard' | 'pro' | 'elite',
          duration_minutes: plan.durationMinutes,
          price_cents: finalPricing.cents,
          device_mode: selectedDeviceMode,
          status: 'pending_payment'
        })
        .select()
        .single();

      if (sessionError) {
        throw sessionError;
      }

      // Redirect to payment
      navigate('/payment', { 
        state: { 
          sessionId: sessionData.id, 
          plan: {
            ...plan,
            price: finalPricing.display,
            priceCents: finalPricing.cents,
            deviceMode: selectedDeviceMode
          }
        } 
      });

    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to start session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">InterviewAce</span>
          </div>
          <Button variant="outline" onClick={() => navigate('/auth')}>
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-blue-100 text-blue-800 hover:bg-blue-100">
            🚀 Production-Grade Interview Assistant
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Ace Your Next
            <span className="text-blue-600 block">Live Interview</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Real-time AI assistance during your interview. Upload your resume and job description, 
            then get tailored answers generated on-the-fly as you speak.
          </p>
          
          {/* Key Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="flex items-center justify-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
              <Mic className="h-6 w-6 text-blue-600" />
              <span className="font-medium">Real-time Speech Recognition</span>
            </div>
            <div className="flex items-center justify-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
              <Brain className="h-6 w-6 text-blue-600" />
              <span className="font-medium">AI-Powered Answers</span>
            </div>
            <div className="flex items-center justify-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
              <Timer className="h-6 w-6 text-blue-600" />
              <span className="font-medium">Timed Sessions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Device Setup Selection - Redesigned */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Interview Setup</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              How will you use InterviewAce during your video interview? Select the setup that works best for you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Single Device Option */}
            <Card 
              className={`cursor-pointer transition-all duration-300 border-2 ${
                selectedDeviceMode === 'single' 
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' 
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
              onClick={() => setSelectedDeviceMode('single')}
            >
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <Monitor className="h-16 w-16 text-blue-600" />
                    <SquareStack className="h-6 w-6 text-blue-500 absolute -bottom-1 -right-1" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-gray-900">Single Device</CardTitle>
                <CardDescription className="text-lg">
                  Use one laptop/desktop for everything
                </CardDescription>
                {selectedDeviceMode === 'single' && (
                  <Badge className="mt-2 bg-blue-600 text-white">Selected</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">How it works:</h4>
                  <div className="space-y-3 text-sm text-blue-800">
                    <div className="flex items-start space-x-3">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                      <span>Join video interview on Tab 1 (Zoom/Teams)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                      <span>Open InterviewAce on Tab 2</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                      <span>Alt+Tab between interview and answers</span>
                    </div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Simple one-device setup</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Chrome extension captures audio</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Standard pricing</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Cross Device Option */}
            <Card 
              className={`cursor-pointer transition-all duration-300 border-2 relative ${
                selectedDeviceMode === 'cross' 
                  ? 'border-orange-500 bg-orange-50 shadow-lg scale-105' 
                  : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
              }`}
              onClick={() => setSelectedDeviceMode('cross')}
            >
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white">
                Premium Experience
              </Badge>
              <CardHeader className="text-center pb-4 pt-6">
                <div className="flex justify-center mb-4">
                  <div className="relative flex items-center space-x-2">
                    <Monitor className="h-12 w-12 text-orange-600" />
                    <Wifi className="h-6 w-6 text-orange-500" />
                    <Smartphone className="h-10 w-10 text-orange-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-gray-900">Cross-Device</CardTitle>
                <CardDescription className="text-lg">
                  Laptop for interview + Phone/tablet for answers
                </CardDescription>
                {selectedDeviceMode === 'cross' && (
                  <Badge className="mt-2 bg-orange-600 text-white">Selected</Badge>
                )}
                <Badge className="mt-2 bg-orange-100 text-orange-800">
                  +20% Premium
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-3">How it works:</h4>
                  <div className="space-y-3 text-sm text-orange-800">
                    <div className="flex items-start space-x-3">
                      <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                      <span>Video interview on laptop (full focus)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                      <span>AI answers on phone/tablet (discrete)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                      <span>Glance naturally at answers like notes</span>
                    </div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>No tab switching needed</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>More natural and professional</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Discrete answer viewing</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Premium sync technology</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Visual Comparison */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center space-x-4 bg-gray-100 p-4 rounded-lg">
              <div className="text-sm text-gray-600">
                <strong>Single Device:</strong> Alt+Tab between meeting & answers
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="text-sm text-gray-600">
                <strong>Cross-Device:</strong> Seamless, professional experience
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Interview Duration
            </h2>
            <p className="text-xl text-gray-600">
              One-time payment. No subscriptions. No refunds after session starts.
            </p>
            {selectedDeviceMode === 'cross' && (
              <Badge className="mt-4 bg-orange-100 text-orange-800 text-lg px-4 py-2">
                Cross-device pricing includes 20% premium for enhanced experience
              </Badge>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const pricing = calculatePrice(plan.basePriceCents, selectedDeviceMode);
              return (
                <Card 
                  key={plan.id} 
                  className={`relative transition-all duration-300 hover:shadow-lg ${
                    plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      {plan.description}
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">{pricing.display}</span>
                      <span className="text-gray-600 ml-2">/ {plan.duration}</span>
                      {selectedDeviceMode === 'cross' && (
                        <div className="text-sm text-orange-600 mt-1">
                          Base: ${(plan.basePriceCents / 100).toFixed(0)} + 20% cross-device premium
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      className="w-full py-6 text-lg font-semibold"
                      onClick={() => handleStartSession(plan)}
                      disabled={loading === plan.id}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {loading === plan.id ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        'Start Session'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Payment Methods */}
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">Secure payment via</p>
            <div className="flex justify-center items-center space-x-6 text-gray-500">
              <span className="font-semibold">💳 Card</span>
              <span className="font-semibold">🍎 Apple Pay</span>
              <span className="font-semibold">📱 Google Pay</span>
              <span className="font-semibold">💙 PayPal</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Get started in minutes with our streamlined process
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Choose & Pay",
                description: "Select your plan and complete secure payment",
                icon: "💳"
              },
              {
                step: "2", 
                title: "Upload Documents",
                description: "Upload your resume and job description (PDF/Word)",
                icon: "📄"
              },
              {
                step: "3",
                title: "Pre-Session Check",
                description: "Test your microphone and system compatibility",
                icon: "🎤"
              },
              {
                step: "4",
                title: "Live Interview",
                description: "Get real-time AI assistance during your interview",
                icon: "🧠"
              }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <Shield className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Secure & Private</h3>
              <p className="text-gray-600">Your data is encrypted and deleted after 24 hours</p>
            </div>
            <div className="flex flex-col items-center">
              <Zap className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
              <p className="text-gray-600">Sub-3 second response time for real-time assistance</p>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Proven Results</h3>
              <p className="text-gray-600">8/10 average relevance score in beta testing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-6 w-6" />
            <span className="text-xl font-bold">InterviewAce</span>
          </div>
          <p className="text-gray-400 mb-6">
            Real-time AI interview assistance for confident candidates
          </p>
          <div className="text-sm text-gray-500">
            <p>© 2024 InterviewAce. All rights reserved.</p>
            <p className="mt-2">
              <span className="hover:text-white cursor-pointer">Privacy Policy</span> • 
              <span className="hover:text-white cursor-pointer ml-2">Terms of Service</span> • 
              <span className="hover:text-white cursor-pointer ml-2">GDPR Compliance</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
