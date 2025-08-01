import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === '#pricing') return false; // Special case for pricing link
    return location.pathname === path;
  };

  const handlePricingClick = () => {
    if (location.pathname === '/') {
      // If on homepage, scroll to pricing section
      const pricingSection = document.getElementById('pricing');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // If on other page, navigate to homepage with pricing hash
      navigate('/#pricing');
    }
  };

  return (
    <motion.nav
      animate={{ 
        backgroundColor: isScrolled ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.1)',
        backdropFilter: isScrolled ? 'blur(20px)' : 'blur(12px)',
      }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-glass-border/30"
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer" 
            onClick={() => navigate("/")}
          >
            <Brain className="h-6 w-6 text-white" />
            <span className="text-white font-poppins font-semibold">InterviewAce</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8 text-white/80">
            <button 
              onClick={() => navigate("/how-it-works")} 
              className={`hover:text-white transition-colors ${
                isActive('/how-it-works') ? 'text-white font-medium' : ''
              }`}
            >
              How It Works
            </button>
            <button 
              onClick={() => navigate("/downloads")} 
              className={`hover:text-white transition-colors ${
                isActive('/downloads') ? 'text-white font-medium' : ''
              }`}
            >
              Downloads
            </button>
            <button 
              onClick={handlePricingClick}
              className="hover:text-white transition-colors"
            >
              Pricing
            </button>
            <button 
              onClick={() => navigate("/faq")} 
              className={`hover:text-white transition-colors ${
                isActive('/faq') ? 'text-white font-medium' : ''
              }`}
            >
              FAQ
            </button>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/upload?plan=quick-session&trial=true')}
            className="bg-primary text-white px-6 py-2 rounded-full font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            Try Now
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navigation;