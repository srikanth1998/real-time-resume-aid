import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, Play, Shield, Eye, EyeOff, ExternalLink, CheckCircle, Clock, Users } from "lucide-react";

const SessionReady = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<'ready' | 'active' | 'testing'>('ready');
  
  const sessionId = searchParams.get('session') || 'demo-session-123';
  const planType = searchParams.get('plan') || 'pay-as-you-go';

  const instructions = [
    {
      step: "1",
      title: "Join your interview as normal",
      description: "Open your video platform (Zoom, Teams, Meet, etc.) and join the interview",
      icon: <Users className="h-6 w-6" />
    },
    {
      step: "2", 
      title: "Your overlay appears automatically",
      description: "Our coaching overlay will activate once audio is detected, completely invisible to others",
      icon: <Eye className="h-6 w-6" />
    },
    {
      step: "3",
      title: "Speak naturally about your experience", 
      description: "Continue the conversation normally - gentle reminders will appear as relevant",
      icon: <Play className="h-6 w-6" />
    },
    {
      step: "4",
      title: "Download transcript afterward",
      description: "Access your session insights and reflection guide when the interview ends",
      icon: <CheckCircle className="h-6 w-6" />
    }
  ];

  const platforms = [
    { name: "Zoom", supported: true },
    { name: "Microsoft Teams", supported: true },
    { name: "Google Meet", supported: true },
    { name: "WebEx", supported: true },
    { name: "GoToMeeting", supported: true },
    { name: "Skype", supported: true }
  ];

  const handleTestOverlay = () => {
    setSessionStatus('testing');
    setTimeout(() => {
      setSessionStatus('ready');
    }, 3000);
  };

  const handleJoinInterview = () => {
    setSessionStatus('active');
    // In a real app, this would redirect to the interview platform
    window.open('https://meet.google.com', '_blank');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" />
      
      {/* Floating orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-teal-400/20 to-blue-400/20 rounded-full blur-3xl" />

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 backdrop-blur-md bg-glass border border-glass-border rounded-full px-8 py-4"
      >
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate("/")}>
            <Brain className="h-6 w-6 text-white" />
            <span className="text-white font-poppins font-semibold">InterviewAce</span>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            Session Active
          </Badge>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="relative pt-32 px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-green-500/20 border border-green-500/30">
                <CheckCircle className="h-12 w-12 text-green-400" />
              </div>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold font-poppins text-white mb-6">
              You're All Set to
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400"> Shine</span>
            </h1>
            <p className="text-xl text-white/80 font-inter mb-8 max-w-3xl mx-auto">
              Your privacy overlay is now active and invisible to others. During your interview, 
              gentle reminders about your experience will appear only to you. Stay calm, be yourself, 
              and let your achievements speak clearly.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Badge className="bg-accent/20 text-accent border-accent/30">
                Session ID: {sessionId}
              </Badge>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                Plan: {planType}
              </Badge>
            </div>
          </motion.div>

          {/* Status and Test Section */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            
            {/* Overlay Test */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white font-poppins flex items-center space-x-3">
                    <Shield className="h-6 w-6 text-accent" />
                    <span>Overlay Visibility Test</span>
                  </CardTitle>
                  <p className="text-white/70">Verify that your overlay is invisible to screen sharing</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative bg-gray-900 rounded-lg p-4 min-h-32">
                    <div className="text-white/60 text-sm mb-2">Screen Share Preview</div>
                    
                    <AnimatePresence>
                      {isOverlayVisible && sessionStatus !== 'testing' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute bottom-4 right-4 bg-primary/90 text-white text-sm rounded-lg p-3 max-w-xs border border-accent/30"
                        >
                          <div className="text-xs text-accent mb-1">AI Suggestion:</div>
                          <div>Mention your leadership experience at TechCorp...</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {sessionStatus === 'testing' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center text-accent mt-8"
                      >
                        <div className="animate-pulse">Testing overlay visibility...</div>
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-white/70">
                      {isOverlayVisible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      <span className="text-sm">
                        {isOverlayVisible ? "Overlay visible to you" : "Overlay hidden"}
                      </span>
                    </div>
                    <Button
                      onClick={handleTestOverlay}
                      disabled={sessionStatus === 'testing'}
                      variant="outline"
                      size="sm"
                      className="backdrop-blur-md bg-glass border border-glass-border text-white hover:bg-white/20"
                    >
                      {sessionStatus === 'testing' ? 'Testing...' : 'Test Invisibility'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Platform Support */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white font-poppins flex items-center space-x-3">
                    <Users className="h-6 w-6 text-accent" />
                    <span>Supported Platforms</span>
                  </CardTitle>
                  <p className="text-white/70">Works seamlessly with all major video platforms</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {platforms.map((platform, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-white/80 text-sm">{platform.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                    <p className="text-accent text-sm">
                      ✨ Works with any browser-based video calling service
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-white font-poppins text-center mb-8">
              How Your Session Works
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {instructions.map((instruction, index) => (
                <Card key={index} className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6">
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 rounded-full bg-primary/20 border border-primary/30">
                        {instruction.icon}
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-white/20 mb-2">{instruction.step}</div>
                    <CardTitle className="text-lg font-bold text-white font-poppins">
                      {instruction.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 text-center text-sm">{instruction.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center"
          >
            <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-12">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white font-poppins mb-4">
                  Ready to Start Your Interview?
                </CardTitle>
                <p className="text-white/80 mb-8">
                  Your coaching overlay is active and waiting. Join your interview platform 
                  and begin your conversation with confidence.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleJoinInterview}
                    size="lg"
                    className="bg-primary text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                  >
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Join Interview Platform
                  </Button>
                  <Button
                    onClick={() => navigate("/complete")}
                    variant="outline"
                    size="lg"
                    className="backdrop-blur-md bg-glass border border-glass-border text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-white/20 transition-all"
                  >
                    <Clock className="h-5 w-5 mr-2" />
                    End Session
                  </Button>
                </div>
                <p className="text-white/60 text-sm mt-6">
                  Session expires in 60 minutes • Full transcript available after completion
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SessionReady;