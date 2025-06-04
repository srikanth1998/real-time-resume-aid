
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, CheckCircle, Mail, Clock } from "lucide-react";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    // Simulate email being sent (this happens via webhook)
    const timer = setTimeout(() => {
      setEmailSent(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">InterviewAce</span>
          </div>
        </div>

        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-3xl text-green-600 mb-2">Payment Successful!</CardTitle>
            <CardDescription className="text-lg">
              Your InterviewAce session has been activated
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900 mb-3">✅ What happens next?</h3>
              <div className="space-y-3 text-sm text-green-800">
                <div className="flex items-center space-x-3">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                  <span>We're processing your payment</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                  <span>You'll receive an email with your setup link</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Upload your resume and job description</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
                  <span>Start your AI-powered interview session</span>
                </div>
              </div>
            </div>

            {!emailSent ? (
              <div className="flex items-center justify-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                <span className="text-blue-800 font-medium">Preparing your session...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <Mail className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">Setup email sent! Check your inbox.</span>
              </div>
            )}

            <div className="text-sm text-gray-600 space-y-2">
              <p>📧 <strong>Check your email</strong> for the setup link (it may take a few minutes)</p>
              <p>⏰ <strong>Session expires</strong> automatically after your selected duration</p>
              <p>🔒 <strong>Secure & private</strong> - your data is deleted after 24 hours</p>
            </div>

            {sessionId && (
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
                Session ID: {sessionId}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Didn't receive an email? Check your spam folder or contact support.</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
