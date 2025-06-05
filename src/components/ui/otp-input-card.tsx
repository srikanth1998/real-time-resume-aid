
import React from 'react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './input-otp';
import { Label } from './label';
import { ArrowLeft, Brain, Timer, AlertCircle } from 'lucide-react';

interface OtpInputCardProps {
  email: string;
  otp: string;
  onOtpChange: (value: string) => void;
  onBackToEmail: () => void;
  onResendOtp: () => void;
  loading: boolean;
  otpExpiry: number;
  canResend: boolean;
  formatTime: (seconds: number) => string;
}

export const OtpInputCard: React.FC<OtpInputCardProps> = ({
  email,
  otp,
  onOtpChange,
  onBackToEmail,
  onResendOtp,
  loading,
  otpExpiry,
  canResend,
  formatTime
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={onBackToEmail}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to email
          </Button>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">InterviewAce</span>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
            <CardDescription>
              We've sent a 6-digit code to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label htmlFor="otp" className="text-center block">Verification Code</Label>
              <div className="flex justify-center">
                <InputOTP
                  value={otp}
                  onChange={onOtpChange}
                  maxLength={6}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            {otpExpiry > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Timer className="h-4 w-4" />
                  <span>Code expires in {formatTime(otpExpiry)}</span>
                </div>
              </div>
            )}

            <div className="text-center">
              {canResend || otpExpiry === 0 ? (
                <Button 
                  variant="ghost" 
                  onClick={onResendOtp}
                  disabled={loading}
                >
                  Resend code
                </Button>
              ) : (
                <p className="text-sm text-gray-500">
                  Didn't receive the code? You can resend in {formatTime(otpExpiry)}
                </p>
              )}
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Tips:</p>
                  <ul className="mt-1 space-y-1">
                    <li>• Check your spam folder if you don't see the email</li>
                    <li>• The code is valid for 5 minutes</li>
                    <li>• Enter all 6 digits to automatically verify</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
