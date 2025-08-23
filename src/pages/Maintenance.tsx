import { motion } from "framer-motion";
import { Wrench, Clock } from "lucide-react";

const Maintenance = () => {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-lg mx-auto"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8"
        >
          <Wrench className="h-24 w-24 text-primary mx-auto mb-4" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-4xl md:text-5xl font-bold text-white mb-4"
        >
          Under Maintenance
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-lg text-white/80 mb-8 leading-relaxed"
        >
          We're currently performing scheduled maintenance to improve your experience. 
          We'll be back online shortly.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center justify-center space-x-2 text-white/70">
            <Clock className="h-5 w-5" />
            <span>Expected downtime: 30-60 minutes</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          <p className="text-sm text-white/60">
            Follow us for updates: 
            <span className="text-primary ml-1">@InterviewAce</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Maintenance;