import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Brain, Shield, Clock, Users, HelpCircle, CheckCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "Is this cheating?",
      answer: "No - we only remind you of your own resume content. No fabrication, no false information. Think of it as having your resume organized in your mind rather than fumbling through papers.",
      category: "ethics"
    },
    {
      question: "Can interviewers see it?",
      answer: "Absolutely not. Our overlay is invisible to screen sharing and video capture. It appears only on your local display, completely undetectable to others on the call.",
      category: "privacy"
    },
    {
      question: "What data do you store?",
      answer: "Only your resume for session duration. No audio recordings, no conversation logs. Your resume is encrypted and automatically deleted after your session expires.",
      category: "privacy"
    },
    {
      question: "How fast are reminders?",
      answer: "2-5 seconds for Pro users, 5-10 seconds for standard sessions. The system analyzes conversation context and surfaces relevant insights from your background.",
      category: "technical"
    },
    {
      question: "Which platforms does it work with?",
      answer: "All major video platforms including Zoom, Microsoft Teams, Google Meet, WebEx, GoToMeeting, and any browser-based video calling service.",
      category: "technical"
    },
    {
      question: "What if my interview is on mobile?",
      answer: "Our cross-device sync feature lets you run the helper on your computer while taking the interview on your phone or tablet. The overlay appears on your secondary screen.",
      category: "technical"
    },
    {
      question: "How does the refund policy work?",
      answer: "Full refund within 24 hours if your session link remains unused. Once you activate a session, the service is considered delivered, but we're always happy to help with technical issues.",
      category: "billing"
    },
    {
      question: "Can I use it for multiple interviews?",
      answer: "Each session link works for one interview. For multiple interviews, consider our Pro subscription (4 sessions/month) or pay per session as needed.",
      category: "billing"
    },
    {
      question: "What if I have technical problems?",
      answer: "We provide setup testing and real-time support. You can test your overlay visibility before any interview, and our support team responds within 2 hours during business days.",
      category: "support"
    },
    {
      question: "Is my data secure?",
      answer: "Yes. All data is encrypted in transit and at rest. We're GDPR and CCPA compliant, with no third-party data sharing. Your privacy is our top priority.",
      category: "privacy"
    }
  ];

  const categories = {
    ethics: { label: "Ethics & Fair Use", icon: <CheckCircle className="h-5 w-5" />, color: "text-green-400" },
    privacy: { label: "Privacy & Security", icon: <Shield className="h-5 w-5" />, color: "text-blue-400" },
    technical: { label: "Technical", icon: <HelpCircle className="h-5 w-5" />, color: "text-purple-400" },
    billing: { label: "Billing & Plans", icon: <Clock className="h-5 w-5" />, color: "text-yellow-400" },
    support: { label: "Support", icon: <Users className="h-5 w-5" />, color: "text-teal-400" }
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
          <div className="hidden md:flex items-center space-x-6 text-white/80">
            <button onClick={() => navigate("/")} className="hover:text-white transition-colors">Home</button>
            <button onClick={() => navigate("/how-it-works")} className="hover:text-white transition-colors">How It Works</button>
            <button onClick={() => navigate("/#pricing")} className="hover:text-white transition-colors">Pricing</button>
            <span className="text-white">FAQ</span>
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
        <div className="max-w-4xl mx-auto">
          
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl lg:text-6xl font-bold font-poppins text-white mb-6">
              Interview Coaching Questions
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400"> Answered</span>
            </h1>
            <p className="text-xl text-white/80 font-inter mb-8 max-w-3xl mx-auto">
              Everything you need to know about our privacy-first approach to interview coaching
            </p>
          </motion.div>

          {/* FAQ Categories */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12"
          >
            {Object.entries(categories).map(([key, category]) => (
              <Card key={key} className="backdrop-blur-md bg-glass border border-glass-border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className={category.color}>
                    {category.icon}
                  </div>
                  <span className="text-white text-sm font-medium">{category.label}</span>
                </div>
              </Card>
            ))}
          </motion.div>

          {/* FAQ Accordion */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-8"
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-glass-border">
                  <AccordionTrigger className="text-white hover:text-accent text-left">
                    <div className="flex items-center space-x-3">
                      <div className={categories[faq.category as keyof typeof categories].color}>
                        {categories[faq.category as keyof typeof categories].icon}
                      </div>
                      <span>{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white/80 pt-4 pl-8">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          {/* Still Have Questions Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mt-16"
          >
            <Card className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-12">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-white font-poppins mb-4">
                  Still Have Questions?
                </CardTitle>
                <p className="text-white/80 mb-8 max-w-2xl mx-auto">
                  We're here to help you feel confident about using our interview coaching tool. 
                  Reach out anytime for personalized support.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => navigate("/auth?plan=pay-as-you-go")}
                    size="lg"
                    className="bg-primary text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                  >
                    Start Your Session
                  </Button>
                  <Button
                    onClick={() => navigate("/integrity")}
                    variant="outline"
                    size="lg"
                    className="backdrop-blur-md bg-glass border border-glass-border text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-white/20 transition-all"
                  >
                    Read Our Ethics Guide
                  </Button>
                </div>
                <p className="text-white/60 text-sm mt-6">
                  Response time: Under 2 hours during business days
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;