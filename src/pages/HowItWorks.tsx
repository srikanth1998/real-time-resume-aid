import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Brain, Download, Play, Shield, Clock, Users, ArrowRight, Check } from "lucide-react";

const HowItWorks = () => {
  const navigate = useNavigate();

  const steps = [
    {
      number: "01",
      title: "Pay & Upload",
      description: "Secure checkout, upload your resume",
      icon: <Brain className="h-8 w-8" />,
      details: "Quick and secure payment process. Upload your resume in PDF or DOC format for personalized coaching insights.",
      time: "2 minutes"
    },
    {
      number: "02", 
      title: "Download Helper",
      description: "One-click install for your computer",
      icon: <Download className="h-8 w-8" />,
      details: "Lightweight application that runs locally on your device. No complex setup or configuration required.",
      time: "1 minute"
    },
    {
      number: "03",
      title: "Get Session Link",
      description: "Unique URL for each interview",
      icon: <Play className="h-8 w-8" />,
      details: "Receive your private session link that activates your invisible coaching overlay during any video interview.",
      time: "Instant"
    }
  ];

  const features = [
    {
      icon: <Shield className="h-6 w-6 text-accent" />,
      title: "100% Private",
      description: "Invisible to screen shares and video capture"
    },
    {
      icon: <Clock className="h-6 w-6 text-accent" />,
      title: "Real-time Insights",
      description: "Gentle reminders about your experience as you speak"
    },
    {
      icon: <Users className="h-6 w-6 text-accent" />,
      title: "Works Everywhere",
      description: "Compatible with Zoom, Teams, Meet, and all platforms"
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
            <span className="text-white">How It Works</span>
            <button onClick={() => navigate("/#pricing")} className="hover:text-white transition-colors">Pricing</button>
            <button onClick={() => navigate("/faq")} className="hover:text-white transition-colors">FAQ</button>
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
      <div className="relative pt-32 px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl lg:text-6xl font-bold font-poppins text-white mb-6">
              Three Steps to Interview
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400"> Confidence</span>
            </h1>
            <p className="text-xl text-white/80 font-inter mb-8 max-w-3xl mx-auto">
              Download once, use for any interview. Our overlay appears only to you, providing gentle reminders about your experience and accomplishments as the conversation flows.
            </p>
            <Badge className="bg-accent/20 text-accent border-accent/30 text-sm">
              Works with all major video platforms • 5-minute setup
            </Badge>
          </motion.div>

          {/* Steps */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ y: -8 }}
                className="relative"
              >
                <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-8 h-full">
                  <CardHeader className="text-center pb-6">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 rounded-full bg-primary/20 border border-primary/30">
                        {step.icon}
                      </div>
                    </div>
                    <div className="text-6xl font-bold text-white/20 mb-2">{step.number}</div>
                    <CardTitle className="text-xl font-bold text-white font-poppins">{step.title}</CardTitle>
                    <p className="text-white/70">{step.description}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80 text-center mb-4">{step.details}</p>
                    <div className="flex items-center justify-center space-x-2">
                      <Clock className="h-4 w-4 text-accent" />
                      <span className="text-accent text-sm font-medium">{step.time}</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Connector Arrow */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-8 w-8 text-white/30" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-8 mb-16"
          >
            <h3 className="text-3xl font-bold text-white font-poppins text-center mb-8">
              Why Our Approach Works
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-4"
                >
                  <div className="flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">{feature.title}</h4>
                    <p className="text-white/70">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center pb-16"
          >
            <div className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-12">
              <h3 className="text-3xl font-bold text-white font-poppins mb-4">
                Ready to Start Your First Session?
              </h3>
              <p className="text-white/80 mb-8 max-w-2xl mx-auto">
                Join thousands of candidates who've gained confidence and clarity in their interviews. 
                Get started in just a few minutes with our streamlined setup process.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate("/auth?plan=pay-as-you-go")}
                  size="lg"
                  className="bg-primary text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                >
                  Get Started Now
                </Button>
                <Button
                  onClick={() => navigate("/#pricing")}
                  variant="outline"
                  size="lg"
                  className="backdrop-blur-md bg-glass border border-glass-border text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-white/20 transition-all"
                >
                  View Pricing
                </Button>
              </div>
              <p className="text-white/60 text-sm mt-4">
                Full refund within 24 hours if session unused
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;