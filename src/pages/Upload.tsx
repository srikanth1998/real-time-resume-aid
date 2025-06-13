import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Upload as UploadIcon, FileText, Briefcase, CheckCircle, AlertCircle, Loader2, Clock, Download, Monitor, Zap } from "lucide-react";
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
  const [jobDescription, setJobDescription] = useState("");
  const [helperDownloaded, setHelperDownloaded] = useState(false);
  const [platform, setPlatform] = useState<'windows' | 'macos' | 'unknown'>('unknown');

  useEffect(() => {
    // Detect platform
    if (navigator.platform.includes('Win')) {
      setPlatform('windows');
    } else if (navigator.platform.includes('Mac')) {
      setPlatform('macos');
    }
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId) {
        toast({
          title: "No session found",
          description: "Please start a new session from the homepage.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      try {
        // Verify session exists and is in correct state
        const { data: sessionData, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (error || !sessionData) {
          console.error('Session verification error:', error);
          toast({
            title: "Session not found",
            description: "Please start a new session from the homepage.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // Check if session is in correct state for uploading
        if (sessionData.status !== 'pending_assets') {
          if (sessionData.status === 'assets_received') {
            // Redirect to lobby if assets already uploaded
            navigate(`/lobby?session_id=${sessionId}`);
            return;
          }
          if (sessionData.status === 'in_progress') {
            // Redirect to interview if already started
            navigate(`/interview?session_id=${sessionId}`);
            return;
          }
          toast({
            title: "Session not ready",
            description: "This session is not ready for file uploads.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        setSession(sessionData);
        console.log('Session verified for upload:', sessionData);
      } catch (error) {
        console.error('Error verifying session:', error);
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

    verifySession();
  }, [sessionId, paymentId, confirmed, navigate, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file.",
          variant: "destructive"
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB.",
          variant: "destructive"
        });
        return;
      }
      setResumeFile(file);
    }
  };

  const handleDownloadHelper = () => {
    if (platform === 'unknown') {
      toast({
        title: "Platform not supported",
        description: "Native helper is only available for Windows and macOS.",
        variant: "destructive"
      });
      return;
    }

    const downloadUrl = platform === 'windows' 
      ? 'https://jafylkqbmvdptrqwwyed.supabase.co/storage/v1/object/public/native-helpers/InterviewAce-Helper-Windows.exe'
      : 'https://jafylkqbmvdptrqwwyed.supabase.co/storage/v1/object/public/native-helpers/InterviewAce-Helper-macOS.dmg';
    
    window.open(downloadUrl, '_blank');
    setHelperDownloaded(true);
    toast({
      title: "Helper Downloaded!",
      description: "Please install the helper application before continuing.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!helperDownloaded && platform !== 'unknown') {
      toast({
        title: "Helper Required",
        description: "Please download and install the native helper first.",
        variant: "destructive"
      });
      return;
    }
    
    if (!resumeFile || !jobDescription.trim()) {
      toast({
        title: "Missing information",
        description: "Please upload your resume and provide a job description.",
        variant: "destructive"
      });
      return;
    }

    if (!session) {
      toast({
        title: "Session error",
        description: "Session information not found.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Convert file to base64 for processing
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove data:application/pdf;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(resumeFile);
      });

      console.log('Uploading assets for session:', sessionId);

      // Process the files using edge function
      const { data, error } = await supabase.functions.invoke('process-session-assets', {
        body: {
          sessionId: sessionId,
          resumeContent: fileContent,
          resumeFileName: resumeFile.name,
          jobDescription: jobDescription.trim()
        }
      });

      if (error) {
        console.error('Asset processing error:', error);
        throw error;
      }

      console.log('Assets processed successfully:', data);

      toast({
        title: "Files uploaded successfully!",
        description: "Your documents have been processed. Redirecting to interview lobby...",
      });

      // Redirect to lobby
      setTimeout(() => {
        navigate(`/lobby?session_id=${sessionId}`);
      }, 1500);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process your files. Please try again.",
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
          <p>Verifying your session...</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Setup Your Interview Session</h1>
        <p className="text-gray-600">Download the native helper and upload your documents</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Session Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{session.plan_type.charAt(0).toUpperCase() + session.plan_type.slice(1)} Plan Active</span>
              </span>
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{session.duration_minutes} minutes</span>
              </Badge>
            </CardTitle>
            <CardDescription>
              Session ready • Follow the steps below to start your interview
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Step 1: Native Helper Download */}
        <Card className={`border-2 ${helperDownloaded ? 'border-green-500 bg-green-50' : platform === 'unknown' ? 'border-yellow-500 bg-yellow-50' : 'border-blue-500 bg-blue-50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${helperDownloaded ? 'bg-green-500' : platform === 'unknown' ? 'bg-yellow-500' : 'bg-blue-500'} text-white font-bold`}>
                {helperDownloaded ? <CheckCircle className="h-5 w-5" /> : '1'}
              </div>
              <Monitor className="h-6 w-6 text-gray-700" />
              <span>Download Native Helper</span>
              {helperDownloaded && <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>}
              {platform !== 'unknown' && (
                <Badge variant="outline">{platform === 'windows' ? 'Windows' : 'macOS'}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {platform === 'unknown' 
                ? "Native helper is only available for Windows and macOS. You can still use browser-based features."
                : helperDownloaded 
                  ? "Helper downloaded! Make sure to install it before proceeding."
                  : "Advanced audio capture and stealth overlay features"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {platform === 'unknown' ? (
              <div className="bg-yellow-100 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Platform Not Supported</h4>
                <p className="text-sm text-yellow-700">
                  Native helper is only available for Windows and macOS. You can still proceed with browser-based audio or text input modes.
                </p>
              </div>
            ) : !helperDownloaded ? (
              <div className="space-y-4">
                <div className="bg-blue-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">🎯 What does the helper do?</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Native system audio capture (no browser limits)</li>
                    <li>• Stealth overlay hidden from screen sharing</li>
                    <li>• Works with any meeting platform</li>
                    <li>• Enhanced performance and reliability</li>
                  </ul>
                </div>
                <Button 
                  onClick={handleDownloadHelper}
                  className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download {platform === 'windows' ? 'Windows' : 'macOS'} Helper
                </Button>
              </div>
            ) : (
              <div className="bg-green-100 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">✅ Helper Downloaded!</h4>
                <div className="text-sm text-green-700 space-y-2">
                  <p><strong>Next steps:</strong></p>
                  {platform === 'windows' ? (
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Run the downloaded .exe file as Administrator</li>
                      <li>Allow Windows Defender if prompted</li>
                      <li>Install VB-Cable driver if not already installed</li>
                      <li>Helper will run in system tray</li>
                    </ol>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open the downloaded .dmg file</li>
                      <li>Drag app to Applications folder</li>
                      <li>Allow in Security & Privacy settings</li>
                      <li>Install BlackHole driver if needed</li>
                      <li>Helper will appear in menu bar</li>
                    </ol>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Document Upload */}
        <Card className={`border-2 ${helperDownloaded || platform === 'unknown' ? 'border-blue-500' : 'border-gray-300'}`}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${helperDownloaded || platform === 'unknown' ? 'bg-blue-500' : 'bg-gray-400'} text-white font-bold`}>
                2
              </div>
              <FileText className="h-6 w-6 text-gray-700" />
              <span>Upload Documents</span>
            </CardTitle>
            <CardDescription>
              Upload your resume and job description for personalized AI assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Resume Upload */}
              <div className="space-y-2">
                <Label htmlFor="resume" className="text-base font-medium">
                  Resume (PDF only)
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    id="resume"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading || (!helperDownloaded && platform !== 'unknown')}
                  />
                  <label htmlFor="resume" className={`cursor-pointer ${!helperDownloaded && platform !== 'unknown' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="flex flex-col items-center space-y-2">
                      {resumeFile ? (
                        <>
                          <FileText className="h-12 w-12 text-green-600" />
                          <p className="text-sm font-medium text-green-600">{resumeFile.name}</p>
                          <p className="text-xs text-gray-500">Click to change file</p>
                        </>
                      ) : (
                        <>
                          <UploadIcon className="h-12 w-12 text-gray-400" />
                          <p className="text-sm font-medium text-gray-600">Click to upload your resume</p>
                          <p className="text-xs text-gray-500">PDF files only, max 10MB</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <Label htmlFor="jobDescription" className="text-base font-medium">
                  Job Description
                </Label>
                <Textarea
                  id="jobDescription"
                  placeholder="Paste the job description here. Include requirements, responsibilities, and any specific skills mentioned..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[200px] text-sm"
                  disabled={uploading || (!helperDownloaded && platform !== 'unknown')}
                />
                <p className="text-xs text-gray-500">
                  Provide as much detail as possible for better AI assistance
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full py-6 text-lg"
                disabled={!resumeFile || !jobDescription.trim() || uploading || (!helperDownloaded && platform !== 'unknown')}
                size="lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing documents...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Complete Setup & Start Interview
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <span>Setup Instructions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">💻 Helper Installation:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Download platform-specific helper</li>
                  <li>• Install required audio drivers</li>
                  <li>• Allow security permissions</li>
                  <li>• Helper runs in background</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">📄 Document Upload:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Upload your most recent resume (PDF)</li>
                  <li>• Include complete job description</li>
                  <li>• More details = better AI assistance</li>
                  <li>• Everything is encrypted and secure</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Upload;
