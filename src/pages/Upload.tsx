
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Upload as UploadIcon, FileText, Briefcase, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Upload = () => {
  console.log('[UPLOAD] =================================');
  console.log('[UPLOAD] Upload component is rendering');
  console.log('[UPLOAD] Current URL:', window.location.href);
  console.log('[UPLOAD] =================================');
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const sessionId = searchParams.get('session_id');
  const paymentId = searchParams.get('payment_id');
  const confirmed = searchParams.get('confirmed');
  
  console.log('[UPLOAD] URL parameters extracted:', { sessionId, paymentId, confirmed });
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescFile, setJobDescFile] = useState<File | null>(null);
  const [jobDescUrl, setJobDescUrl] = useState("");
  const [uploadMethod, setUploadMethod] = useState<"file" | "url">("file");
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    console.log('[UPLOAD] useEffect triggered with params:', { sessionId, paymentId, confirmed });
    verifySessionAndPayment();
  }, [sessionId, paymentId, confirmed, retryCount]);

  const verifySessionAndPayment = async () => {
    console.log('[UPLOAD] Starting verification process, retry count:', retryCount);
    setDebugInfo({ step: 'starting_verification', params: { sessionId, paymentId, confirmed }, retryCount });
    
    if (!sessionId || !paymentId || confirmed !== 'true') {
      console.error('[UPLOAD] Missing required parameters:', { sessionId: !!sessionId, paymentId: !!paymentId, confirmed });
      setDebugInfo({ 
        step: 'missing_params', 
        error: 'Missing required parameters',
        params: { sessionId: !!sessionId, paymentId: !!paymentId, confirmed }
      });
      toast({
        title: "Invalid access",
        description: "Please use the link from your payment confirmation email.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      console.log('[UPLOAD] Querying database for sessions...');
      
      // First, check total session count for debugging
      console.log('[UPLOAD] Checking total sessions in database...');
      const { data: allSessions, error: allSessionsError } = await supabase
        .from('sessions')
        .select('id, status, stripe_payment_intent_id, stripe_session_id, created_at, plan_type')
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('[UPLOAD] Total sessions found:', allSessions?.length || 0);
      console.log('[UPLOAD] Recent sessions:', allSessions);
      console.log('[UPLOAD] Query error:', allSessionsError);

      // Look for session by ID first
      const { data: sessionByIdData, error: sessionByIdError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      console.log('[UPLOAD] Session by ID lookup:', { sessionByIdData, sessionByIdError });

      // Look for sessions by payment IDs
      const { data: sessionsByPayment, error: sessionsByPaymentError } = await supabase
        .from('sessions')
        .select('*')
        .or(`stripe_payment_intent_id.eq.${paymentId},stripe_session_id.eq.${paymentId}`)
        .order('created_at', { ascending: false });

      console.log('[UPLOAD] Sessions by payment ID:', { sessionsByPayment, sessionsByPaymentError });

      setDebugInfo({ 
        step: 'database_queries_complete',
        sessionId,
        paymentId,
        retryCount,
        totalSessionsInDb: allSessions?.length || 0,
        sessionByIdData: sessionByIdData ? {
          id: sessionByIdData.id,
          status: sessionByIdData.status,
          stripe_payment_intent_id: sessionByIdData.stripe_payment_intent_id,
          stripe_session_id: sessionByIdData.stripe_session_id,
          created_at: sessionByIdData.created_at
        } : null,
        sessionByIdError: sessionByIdError?.message,
        sessionsByPayment: sessionsByPayment?.map(s => ({
          id: s.id,
          status: s.status,
          stripe_payment_intent_id: s.stripe_payment_intent_id,
          stripe_session_id: s.stripe_session_id,
          created_at: s.created_at
        })) || [],
        recentSessions: allSessions?.slice(0, 5).map(s => ({
          id: s.id,
          status: s.status,
          stripe_payment_intent_id: s.stripe_payment_intent_id,
          created_at: s.created_at
        })) || []
      });

      let sessionData = sessionByIdData;

      // If we didn't find by session ID, try to find by payment ID
      if (!sessionData && sessionsByPayment && sessionsByPayment.length > 0) {
        console.log('[UPLOAD] Session not found by ID, but found by payment ID');
        sessionData = sessionsByPayment[0]; // Use the most recent one
      }

      if (!sessionData) {
        console.error('[UPLOAD] No session found by ID or payment ID');
        
        // If we have sessions but not this one, it might be a timing issue
        if (allSessions && allSessions.length > 0) {
          setDebugInfo(prev => ({ 
            ...prev,
            step: 'session_not_found_but_others_exist',
            searchedSessionId: sessionId,
            searchedPaymentId: paymentId,
            totalSessionsInDb: allSessions.length
          }));
          
          toast({
            title: "Session not found",
            description: `Session ${sessionId} not found. The webhook may still be processing your payment.`,
            variant: "destructive"
          });
        } else {
          setDebugInfo(prev => ({ 
            ...prev,
            step: 'no_sessions_in_database',
            possibleCauses: [
              'Webhook not configured properly',
              'Webhook endpoint not receiving Stripe events',
              'Database connection issues in webhook',
              'Webhook secret mismatch'
            ]
          }));
          
          toast({
            title: "Database synchronization issue",
            description: "No sessions found in database. This indicates a webhook configuration problem.",
            variant: "destructive"
          });
        }
        setLoading(false);
        return;
      }

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
        setDebugInfo(prev => ({ 
          ...prev,
          step: 'payment_mismatch', 
          paymentId, 
          sessionPaymentIntentId: sessionData.stripe_payment_intent_id,
          sessionStripeSessionId: sessionData.stripe_session_id
        }));
        toast({
          title: "Invalid payment confirmation",
          description: "The payment ID does not match this session.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      console.log('[UPLOAD] Session verified successfully:', sessionData.id);
      setDebugInfo(prev => ({ 
        ...prev,
        step: 'session_verified', 
        sessionId: sessionData.id, 
        status: sessionData.status 
      }));

      // Check session status and redirect accordingly
      if (sessionData.status === 'assets_received') {
        console.log('[UPLOAD] Assets already received, redirecting to lobby');
        navigate(`/lobby?session_id=${sessionData.id}`);
        return;
      } else if (sessionData.status === 'in_progress') {
        console.log('[UPLOAD] Session in progress, redirecting to interview');
        navigate(`/interview?session_id=${sessionData.id}`);
        return;
      } else if (sessionData.status !== 'pending_assets') {
        console.error('[UPLOAD] Invalid session status for upload:', sessionData.status);
        setDebugInfo(prev => ({ ...prev, step: 'invalid_status', status: sessionData.status }));
        toast({
          title: "Session not ready",
          description: `This session is not ready for document upload. Current status: ${sessionData.status}`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      setSession(sessionData);
      setDebugInfo(prev => ({ 
        ...prev,
        step: 'ready_for_upload', 
        sessionId: sessionData.id 
      }));
      console.log('[UPLOAD] Ready for upload');
    } catch (error: any) {
      console.error('[UPLOAD] Error verifying session:', error);
      setDebugInfo({ step: 'error', error: error.message, retryCount });
      toast({
        title: "Error",
        description: "Failed to verify session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setRetryCount(prev => prev + 1);
  };

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
    const fileName = `${session.id}/${type}.${fileExt}`;
    
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
        session_id: session.id,
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
            session_id: session.id,
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
        .eq('id', session.id);

      if (updateError) {
        throw updateError;
      }

      console.log('[UPLOAD] Upload completed successfully');
      toast({
        title: "Upload successful!",
        description: "Your documents have been uploaded. Starting interview session...",
      });

      // Redirect directly to lobby
      navigate(`/lobby?session_id=${session.id}`);

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
        <div className="text-center max-w-4xl">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="mb-4">Verifying payment and loading session... (Attempt {retryCount + 1})</p>
          
          {retryCount > 0 && (
            <div className="mt-4 p-4 bg-gray-100 rounded text-left text-sm">
              <strong>Debug Info:</strong>
              <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}

          <Button onClick={handleRetry} className="mt-4" disabled={retryCount >= 3}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Verification ({retryCount}/3)
          </Button>
        </div>
      </div>
    );
  }

  if (!session) {
    const isWebhookIssue = debugInfo.totalSessionsInDb === 0;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center max-w-4xl">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Session Access Issue
          </h1>
          
          <div className="space-y-4">
            <p className="text-gray-600 mb-6">
              {isWebhookIssue 
                ? "Your payment was processed by Stripe, but our system hasn't created your session yet."
                : "We found your session but there may be a permission issue accessing it."
              }
            </p>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-left">
              <h3 className="font-semibold text-yellow-800 mb-2">What's happening:</h3>
              <ul className="text-yellow-700 space-y-1 text-sm">
                <li>• Sessions exist in database: {debugInfo.totalSessionsInDb > 0 ? 'Yes' : 'No'}</li>
                <li>• Looking for session: {sessionId}</li>
                <li>• Payment ID: {paymentId}</li>
                <li>• The system is working to resolve access permissions</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4 justify-center mb-6">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
            <Button onClick={handleRetry} variant="outline" disabled={retryCount >= 3}>
              Retry Verification
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-gray-100 rounded text-left text-sm">
            <strong>Debug Info:</strong>
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        </div>
      </div>
    );
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
