
import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Briefcase, ArrowRight, Clock, Gift } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const UploadPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isTrial = searchParams.get('trial') === 'true';
  const planType = searchParams.get('plan') || 'quick-session';
  
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        toast.error("Please upload a PDF file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setResumeFile(file);
    }
  }, []);

  const handleSubmit = async () => {
    if (!resumeFile || !jobDescription.trim() || !jobRole.trim()) {
      toast.error("Please fill in all fields and upload your resume");
      return;
    }

    setIsUploading(true);
    
    try {
      let sessionId: string;
      let email: string | null = null;
      
      if (isTrial) {
        // Create free trial session directly
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .insert({
            plan_type: 'free-trial' as any,
            status: 'pending_assets' as any,
            duration_minutes: 10,
            price_cents: 0,
            device_mode: 'cross'
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Session creation error:', sessionError);
          throw new Error('Failed to create trial session');
        }
        
        sessionId = session.id;
      } else {
        // For paid sessions, get sessionId from URL params (from payment page)
        sessionId = searchParams.get('sessionId') || searchParams.get('session_id');
        email = searchParams.get('email'); // Get email from payment flow
        
        if (!sessionId) {
          throw new Error('Session ID not found');
        }
      }

      // Convert file to base64
      const fileReader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        fileReader.onload = () => {
          const result = fileReader.result as string;
          resolve(result.split(',')[1]); // Remove data:application/pdf;base64, prefix
        };
        fileReader.onerror = reject;
        fileReader.readAsDataURL(resumeFile);
      });

      // Generate session code
      const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Process session assets
      const { data, error } = await supabase.functions.invoke('process-session-assets', {
        body: {
          sessionId,
          resumeFile: fileData,
          resumeFilename: resumeFile.name,
          jobDescription,
          jobRole,
          sessionCode
        }
      });

      if (error) {
        console.error('Asset processing error:', error);
        throw new Error(error.message || 'Failed to process session assets');
      }

      // Send email with session details if email was provided
      if (email) {
        try {
          await supabase.functions.invoke('send-session-email', {
            body: {
              email,
              sessionId,
              sessionCode,
              planType: isTrial ? 'Free Trial' : planType,
              jobRole
            }
          });
          toast.success("Session details sent to your email!");
        } catch (emailError) {
          console.error('Email sending error:', emailError);
          // Don't fail the whole process if email fails
          toast.warning("Session created but email could not be sent");
        }
      }

      toast.success(isTrial ? "Free trial session created!" : "Session assets uploaded successfully!");
      
      // Navigate to session ready page
      navigate(`/session-ready?sessionId=${sessionId}&code=${sessionCode}&trial=${isTrial}`);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to process upload");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-2 mb-4">
            {isTrial ? (
              <Gift className="h-8 w-8 text-green-400" />
            ) : (
              <Upload className="h-8 w-8 text-blue-400" />
            )}
            <h1 className="text-3xl font-bold text-white">
              {isTrial ? "Start Your Free Trial" : "Upload Session Assets"}
            </h1>
          </div>
          <p className="text-white/70 text-lg">
            {isTrial 
              ? "Upload your resume and job details to start your 10-minute free trial"
              : "Upload your resume and job description to prepare your interview session"
            }
          </p>
          {isTrial && (
            <div className="mt-4 inline-flex items-center space-x-2 bg-green-600/20 border border-green-500/50 rounded-full px-4 py-2">
              <Clock className="h-4 w-4 text-green-400" />
              <span className="text-green-400 font-medium">10 minutes free - No payment required</span>
            </div>
          )}
        </motion.div>

        {/* Upload Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="backdrop-blur-md bg-glass border border-glass-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Briefcase className="h-5 w-5" />
                <span>Session Preparation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resume Upload */}
              <div className="space-y-2">
                <Label htmlFor="resume" className="text-white">Resume (PDF only)</Label>
                <div className="relative">
                  <Input
                    id="resume"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="bg-gray-800 border-gray-600 text-white file:bg-blue-600 file:text-white file:border-0 file:rounded-md file:px-4 file:py-2 file:mr-4"
                  />
                  {resumeFile && (
                    <div className="mt-2 flex items-center space-x-2 text-green-400">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{resumeFile.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Role */}
              <div className="space-y-2">
                <Label htmlFor="jobRole" className="text-white">Job Role/Position</Label>
                <Input
                  id="jobRole"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  placeholder="e.g., Senior Software Engineer, Marketing Manager"
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <Label htmlFor="jobDescription" className="text-white">Job Description</Label>
                <Textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the complete job description here..."
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 min-h-[200px]"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isUploading || !resumeFile || !jobDescription.trim() || !jobRole.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-white py-3 text-lg font-semibold"
              >
                {isUploading ? (
                  "Processing..."
                ) : isTrial ? (
                  <>
                    <Gift className="h-5 w-5 mr-2" />
                    Start Free Trial
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-5 w-5 mr-2" />
                    Prepare Session
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default UploadPage;
