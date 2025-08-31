
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Download, Smartphone, Monitor, Clock, Gift, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const SessionReady = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const sessionCode = searchParams.get('code');
  const isTrial = searchParams.get('trial') === 'true';
  
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    if (!sessionId || !sessionCode) {
      toast.error("Session information missing");
      navigate('/');
    }
  }, [sessionId, sessionCode, navigate]);

  const handleDownloadHelper = async () => {
    try {
      setDownloadStarted(true);
      
      // Create temporary link to trigger download
      const link = document.createElement('a');
      // Use actual Supabase URL
      const supabaseUrl = 'https://jafylkqbmvdptrqwwyed.supabase.co';
      link.href = `${supabaseUrl}/storage/v1/object/public/native-helpers/StealthOverlay_Setup.exe`;
      link.download = 'InterviewAce-Helper-Setup.exe';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Download started! Install the helper to continue.");
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to start download");
      setDownloadStarted(false);
    }
  };

  const handleStartInterview = () => {
    navigate(`/interview?sessionId=${sessionId}&trial=${isTrial}`);
  };

  if (!sessionId || !sessionCode) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-2 mb-4">
            {isTrial ? (
              <Gift className="h-12 w-12 text-green-400" />
            ) : (
              <CheckCircle className="h-12 w-12 text-green-400" />
            )}
            <h1 className="text-4xl font-bold text-white">
              {isTrial ? "Free Trial Ready!" : "Session Ready!"}
            </h1>
          </div>
          <p className="text-white/70 text-xl">
            {isTrial 
              ? "Your 10-minute free trial is prepared and ready to go"
              : "Your interview session has been prepared successfully"
            }
          </p>
        </motion.div>

        {/* Session Code Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <Card className="backdrop-blur-md bg-glass border border-glass-border inline-block">
            <CardContent className="p-6">
              <div className="text-white/60 text-sm mb-2">Your Session Code</div>
              <div className="text-4xl font-mono font-bold text-white tracking-wider mb-2">
                {sessionCode}
              </div>
              {isTrial && (
                <div className="flex items-center justify-center space-x-2 text-green-400 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>10 minutes remaining</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Setup Steps */}
        <div className="max-w-md mx-auto">
          {/* Desktop Setup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="backdrop-blur-md bg-glass border border-glass-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Monitor className="h-5 w-5" />
                  <span>Desktop Setup</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Badge variant="outline" className="text-xs bg-blue-600/20 border-blue-500">1</Badge>
                    <div>
                      <div className="text-white font-medium">Download Native Helper</div>
                      <div className="text-white/60 text-sm">Required for audio capture and overlay</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Badge variant="outline" className="text-xs bg-blue-600/20 border-blue-500">2</Badge>
                    <div>
                      <div className="text-white font-medium">Install & Run Helper</div>
                      <div className="text-white/60 text-sm">Launch the helper application</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Badge variant="outline" className="text-xs bg-blue-600/20 border-blue-500">3</Badge>
                    <div>
                      <div className="text-white font-medium">Enter Session Code</div>
                      <div className="text-white/60 text-sm">Use code: <span className="font-mono text-white">{sessionCode}</span></div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleDownloadHelper}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={downloadStarted}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadStarted ? "Download Started" : "Download Helper"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SessionReady;
