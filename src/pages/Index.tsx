
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeviceModeSelector } from "@/components/DeviceModeSelector";
import { Brain, Check, Clock, DollarSign, Star, Zap, Users, Shield, Eye, EyeOff, Monitor } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [deviceMode, setDeviceMode] = useState<'single' | 'cross'>('single');
  const [isScreenShareOn, setIsScreenShareOn] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState(0);
  const containerRef = useRef(null);
  
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -300]);

  const subtitles = [
    { question: "Tell me about yourself", answer: "Focus on your leadership experience and recent achievements..." },
    { question: "Why do you want this role?", answer: "Emphasize the company's mission alignment with your values..." },
    { question: "What's your biggest weakness?", answer: "Turn this into a growth story with specific examples..." }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSubtitle((prev) => (prev + 1) % subtitles.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const plans = [
    {
      id: 'pay-as-you-go',
      name: 'Pay-As-You-Go',
      price: '$18',
      priceUnit: '/ session',
      billing: 'one-time',
      duration: '60 minutes',
      description: 'One-off interview prep',
      bestFor: 'Single interview preparation',
      features: [
        '60-min live audio capture',
        'Stealth overlay & phone dashboard',
        'Real-time AI whisper suggestions',
        'Transcript + AI summary download',
        '7-day storage included'
      ],
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro Subscription',
      price: '$29',
      priceUnit: '/ month',
      billing: 'monthly',
      duration: '4 sessions',
      description: 'Active job seekers',
      bestFor: 'Doing ≥3 interviews / month',
      features: [
        '4 sessions per month (rollover 1 mo)',
        '24-hour transcript storage',
        'Priority Whisper queue (≤5s latency)',
        'Extra sessions at $15 each',
        'Advanced performance analytics'
      ],
      popular: true,
    },
    {
      id: 'coach',
      name: 'Coach Bundle',
      price: '$99',
      priceUnit: '/ month',
      billing: 'monthly',
      duration: '20 credits',
      description: 'Career & placement coaches',
      bestFor: 'Professional coaching practice',
      features: [
        '20 session credits (shareable)',
        'Client management dashboard',
        'White-label PDF reports',
        'Logo upload & branding',
        'Overages at $12 each'
      ],
      popular: false,
    },
    {
      id: 'enterprise',
      name: 'Enterprise / API',
      price: 'Custom',
      priceUnit: 'quote',
      billing: 'annual',
      duration: '500+ credits',
      description: 'Job platforms, bootcamps',
      bestFor: 'High-volume usage',
      features: [
        '500+ credits per year',
        'SSO (SAML/OIDC)',
        'Usage analytics export',
        'Dedicated Slack support',
        '24-hour SLA guarantee'
      ],
      popular: false,
    }
  ];

  const handleSelectPlan = (planId: string) => {
    navigate(`/auth?plan=${planId}&device=${deviceMode}`);
  };

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-hidden">
      {/* Parallax Background Layers */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" />
      
      {/* Floating Orbs */}
      <motion.div 
        style={{ y: y1 }}
        className="fixed top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
      />
      <motion.div 
        style={{ y: y2 }}
        className="fixed top-40 right-20 w-96 h-96 bg-gradient-to-r from-teal-400/20 to-blue-400/20 rounded-full blur-3xl"
      />
      <motion.div 
        style={{ y: y3 }}
        className="fixed bottom-20 left-1/3 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
      />

      {/* Floating Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 backdrop-blur-md bg-glass border border-glass-border rounded-full px-8 py-4"
      >
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-white" />
            <span className="text-white font-poppins font-semibold">InterviewAce</span>
          </div>
          <div className="hidden md:flex items-center space-x-6 text-white/80">
            <button onClick={() => navigate("/how-it-works")} className="hover:text-white transition-colors">How It Works</button>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <button onClick={() => navigate("/faq")} className="hover:text-white transition-colors">FAQ</button>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelectPlan('pay-as-you-go')}
            className="bg-primary text-white px-6 py-2 rounded-full font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            Try Now
          </motion.button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-8 mb-8"
            >
              <h1 className="text-5xl lg:text-6xl font-bold font-poppins text-white mb-6 leading-tight">
                Ace Your Next Interview with 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400"> AI</span>
              </h1>
              <p className="text-xl text-white/80 font-inter mb-8 leading-relaxed">
                Get real-time clarity reminders during live interviews with our privacy-first overlay. 
                Your personal interview coach that stays completely private—invisible to screen shares.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(79, 70, 229, 0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectPlan('pay-as-you-go')}
                  className="bg-primary text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-primary/25 border border-primary/50 hover:border-primary transition-all"
                >
                  <Zap className="inline h-5 w-5 mr-2" />
                  Start Session ($18)
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/how-it-works")}
                  className="backdrop-blur-md bg-glass border border-glass-border text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-white/20 transition-all"
                >
                  See How It Works
                </motion.button>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm">
                <div className="flex items-center space-x-2 text-white/70">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span>4.9/5 Success Rate</span>
                </div>
                <div className="flex items-center space-x-2 text-white/70">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span>10,000+ Users</span>
                </div>
                <div className="flex items-center space-x-2 text-white/70">
                  <Shield className="h-4 w-4 text-green-400" />
                  <span>100% Secure</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Content - 3D Laptop Demo */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <motion.div
              whileHover={{ rotateY: 5, rotateX: 2, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="backdrop-blur-md bg-glass border border-glass-border rounded-3xl p-8 transform perspective-1000"
            >
              {/* Laptop Screen */}
              <div className="bg-gray-900 rounded-2xl p-6 mb-6 relative overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 relative">
                  {/* Interview Question */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSubtitle}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                      className="text-white/90 mb-4"
                    >
                      <div className="text-sm text-blue-400 mb-2">Interviewer:</div>
                      <div className="text-lg font-medium">{subtitles[currentSubtitle].question}</div>
                    </motion.div>
                  </AnimatePresence>

                  {/* AI Answer Overlay */}
                  <motion.div
                    animate={{ 
                      opacity: isScreenShareOn ? 0.1 : 1,
                      scale: isScreenShareOn ? 0.95 : 1
                    }}
                    transition={{ duration: 0.3 }}
                    className="absolute bottom-4 right-4 backdrop-blur-md bg-primary/90 text-white text-sm rounded-lg p-3 max-w-xs border border-accent/30"
                  >
                    <div className="text-xs text-accent mb-1">AI Suggestion:</div>
                    <div>{subtitles[currentSubtitle].answer}</div>
                  </motion.div>
                </div>

                {/* Screen Share Toggle */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white/60 text-sm">
                    <Monitor className="h-4 w-4" />
                    <span>Screen Share</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsScreenShareOn(!isScreenShareOn)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      isScreenShareOn ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <motion.div
                      animate={{ x: isScreenShareOn ? 24 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full"
                    />
                  </motion.button>
                </div>
              </div>

              {/* Stealth Badge */}
              <motion.div
                animate={{ 
                  scale: isScreenShareOn ? 1.1 : 1,
                  boxShadow: isScreenShareOn ? "0 0 20px rgba(45, 212, 191, 0.5)" : "none"
                }}
                className="flex items-center justify-center space-x-2 text-accent text-sm font-medium"
              >
                {isScreenShareOn ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span>Invisible to Screen-Share</span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Device Mode Selection */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-4xl mx-auto px-4 mb-16"
      >
        <div className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-8">
          <DeviceModeSelector 
            value={deviceMode} 
            onChange={setDeviceMode}
          />
        </div>
      </motion.div>

      {/* Pricing Section */}
      <div id="pricing" className="relative max-w-6xl mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold font-poppins text-white mb-4">Choose Your Plan</h2>
          <p className="text-white/70 text-lg">Select the perfect plan for your interview preparation needs</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -8, rotateX: 2 }}
              className={`relative backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6 shadow-2xl ${
                plan.popular ? 'ring-2 ring-primary scale-105' : ''
              }`}
            >
              {plan.popular && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium"
                >
                  Most Popular
                </motion.div>
              )}
              
              <div className="text-center pb-4">
                <h3 className="text-xl font-bold text-white font-poppins">{plan.name}</h3>
                <p className="text-sm text-white/60 mb-4">{plan.bestFor}</p>
                <div className="flex items-center justify-center space-x-1 mt-4">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-white/60">{plan.priceUnit}</span>
                </div>
                <div className="flex items-center justify-center text-sm text-white/60 mt-2">
                  <Clock className="h-4 w-4 mr-1" />
                  {plan.duration}
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <motion.div
                      key={featureIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: (index * 0.1) + (featureIndex * 0.05) }}
                      className="flex items-center space-x-3"
                    >
                      <Check className="h-5 w-5 text-accent flex-shrink-0" />
                      <span className="text-white/80">{feature}</span>
                    </motion.div>
                  ))}
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-4 text-lg font-semibold rounded-xl transition-all ${
                    plan.popular 
                      ? 'bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40' 
                      : 'backdrop-blur-md bg-glass border border-glass-border text-white hover:bg-white/20'
                  }`}
                >
                  <Zap className="inline h-5 w-5 mr-2" />
                  Get Started with {plan.name}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-12"
        >
          <div className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6 inline-block">
            <p className="text-white/80 mb-4">✨ All plans include:</p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/70">
              <span>• Live clarity coaching</span>
              <span>• Private coaching overlay</span>
              <span>• Invisible to screen shares</span>
              <span>• Secure & ethical</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
