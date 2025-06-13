import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Brain, Shield, Heart, Eye, Lock, Users, CheckCircle, AlertCircle } from "lucide-react";

const Integrity = () => {
  const navigate = useNavigate();

  const principles = [
    {
      icon: <Heart className="h-8 w-8 text-red-400" />,
      title: "Authentic Communication",
      description: "We never invent skills or suggest false information. Our tool helps you articulate your genuine experience clearly and confidently.",
      details: "Every suggestion comes directly from your submitted resume. We amplify your real achievements, not fictional ones."
    },
    {
      icon: <Shield className="h-8 w-8 text-blue-400" />,
      title: "Privacy First",
      description: "Your conversations and personal information remain completely private. No audio storage, no third-party sharing.",
      details: "All processing happens locally on your device. We never store interview audio or conversation transcripts."
    },
    {
      icon: <Eye className="h-8 w-8 text-purple-400" />,
      title: "Invisible Operation",
      description: "Our overlay is undetectable to interviewers, ensuring a natural conversation flow without technical distractions.",
      details: "Advanced rendering technology ensures complete invisibility to screen sharing and video capture systems."
    },
    {
      icon: <Users className="h-8 w-8 text-green-400" />,
      title: "Fair Advantage",
      description: "We level the playing field by helping you overcome interview anxiety, not by providing unfair advantages.",
      details: "Think of us as interview coaching that helps you stay organized under pressure, just like practicing beforehand."
    }
  ];

  const dataHandling = [
    {
      aspect: "Resume Data",
      practice: "Encrypted and session-limited storage",
      retention: "Automatically deleted after session expires"
    },
    {
      aspect: "Audio Processing", 
      practice: "Local device processing only",
      retention: "Never stored or transmitted"
    },
    {
      aspect: "Usage Analytics",
      practice: "Anonymous performance metrics only",
      retention: "Aggregated data for service improvement"
    },
    {
      aspect: "Personal Information",
      practice: "Minimal collection (email for delivery)",
      retention: "Purged within 30 days of session completion"
    }
  ];

  const guidelines = [
    {
      icon: <CheckCircle className="h-6 w-6 text-green-400" />,
      title: "Appropriate Use",
      items: [
        "Reminding yourself of your actual achievements",
        "Staying organized during high-pressure conversations", 
        "Overcoming anxiety by having your background readily accessible",
        "Ensuring you don't forget important experiences to mention"
      ]
    },
    {
      icon: <AlertCircle className="h-6 w-6 text-yellow-400" />,
      title: "What We Don't Do",
      items: [
        "Generate answers to questions you can't answer yourself",
        "Provide information not already in your background",
        "Suggest skills or experiences you don't actually possess",
        "Create fabricated examples or accomplishments"
      ]
    }
  ];

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
          <div className="hidden md:flex items-center space-x-6 text-white/80">
            <button onClick={() => navigate("/")} className="hover:text-white transition-colors">Home</button>
            <button onClick={() => navigate("/how-it-works")} className="hover:text-white transition-colors">How It Works</button>
            <button onClick={() => navigate("/faq")} className="hover:text-white transition-colors">FAQ</button>
            <span className="text-white">Ethics</span>
          </div>
          <Button
            onClick={() => navigate("/auth?plan=pay-as-you-go")}
            className="bg-primary text-white px-6 py-2 rounded-full font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            Start Session
          </Button>
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
            className="text-center mb-16"
          >
            <h1 className="text-5xl lg:text-6xl font-bold font-poppins text-white mb-6">
              Our Commitment to
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400"> Ethical Interview Support</span>
            </h1>
            <p className="text-xl text-white/80 font-inter mb-8 max-w-4xl mx-auto">
              We believe great interviews happen when candidates can clearly articulate their genuine experience. 
              Our tool never invents skills or suggests false information—it simply helps you remember and communicate your actual achievements under pressure.
            </p>
          </motion.div>

          {/* Core Principles */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-white font-poppins text-center mb-12">Our Core Principles</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {principles.map((principle, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6 h-full">
                    <CardHeader>
                      <div className="flex items-center space-x-4 mb-4">
                        {principle.icon}
                        <CardTitle className="text-xl font-bold text-white font-poppins">
                          {principle.title}
                        </CardTitle>
                      </div>
                      <p className="text-white/80">{principle.description}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-white/70 text-sm">{principle.details}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Usage Guidelines */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-white font-poppins text-center mb-12">Ethical Guidelines</h2>
            <div className="grid lg:grid-cols-2 gap-8">
              {guidelines.map((guideline, index) => (
                <Card key={index} className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-8">
                  <CardHeader>
                    <div className="flex items-center space-x-3 mb-4">
                      {guideline.icon}
                      <CardTitle className="text-xl font-bold text-white font-poppins">
                        {guideline.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {guideline.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start space-x-3">
                          <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                          <span className="text-white/80">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Data Handling */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-8">
              <CardHeader>
                <div className="flex items-center space-x-3 mb-4">
                  <Lock className="h-8 w-8 text-accent" />
                  <CardTitle className="text-3xl font-bold text-white font-poppins">
                    Data Handling & Privacy
                  </CardTitle>
                </div>
                <p className="text-white/80">
                  Complete transparency about how we handle your information
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {dataHandling.map((item, index) => (
                    <div key={index} className="space-y-3">
                      <h4 className="text-accent font-semibold">{item.aspect}</h4>
                      <p className="text-white/80 text-sm">{item.practice}</p>
                      <p className="text-white/60 text-xs">{item.retention}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Compliance */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-8">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-white font-poppins mb-4">
                  Compliance & Standards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div className="space-y-2">
                    <Shield className="h-12 w-12 text-blue-400 mx-auto" />
                    <h4 className="text-white font-semibold">GDPR Compliant</h4>
                    <p className="text-white/70 text-sm">European data protection standards</p>
                  </div>
                  <div className="space-y-2">
                    <Lock className="h-12 w-12 text-green-400 mx-auto" />
                    <h4 className="text-white font-semibold">CCPA Compliant</h4>
                    <p className="text-white/70 text-sm">California privacy requirements</p>
                  </div>
                  <div className="space-y-2">
                    <CheckCircle className="h-12 w-12 text-purple-400 mx-auto" />
                    <h4 className="text-white font-semibold">SOC 2 Standards</h4>
                    <p className="text-white/70 text-sm">Enterprise security practices</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-12">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-white font-poppins mb-4">
                  Interview with Confidence and Integrity
                </CardTitle>
                <p className="text-white/80 mb-8 max-w-2xl mx-auto">
                  Our ethical approach ensures you can use our tool with complete confidence, 
                  knowing you're enhancing your natural abilities rather than compromising your integrity.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => navigate("/auth?plan=pay-as-you-go")}
                    size="lg"
                    className="bg-primary text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                  >
                    Start Your Ethical Session
                  </Button>
                  <Button
                    onClick={() => navigate("/faq")}
                    variant="outline"
                    size="lg"
                    className="backdrop-blur-md bg-glass border border-glass-border text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-white/20 transition-all"
                  >
                    Read FAQ
                  </Button>
                </div>
                <p className="text-white/60 text-sm mt-6">
                  Questions about our ethical standards? We're here to help.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Integrity;