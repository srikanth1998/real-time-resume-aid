import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, Download, Star, BarChart3, FileText, RefreshCw, CheckCircle, Clock, Lightbulb } from "lucide-react";

const PostInterview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [downloadStatus, setDownloadStatus] = useState<'ready' | 'downloading' | 'complete'>('ready');
  
  const sessionId = searchParams.get('session') || 'demo-session-123';
  const planType = searchParams.get('plan') || 'pay-as-you-go';

  const sessionStats = {
    duration: "42 minutes",
    suggestions: 12,
    keyMoments: 5,
    confidenceScore: 85
  };

  const downloads = [
    {
      title: "Session Transcript",
      description: "Complete conversation with timestamps and key moments highlighted",
      icon: <FileText className="h-6 w-6" />,
      format: "PDF",
      size: "2.3 MB"
    },
    {
      title: "AI Insights Summary", 
      description: "Personalized analysis of your responses and suggested improvements",
      icon: <BarChart3 className="h-6 w-6" />,
      format: "PDF",
      size: "1.8 MB"
    },
    {
      title: "Reflection Worksheet",
      description: "Guided questions to help you improve for future interviews",
      icon: <Lightbulb className="h-6 w-6" />,
      format: "PDF", 
      size: "0.9 MB"
    }
  ];

  const keyInsights = [
    {
      category: "Strengths",
      items: [
        "Strong technical explanation of cloud architecture project",
        "Excellent specific examples when discussing leadership experience",
        "Clear communication of problem-solving approach"
      ],
      color: "text-green-400"
    },
    {
      category: "Opportunities",
      items: [
        "Could elaborate more on quantifiable business impact",
        "Consider preparing concise failure/learning stories",
        "Practice transitioning between technical and non-technical explanations"
      ],
      color: "text-yellow-400"
    },
    {
      category: "Next Steps",
      items: [
        "Research the company's recent product launches for follow-up questions",
        "Prepare 2-3 questions about team dynamics and growth opportunities",
        "Practice 30-second elevator pitch for future interviews"
      ],
      color: "text-blue-400"
    }
  ];

  const handleDownloadAll = async () => {
    setDownloadStatus('downloading');
    // Simulate download process
    await new Promise(resolve => setTimeout(resolve, 2000));
    setDownloadStatus('complete');
    
    // In a real app, this would trigger actual file downloads
    setTimeout(() => setDownloadStatus('ready'), 3000);
  };

  const handleBookAnother = () => {
    navigate("/auth?plan=" + planType);
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
            Session Complete
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
                <Star className="h-12 w-12 text-green-400" />
              </div>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold font-poppins text-white mb-6">
              Great Job
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400"> Out There</span>
            </h1>
            <p className="text-xl text-white/80 font-inter mb-8 max-w-3xl mx-auto">
              Your interview coaching session is complete. Access your conversation transcript, 
              key moments highlighted, and personalized reflection questions to help you improve for next time.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Badge className="bg-accent/20 text-accent border-accent/30">
                Session ID: {sessionId}
              </Badge>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                Confidence Score: {sessionStats.confidenceScore}%
              </Badge>
            </div>
          </motion.div>

          {/* Session Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid md:grid-cols-4 gap-6 mb-12"
          >
            <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6 text-center">
              <Clock className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white">{sessionStats.duration}</h3>
              <p className="text-white/70">Duration</p>
            </Card>
            <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6 text-center">
              <Lightbulb className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white">{sessionStats.suggestions}</h3>
              <p className="text-white/70">AI Suggestions</p>
            </Card>
            <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6 text-center">
              <Star className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white">{sessionStats.keyMoments}</h3>
              <p className="text-white/70">Key Moments</p>
            </Card>
            <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6 text-center">
              <BarChart3 className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white">{sessionStats.confidenceScore}%</h3>
              <p className="text-white/70">Confidence</p>
            </Card>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            
            {/* Downloads Section */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white font-poppins flex items-center space-x-3">
                    <Download className="h-6 w-6 text-accent" />
                    <span>Session Package</span>
                  </CardTitle>
                  <p className="text-white/70">Download your complete interview analysis</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {downloads.map((download, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="text-accent">
                          {download.icon}
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{download.title}</h4>
                          <p className="text-white/60 text-sm">{download.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-accent/20 text-accent border-accent/30 text-xs">
                          {download.format}
                        </Badge>
                        <p className="text-white/60 text-xs mt-1">{download.size}</p>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    onClick={handleDownloadAll}
                    disabled={downloadStatus === 'downloading'}
                    className="w-full bg-primary text-white py-3 rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                  >
                    {downloadStatus === 'downloading' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    {downloadStatus === 'complete' && <CheckCircle className="h-4 w-4 mr-2" />}
                    {downloadStatus === 'ready' && <Download className="h-4 w-4 mr-2" />}
                    {downloadStatus === 'downloading' ? 'Preparing Download...' : 
                     downloadStatus === 'complete' ? 'Download Complete!' : 'Download Session Package'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Key Insights */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white font-poppins flex items-center space-x-3">
                    <BarChart3 className="h-6 w-6 text-accent" />
                    <span>Quick Insights</span>
                  </CardTitle>
                  <p className="text-white/70">Key takeaways from your session</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {keyInsights.map((insight, index) => (
                    <div key={index}>
                      <h4 className={`font-semibold mb-3 ${insight.color}`}>{insight.category}</h4>
                      <ul className="space-y-2">
                        {insight.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                            <span className="text-white/80 text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center"
          >
            <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-12">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-white font-poppins mb-4">
                  Ready for Your Next Interview?
                </CardTitle>
                <p className="text-white/80 mb-8 max-w-2xl mx-auto">
                  Keep the momentum going with another coaching session, or explore our subscription plans 
                  for regular interview preparation.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleBookAnother}
                    size="lg"
                    className="bg-primary text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                  >
                    Book Another Session
                  </Button>
                  <Button
                    onClick={() => navigate("/#pricing")}
                    variant="outline"
                    size="lg"
                    className="backdrop-blur-md bg-glass border border-glass-border text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-white/20 transition-all"
                  >
                    View Subscription Plans
                  </Button>
                </div>
                <p className="text-white/60 text-sm mt-6">
                  Your session data will be available for download for 7 days
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PostInterview;