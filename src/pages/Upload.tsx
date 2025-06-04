import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Upload as UploadIcon, FileText, Briefcase, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Upload = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const sessionId = searchParams.get('session_id');
  const paymentId = searchParams.get('payment_id');
  const confirmed = searchParams.get('confirmed');
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescFile, setJobDescFile] = useState<File | null>(null);
  const [jobDescUrl, setJobDescUrl] = useState("");
  const [uploadMethod, setUploadMethod] = useState<"file" | "url">("file");

  useEffect(() => {
    const verifySessionAndPayment = async () => {
      console.log('[UPLOAD] Verifying session and payment');
      console.log('[UPLOAD] Session ID:', sessionId);
      console.log('[UPLOAD] Payment ID:', paymentId);
      console.log('[UPLOAD] Confirmed:', confirmed);
      
      if (!sessionId || !paymentId || confirmed !== 'true') {
        console.error('[UPLOAD] Missing required parameters');
        toast({
          title: "Invalid access",
          description: "Please use the link from your payment confirmation email.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      try {
        // Fetch session details directly (no auth required since we have payment confirmation)
        console.log('[UPLOAD] Fetching session from database...');
        const { data: sessionData, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        console.log('[UPLOAD] Database query result:', { sessionData, error });

        if (error) {
          console.error('[UPLOAD] Database error:', error);
          toast({
            title: "Database error",
            description: `Failed to fetch session: ${error.message}`,
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        if (!sessionData) {
          console.error('[UPLOAD] Session not found in database');
          toast({
            title: "Session not found",
            description: "The session ID is invalid or has expired.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        console.log('[UPLOAD] Session data:', {
          id: sessionData.id,
          status: sessionData.status,
          stripe_payment_intent_id: sessionData.stripe_payment_intent_id,
          stripe_session_id: sessionData.stripe_session_id
        });

        // Verify payment ID matches
        const paymentMatches = sessionData.stripe_payment_intent_id === paymentId || sessionData.stripe_session_id === paymentId;
        console.log('[UPLOAD] Payment verification:', {
          providedPaymentId: paymentId,
          stripe_payment_intent_id: sessionData.stripe_payment_intent_id,
          stripe_session_id: sessionData.stripe_session_id,
          matches: paymentMatches
        });

        if (!paymentMatches) {
          console.error('[UPLOAD] Payment ID mismatch');
          toast({
            title: "Invalid payment confirmation",
            description: "The payment ID does not match this session.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        console.log('[UPLOAD] Session verified:', sessionData.id, 'Status:', sessionData.status);

        // Check session status and redirect accordingly
        if (sessionData.status === 'assets_received') {
          console.log('[UPLOAD] Assets already received, redirecting to lobby');
          navigate(`/lobby?session_id=${sessionId}`);
          return;
        } else if (sessionData.status === 'in_progress') {
          console.log('[UPLOAD] Session in progress, redirecting to interview');
          navigate(`/interview?session_id=${sessionId}`);
          return;
        } else if (sessionData.status !== 'pending_assets') {
          console.error('[UPLOAD] Invalid session status for upload:', sessionData.status);
          toast({
            title: "Session not ready",
            description: `This session is not ready for document upload. Current status: ${sessionData.status}`,
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        setSession(sessionData);
        console.log('[UPLOAD] Ready for upload');
      } catch (error) {
        console.error('[UPLOAD] Error verifying session:', error);
        toast({
          title: "Error",
          description: "Failed to verify session. Please try again.",
          variant: "destructive"
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    verifySessionAndPayment();
  }, [sessionId, paymentId, confirmed, navigate, toast]);

  const validateFile = (file: File, type: string) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `${type} must be less than 5MB`,
        variant: "destructive"
      });
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `${type} must be PDF, Word document, or text file`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File, type: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${sessionId}/${type}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('interview-documents')
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    // Save document metadata
    const { error: dbError } = await supabase
      .from('documents')
      .insert({
        session_id: sessionId,
        type: type,
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: fileName
      });

    if (dbError) {
      throw dbError;
    }
  };

  const handleUpload = async () => {
    console.log('[UPLOAD] Starting upload process');
    
    if (!resumeFile) {
      toast({
        title: "Resume required",
        description: "Please select your resume file",
        variant: "destructive"
      });
      return;
    }

    if (uploadMethod === "file" && !jobDescFile) {
      toast({
        title: "Job description required",
        description: "Please select a job description file or enter a URL",
        variant: "destructive"
      });
      return;
    }

    if (uploadMethod === "url" && !jobDescUrl.trim()) {
      toast({
        title: "Job description URL required",
        description: "Please enter a job description URL",
        variant: "destructive"
      });
      return;
    }

    if (!validateFile(resumeFile, "Resume")) return;
    if (uploadMethod === "file" && jobDescFile && !validateFile(jobDescFile, "Job description")) return;

    setUploading(true);

    try {
      console.log('[UPLOAD] Uploading resume...');
      await uploadFile(resumeFile, 'resume');

      if (uploadMethod === "file" && jobDescFile) {
        console.log('[UPLOAD] Uploading job description file...');
        await uploadFile(jobDescFile, 'job_description');
      } else if (uploadMethod === "url") {
        console.log('[UPLOAD] Saving job description URL...');
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            session_id: sessionId,
            type: 'job_description',
            filename: 'job_description_url.txt',
            file_size: jobDescUrl.length,
            mime_type: 'text/plain',
            storage_path: jobDescUrl,
            parsed_content: jobDescUrl
          });

        if (dbError) {
          throw dbError;
        }
      }

      console.log('[UPLOAD] Updating session status to assets_received...');
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'assets_received',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        throw updateError;
      }

      console.log('[UPLOAD] Upload completed successfully');
      toast({
        title: "Upload successful!",
        description: "Your documents have been uploaded. Starting interview session...",
      });

      // Redirect directly to lobby
      navigate(`/lobby?session_id=${sessionId}`);

    } catch (error: any) {
      console.error('[UPLOAD] Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Verifying payment and loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Brain className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">InterviewAce</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Your Documents</h1>
        <p className="text-gray-600">Upload your resume and job description to start your interview</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Payment Confirmation */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Payment Confirmed - {session.plan_type.charAt(0).toUpperCase() + session.plan_type.slice(1)} Plan</span>
            </CardTitle>
            <CardDescription>
              {session.duration_minutes} minutes • {session.device_mode === 'cross' ? 'Cross-Device Access' : 'Single Device'}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Resume Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>Upload Resume</span>
              </CardTitle>
              <CardDescription>
                Upload your current resume (PDF, Word, or Text - Max 5MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="resume">Select Resume File</Label>
                  <Input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="mt-2"
                  />
                </div>
                {resumeFile && (
                  <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">{resumeFile.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Job Description Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                <span>Job Description</span>
              </CardTitle>
              <CardDescription>
                Upload job description file or provide a URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Button
                    variant={uploadMethod === "file" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUploadMethod("file")}
                  >
                    Upload File
                  </Button>
                  <Button
                    variant={uploadMethod === "url" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUploadMethod("url")}
                  >
                    Paste URL
                  </Button>
                </div>

                {uploadMethod === "file" ? (
                  <div>
                    <Label htmlFor="jobdesc">Select Job Description File</Label>
                    <Input
                      id="jobdesc"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => setJobDescFile(e.target.files?.[0] || null)}
                      className="mt-2"
                    />
                    {jobDescFile && (
                      <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200 mt-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800">{jobDescFile.name}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="joburl">Job Description URL</Label>
                    <Input
                      id="joburl"
                      type="url"
                      placeholder="https://company.com/jobs/..."
                      value={jobDescUrl}
                      onChange={(e) => setJobDescUrl(e.target.value)}
                      className="mt-2"
                    />
                    {jobDescUrl && (
                      <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200 mt-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800">URL provided</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={handleUpload}
            disabled={uploading || !resumeFile || (uploadMethod === "file" && !jobDescFile) || (uploadMethod === "url" && !jobDescUrl.trim())}
            className="w-full md:w-auto px-8 py-3 text-lg"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Uploading & Starting Interview...
              </>
            ) : (
              <>
                <UploadIcon className="h-5 w-5 mr-2" />
                Upload & Start Interview
              </>
            )}
          </Button>
          
          <p className="text-sm text-gray-500 mt-4">
            Your documents are encrypted and will be automatically deleted after 24 hours
          </p>
        </div>
      </div>
    </div>
  );
};

export default Upload;
