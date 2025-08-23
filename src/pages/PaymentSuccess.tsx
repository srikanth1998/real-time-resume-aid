
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, CheckCircle, Mail, Clock } from "lucide-react";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Redirect to home after 10 seconds if no action is taken
    const timer = setTimeout(() => {
      navigate('/');
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">InterviewAce</span>
          </div>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <Mail className="h-8 w-8 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">Setup Email Sent!</h3>
            <p className="text-green-700">
              📧 Check your email for the setup link (it may take a few minutes)
            </p>
          </div>

          <div className="space-y-3 text-gray-600">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>⏰ Session expires automatically after your selected duration</span>
            </div>
            <p>🔒 Secure & private - your data is deleted after 24 hours</p>
          </div>

          {sessionId && (
            <div className="text-sm text-gray-500 border-t pt-4">
              <p><strong>Session ID:</strong> {sessionId}</p>
            </div>
          )}

          <div className="text-xs text-gray-400">
            You will be redirected to the homepage in a few seconds...
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
