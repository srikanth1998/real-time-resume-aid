
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload as UploadIcon, FileText, Briefcase, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Upload = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const sessionId = searchParams.get('session_id');
  
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);

  // Common job roles dropdown
  const jobRoles = [
    'Software Engineer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Data Scientist',
    'Data Analyst',
    'Product Manager',
    'UX/UI Designer',
    'DevOps Engineer',
    'QA Engineer',
    'Business Analyst',
    'Marketing Manager',
    'Sales Representative',
    'Project Manager',
    'Consultant',
    'Other'
  ];

  useEffect(() => {
    if (!sessionId) {
      toast({
        title: "No session found",
        description: "Please complete payment first.",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [sessionId, navigate, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }
      setResumeFile(file);
    }
  };

  const generateSessionCode = (): string => {
    // Generate 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resumeFile || !jobDescription.trim() || !jobRole) {
      toast({
        title: "Missing information",
        description: "Please upload your resume, enter job description, and select a job role.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      console.log('Processing session assets for session:', sessionId);
      
      // Generate 6-digit session code
      const code = generateSessionCode();
      
      // Process the session assets
      const { data, error } = await supabase.functions.invoke('process-session-assets', {
        body: {
          sessionId: sessionId,
          resumeFile: await fileToBase64(resumeFile),
          resumeFilename: resumeFile.name,
          jobDescription: jobDescription.trim(),
          jobRole: jobRole,
          sessionCode: code
        }
      });

      if (error) {
        throw error;
      }

      setSessionCode(code);
      
      toast({
        title: "Session Ready!",
        description: "Your AI interview coach has been prepared.",
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: error.message || "Failed to process your documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:application/pdf;base64, prefix
      };
      reader.onerror = error => reject(error);
    });
  };

  if (sessionCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Session Ready!</CardTitle>
            <CardDescription>
              Your AI interview coach has been prepared
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Your Session Code</h3>
              <div className="text-3xl font-mono font-bold text-blue-600 tracking-widest">
                {sessionCode}
              </div>
              <p className="text-sm text-blue-700 mt-2">
                Enter this code in the native helper to start your interview
              </p>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <p>✅ Resume analyzed</p>
              <p>✅ Job description processed</p>
              <p>✅ AI coach prepared for {jobRole}</p>
              <p>✅ Session code generated</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> This code is valid until you start your interview. 
                Keep it safe and don't share it with others.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => navigator.clipboard.writeText(sessionCode)}
                variant="outline"
                className="w-full"
              >
                Copy Session Code
              </Button>
              <Button 
                onClick={() => navigate('/')}
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Prepare Your AI Coach</h1>
          <p className="text-gray-600">Upload your resume and job details to customize your interview experience</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Resume Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Resume Upload</span>
              </CardTitle>
              <CardDescription>
                Upload your resume (PDF, DOC, or DOCX - max 5MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Label htmlFor="resume" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        {resumeFile ? resumeFile.name : 'Click to upload resume'}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        PDF, DOC, DOCX up to 5MB
                      </span>
                    </Label>
                    <Input
                      id="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
                {resumeFile && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Resume uploaded: {resumeFile.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Job Role Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5" />
                <span>Job Role</span>
              </CardTitle>
              <CardDescription>
                Select the role you're interviewing for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={jobRole} onValueChange={setJobRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your target job role" />
                </SelectTrigger>
                <SelectContent>
                  {jobRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
              <CardDescription>
                Paste the job description to get tailored interview questions and answers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full py-6 text-lg"
            disabled={loading || !resumeFile || !jobDescription.trim() || !jobRole}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Preparing Your AI Coach...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Generate Session Code
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Upload;
