
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

interface SuccessCardProps {
  title?: string;
  description?: string;
}

export const SuccessCard: React.FC<SuccessCardProps> = ({ 
  title = "Welcome!",
  description = "Login successful. Redirecting you now..."
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};
