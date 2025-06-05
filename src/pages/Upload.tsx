
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
    const checkSession = async () => {
      if (!sessionId) {
        toast({
          title: "No session found",
          description: "Please start a new session from the homepage.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      console.log('Upload page - checking session:', { sessionId, paymentId, confirmed });

      // If coming from email link (has confirmed=true and payment_id), don't require authentication
      if (confirmed === 'true' && paymentId) {
        console.log('Email link access - bypassing auth check');
        
        // Fetch session details without auth requirement
        const { data: sessionData, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (error || !sessionData) {
          console.error('Session not found:', error);
          toast({
            title: "Session not found",
            description: "Please start a new session.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        console.log('Session found:', sessionData);
        setSession(sessionData);
        setLoading(false);
        return;
      }

      // Normal auth flow for authenticated users
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        navigate('/auth');
        return;
      }

      // Fetch session details with auth requirement
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', authSession.user.id)
        .single();

      if (error || !sessionData) {
        toast({
          title: "Session not found",
          description: "Please start a new session.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setSession(sessionData);
      setLoading(false);
    };

    checkSession();
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
    // For email link access, we need to create a temporary file path
    const fileExt = file.name.split('.').pop();
    const fileName = `temp/${sessionId}/${type}.${fileExt}`;
    
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
      console.log('Starting upload process...');
      
      // Upload resume
      await uploadFile(resumeFile, 'resume');
      console.log('Resume uploaded successfully');

      // Handle job description
      if (uploadMethod === "file" && jobDescFile) {
        await uploadFile(jobDescFile, 'job_description');
        console.log('Job description file uploaded successfully');
      } else if (uploadMethod === "url") {
        // Save URL as document metadata
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
        console.log('Job description URL saved successfully');
      }

      // Update session status
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'assets_received',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error updating session status:', updateError);
        throw updateError;
      }

      console.log('Session status updated to assets_received');

      toast({
        title: "Upload successful!",
        description: "Your documents have been uploaded and processed.",
      });

      // Redirect to lobby
      navigate(`/lobby?session_id=${sessionId}`);

    } catch (error: any) {
      console.error('Upload error:', error);
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
          <p>Loading session...</p>
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
        <p className="text-gray-600">Upload your resume and job description to get started</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Session Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Payment Confirmed - {session.plan_type.charAt(0).toUpperCase() + session.plan_type.slice(1)} Plan</span>
            </CardTitle>
            <CardDescription>
              {session.duration_minutes} minutes • Session expires automatically after use
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
                {/* Upload Method Toggle */}
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

        {/* Upload Instructions */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Resume Tips</span>
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Include specific skills and technologies</li>
                  <li>• List relevant work experience and achievements</li>
                  <li>• Mention certifications and education</li>
                  <li>• Use clear, scannable formatting</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <span>Job Description Tips</span>
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Copy the complete job posting</li>
                  <li>• Include required skills and qualifications</li>
                  <li>• Note company culture and values</li>
                  <li>• Include any specific technologies mentioned</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

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
                Uploading documents...
              </>
            ) : (
              <>
                <UploadIcon className="h-5 w-5 mr-2" />
                Upload & Continue
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
