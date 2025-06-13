
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeviceModeSelector } from "@/components/DeviceModeSelector";
import { Brain, Check, Clock, DollarSign, Star, Zap, Users, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [deviceMode, setDeviceMode] = useState<'single' | 'cross'>('single');

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '$9.99',
      duration: '15 minutes',
      description: 'Perfect for quick interview practice',
      features: [
        'AI-powered question generation',
        'Real-time answer suggestions',
        'Basic performance insights',
        'Email support'
      ],
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$19.99',
      duration: '30 minutes',
      description: 'Comprehensive interview preparation',
      features: [
        'Extended 30-minute sessions',
        'Advanced AI recommendations',
        'Detailed performance analysis',
        'Priority support',
        'Interview recording review'
      ],
      popular: true,
    }
  ];

  const handleSelectPlan = (planId: string) => {
    navigate(`/auth?plan=${planId}&device=${deviceMode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="text-center py-16 px-4">
        <div className="flex items-center justify-center space-x-2 mb-6">
          <Brain className="h-10 w-10 text-blue-600" />
          <span className="text-3xl font-bold text-gray-900">InterviewAce</span>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Ace Your Next Interview with AI
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Get real-time AI-powered suggestions and answers during your live interviews. 
          Practice with confidence and land your dream job.
        </p>
        
        <div className="flex items-center justify-center space-x-8 mb-12">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span className="text-gray-700">4.9/5 Success Rate</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-gray-700">10,000+ Users</span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-500" />
            <span className="text-gray-700">100% Secure</span>
          </div>
        </div>
      </div>

      {/* Device Mode Selection */}
      <div className="max-w-4xl mx-auto px-4 mb-12">
        <DeviceModeSelector 
          value={deviceMode} 
          onChange={setDeviceMode}
          className="mb-8"
        />
      </div>

      {/* Pricing Section */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
          <p className="text-gray-600">Select the perfect plan for your interview preparation needs</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative transition-all hover:shadow-lg ${
                plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600">{plan.description}</CardDescription>
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <div className="text-left">
                    <div className="text-sm text-gray-500">per session</div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {plan.duration}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Button 
                  className="w-full py-6 text-lg"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Get Started with {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">✨ All plans include:</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-700">
            <span>• Voice Recognition</span>
            <span>• Real-time AI Assistance</span>
            <span>• Native Audio Capture</span>
            <span>• Secure & Private</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
