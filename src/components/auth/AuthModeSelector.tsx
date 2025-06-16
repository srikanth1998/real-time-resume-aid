import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  UserX, 
  Zap, 
  Cloud, 
  HardDrive, 
  Shield, 
  ArrowRight,
  Clock,
  Database,
  RefreshCw
} from 'lucide-react';

interface AuthModeSelectorProps {
  onModeSelect: (mode: 'session' | 'account') => void;
  className?: string;
}

export const AuthModeSelector = ({ onModeSelect, className }: AuthModeSelectorProps) => {
  const [selectedMode, setSelectedMode] = useState<'session' | 'account' | null>(null);

  const handleModeSelect = (mode: 'session' | 'account') => {
    setSelectedMode(mode);
    onModeSelect(mode);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Mode</h2>
        <p className="text-gray-300">How would you like to use InterviewAce today?</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Session Mode */}
        <Card className={`bg-gray-800 border-gray-700 cursor-pointer transition-all hover:ring-2 hover:ring-blue-500 ${selectedMode === 'session' ? 'ring-2 ring-blue-500' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-400" />
                Quick Session
              </div>
              <Badge variant="secondary" className="bg-blue-600">Instant</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-gray-300 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-green-400" />
                <span>No account required</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span>Start immediately</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-400" />
                <span>Local data only</span>
              </div>
            </div>

            <Alert className="bg-blue-900/20 border-blue-700 text-blue-200">
              <AlertDescription className="text-xs">
                Perfect for one-time interviews. Data cleared after session.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={() => handleModeSelect('session')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              Start Quick Session
            </Button>
          </CardContent>
        </Card>

        {/* Account Mode */}
        <Card className={`bg-gray-800 border-gray-700 cursor-pointer transition-all hover:ring-2 hover:ring-green-500 ${selectedMode === 'account' ? 'ring-2 ring-green-500' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-green-400" />
                Account Mode
              </div>
              <Badge variant="secondary" className="bg-green-600">Recommended</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-gray-300 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-green-400" />
                <span>Save multiple resumes</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-400" />
                <span>Interview history & analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-purple-400" />
                <span>Cross-device sync</span>
              </div>
            </div>

            <Alert className="bg-green-900/20 border-green-700 text-green-200">
              <AlertDescription className="text-xs">
                Build your interview performance over time with AI insights.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={() => handleModeSelect('account')}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <User className="h-4 w-4 mr-2" />
              Create Account / Login
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Feature Comparison */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3 text-center">Feature Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="text-gray-300 font-medium mb-2">Core Features</h4>
            <ul className="text-gray-400 space-y-1">
              <li>✅ Real-time AI assistance</li>
              <li>✅ Stealth overlay</li>
              <li>✅ Audio capture</li>
              <li>✅ Session transcripts</li>
            </ul>
          </div>
          <div>
            <h4 className="text-blue-300 font-medium mb-2">Session Mode</h4>
            <ul className="text-gray-400 space-y-1">
              <li>⚡ Instant start</li>
              <li>💾 Local storage</li>
              <li>🔒 Privacy focused</li>
              <li>⏰ Single session</li>
            </ul>
          </div>
          <div>
            <h4 className="text-green-300 font-medium mb-2">Account Mode</h4>
            <ul className="text-gray-400 space-y-1">
              <li>📚 Resume library</li>
              <li>📊 Performance analytics</li>
              <li>🔄 Cross-device sync</li>
              <li>🧠 AI learning</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Upgrade Notice */}
      {selectedMode === 'session' && (
        <Alert className="bg-yellow-900/20 border-yellow-700 text-yellow-200">
          <ArrowRight className="h-4 w-4" />
          <AlertDescription>
            <strong>Pro tip:</strong> You can upgrade to an account anytime during or after your session to save your progress!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};