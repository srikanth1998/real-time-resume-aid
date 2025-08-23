import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Brain, Shield, Clock, Users, HelpCircle, CheckCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
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
      answer: "Our system provides quick contextual reminders during conversations. The system analyzes conversation context and surfaces relevant insights from your background in real-time.",
      category: "technical"
    },
    {
      question: "Which platforms does it work with?",
      answer: "All major video platforms including Zoom, Microsoft Teams, Google Meet, WebEx, GoToMeeting, and any browser-based video calling service.",
      category: "technical"
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
      <Navigation />

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

        </div>
      </div>
    </div>
  );
};

export default FAQ;