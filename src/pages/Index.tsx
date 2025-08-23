
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Check, Clock, DollarSign, Star, Zap, Users, Shield, Eye, EyeOff, Gift } from "lucide-react";
import Navigation from "@/components/Navigation";

const Index = () => {
  const navigate = useNavigate();
  const deviceMode = 'cross'; // Always use cross-device mode
  const [currentSubtitle, setCurrentSubtitle] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(90);
  const [selectedApp, setSelectedApp] = useState('zoom');
  const [isScrolled, setIsScrolled] = useState(false);
  const containerRef = useRef(null);
  
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -300]);

  const technicalQuestions = [
    { 
      domain: "Java", 
      question: "What's the difference between ArrayList and LinkedList?", 
      answer: "ArrayList uses dynamic arrays for storage, offering O(1) access but O(n) insertion. LinkedList uses doubly-linked nodes, providing O(1) insertion but O(n) access time." 
    },
    { 
      domain: "Python", 
      question: "Explain the GIL in Python", 
      answer: "The Global Interpreter Lock prevents multiple threads from executing Python bytecode simultaneously, making Python multithreading less effective for CPU-bound tasks." 
    },
    { 
      domain: "Data Science", 
      question: "What is overfitting and how do you prevent it?", 
      answer: "Overfitting occurs when a model learns training data too specifically. Prevent it using cross-validation, regularization, dropout, or early stopping techniques." 
    },
    { 
      domain: "Machine Learning", 
      question: "Difference between supervised and unsupervised learning?", 
      answer: "Supervised learning uses labeled data to predict outcomes, while unsupervised learning finds patterns in unlabeled data through clustering or dimensionality reduction." 
    },
    { 
      domain: "AI", 
      question: "What are transformers in deep learning?", 
      answer: "Transformers use self-attention mechanisms to process sequential data in parallel, revolutionizing NLP by enabling models like GPT and BERT to understand context better." 
    },
    { 
      domain: ".NET", 
      question: "What is the difference between .NET Framework and .NET Core?", 
      answer: ".NET Framework is Windows-only and legacy, while .NET Core is cross-platform, open-source, and the modern unified platform for all .NET development." 
    },
    { 
      domain: "SAP", 
      question: "What is SAP HANA and its benefits?", 
      answer: "SAP HANA is an in-memory database platform that processes data in real-time, offering faster analytics, reduced data footprint, and simplified IT landscapes." 
    },
    { 
      domain: "React", 
      question: "What are React Hooks and why use them?", 
      answer: "Hooks let you use state and lifecycle features in functional components, promoting code reuse and cleaner component logic without class complexity." 
    }
  ];

  const meetingApps = [
    { id: 'zoom', name: 'Zoom', color: 'bg-blue-500', icon: '🎥' },
    { id: 'teams', name: 'Teams', color: 'bg-purple-500', icon: '👥' },
    { id: 'meet', name: 'Google Meet', color: 'bg-green-500', icon: '📹' },
    { id: 'webex', name: 'Webex', color: 'bg-orange-500', icon: '💼' },
    { id: 'any', name: 'Any App', color: 'bg-gradient-to-r from-blue-400 to-purple-600', icon: '🌐' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSubtitle((prev) => (prev + 1) % technicalQuestions.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const plans = [
    {
      id: 'coding-helper',
      name: 'Coding Helper',
      price: '$6.99',
      priceUnit: '',
      billing: 'one-time',
      duration: '5 questions',
      description: 'Perfect for coding interviews, technical quizzes & programming challenges',
      bestFor: 'Coding interviews',
      features: [
        '5 coding questions & quizzes',
        'Smart coding & quiz assistance',
        'Technical interview question help',
        'Algorithm & data structure guidance',
        'Programming challenge solutions',
        'Quiz answer explanations'
      ],
      popular: false,
      comingSoon: false,
    },
    {
      id: 'quick-session',
      name: 'Quick Session',
      price: '$6.99',
      priceUnit: '/hr',
      billing: 'one-time',
      duration: 'Pay per hour',
      description: 'Live smart interview assistance',
      bestFor: 'Real-time interview coaching',
      features: [
        'Real-time interview coaching',
        'Live smart assistance',
        'Real-time answer suggestions',
        'Technical question help',
        'Professional coaching',
        'Session recording',
        'Performance analytics'
      ],
      popular: false,
      comingSoon: true,
    },
    {
      id: 'question-analysis',
      name: 'Quiz Analysis',
      price: '$6.99',
      priceUnit: ' per 100 questions',
      billing: 'one-time',
      duration: '100 questions',
      description: 'Smart interview question analysis and instant answers from screenshots',
      bestFor: 'Real-time quiz assistance',
      features: [
        'Screenshot → Smart Analysis → Perfect Answer',
        'Take screenshots of interview questions instantly',
        'Smart analysis of coding challenges & algorithms',
        'Get detailed answers for technical questions',
        'Works with video calls, coding platforms',
        'Supports all programming languages',
        'Perfect for software engineering interviews'
      ],
      popular: false,
      comingSoon: false,
    }
  ];

  const handleSelectPlan = (planId: string) => {
    if (planId === 'free-trial') {
      // For free trial, go directly to upload page
      navigate(`/upload?plan=${planId}&device=${deviceMode}&trial=true`);
    } else if (planId === 'quick-session') {
      navigate(`/payment?plan=quick-session`);
    } else {
      // Navigate to quota adjustment page for other plans
      navigate(`/quota-adjustment?plan=${planId}&device=${deviceMode}`);
    }
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

      {/* Static Navigation */}
      <Navigation />

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center px-6 pt-24">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-left space-y-8"
          >
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold font-poppins text-white mb-6 leading-tight">
                Ace Your Next Interview with 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400"> AI</span>
              </h1>
              <p className="text-xl text-white/80 font-inter mb-8 leading-relaxed">
                Get real-time clarity reminders during live interviews with our transparent overlay system. 
                Works with any meeting app—completely invisible to screen sharing.
              </p>
            </div>
            

            <div className="flex flex-wrap items-center gap-8 text-sm">
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

          {/* Right Content - Demo Interface */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative space-y-6"
          >
            {/* Meeting App Selector */}
            <div className="flex justify-center space-x-2 mb-4">
              {meetingApps.map((app) => (
                <motion.button
                  key={app.id}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedApp(app.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedApp === app.id 
                      ? `${app.color} text-white` 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span className="mr-2">{app.icon}</span>
                  {app.name}
                </motion.button>
              ))}
            </div>

            {/* Interview Screen */}
            <motion.div
              whileHover={{ rotateY: 2, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="backdrop-blur-md bg-glass border border-glass-border rounded-3xl p-8 shadow-2xl"
            >
              <div className="bg-gray-900 rounded-2xl overflow-hidden mb-6 relative">
                {/* App Header */}
                <div className={`${meetingApps.find(app => app.id === selectedApp)?.color} px-4 py-2 flex items-center space-x-2`}>
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="ml-4 text-white text-sm font-medium">
                    {meetingApps.find(app => app.id === selectedApp)?.name} - Technical Interview
                  </span>
                </div>
                
                <div className="p-6">
                  <div className="text-blue-400 text-sm mb-2">Interviewer:</div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSubtitle}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                      className="text-white text-lg mb-6"
                    >
                      {technicalQuestions[currentSubtitle].question}
                    </motion.div>
                  </AnimatePresence>

                  {/* AI Suggestion Overlay - White and Transparent Background Only */}
                  <motion.div
                    className="rounded-lg p-4 border border-white/50 relative"
                    style={{ 
                      backgroundColor: `rgba(255, 255, 255, ${overlayOpacity / 100})`
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="text-xs text-blue-600 font-medium">
                          {technicalQuestions[currentSubtitle].domain} - AI Suggestion:
                        </div>
                      </div>
                      <Eye className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="text-sm text-gray-800 font-medium">
                      {technicalQuestions[currentSubtitle].answer}
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Opacity Control */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm">Overlay Transparency</span>
                  <span className="text-accent text-sm">{overlayOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Cross-Device Status */}
              <motion.div
                animate={{ 
                  scale: 1,
                  boxShadow: "0 0 20px rgba(45, 212, 191, 0.3)"
                }}
                className="flex items-center justify-center space-x-2 text-accent text-sm font-medium"
              >
                <Shield className="h-4 w-4" />
                <span>Invisible to Screen Sharing - Works with Any Meeting App</span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="relative max-w-6xl mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold font-poppins text-white mb-4">Choose Your Plan</h2>
          <p className="text-white/70 text-lg">Start with a free trial, then select the perfect plan for your needs</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: (index + 1) * 0.1 }}
              whileHover={{ y: -8, rotateX: 2 }}
              className={`relative backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6 shadow-2xl ${
                plan.popular ? 'ring-2 ring-primary scale-105' : ''
              } ${
                plan.comingSoon ? 'opacity-75' : ''
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
              
              {plan.comingSoon && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white px-4 py-1 rounded-full text-sm font-medium"
                >
                  Coming Soon
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
                    plan.comingSoon
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : plan.popular 
                        ? 'bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40' 
                        : 'backdrop-blur-md bg-glass border border-glass-border text-white hover:bg-white/20'
                  }`}
                  disabled={plan.comingSoon}
                >
                  {plan.comingSoon ? (
                    <>
                      <Clock className="inline h-5 w-5 mr-2" />
                      Coming Soon
                    </>
                  ) : (
                    <>
                      <Zap className="inline h-5 w-5 mr-2" />
                      Get {plan.name}
                    </>
                  )}
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
              <span>• Transparent overlay system</span>
              <span>• Invisible to screen shares</span>
              <span>• Works with any meeting app</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
