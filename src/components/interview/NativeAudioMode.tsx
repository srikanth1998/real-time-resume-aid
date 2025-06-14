
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Settings, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNativeAudio } from '@/hooks/useNativeAudio';
import { NativeAudioSetup } from '@/components/NativeAudioSetup';
import { supabase } from '@/integrations/supabase/client';

interface NativeAudioModeProps {
  sessionId: string | null;
  onTranscriptionReceived?: (text: string) => void;
}

export const NativeAudioMode = ({ sessionId, onTranscriptionReceived }: NativeAudioModeProps) => {
  const { capabilities, isConnected, session, startCapture, stopCapture } = useNativeAudio(sessionId);
  const [showSetup, setShowSetup] = useState(false);

  const handleToggleCapture = async () => {
    if (!session || session.status === 'idle') {
      try {
        // Get JWT from Supabase auth
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const jwt = authSession?.access_token || '';
        
        if (!jwt) {
          throw new Error('No authentication token available');
        }
        
        await startCapture(jwt);
      } catch (error) {
        console.error('Failed to start capture:', error);
      }
    } else {
      stopCapture();
    }
  };

  const getStatusColor = () => {
    if (!capabilities.available) return 'text-gray-400';
    if (!isConnected) return 'text-yellow-400';
    if (session?.status === 'active') return 'text-green-400';
    if (session?.status === 'error') return 'text-red-400';
    return 'text-blue-400';
  };

  const getStatusText = () => {
    if (!capabilities.available) return 'Helper not installed';
    if (!isConnected) return 'Connecting to helper...';
    if (session?.status === 'active') return 'Capturing audio';
    if (session?.status === 'starting') return 'Starting capture...';
    if (session?.status === 'stopping') return 'Stopping capture...';
    if (session?.status === 'error') return `Error: ${session.error}`;
    return 'Ready to capture';
  };

  if (!capabilities.available) {
    return (
      <div className="space-y-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center justify-between">
              Native Audio Capture
              <Button 
                onClick={() => setShowSetup(!showSetup)}
                variant="ghost"
                size="sm"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Native helper not installed. Click the setup button to get started.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        
        {showSetup && <NativeAudioSetup />}
      </div>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center justify-between">
          Native Audio Capture
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getStatusColor()}>
              {isConnected ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
              Connected
            </Badge>
            <Button 
              onClick={() => setShowSetup(!showSetup)}
              variant="ghost"
              size="sm"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Status:</span>
          <span className={getStatusColor()}>{getStatusText()}</span>
        </div>

        <Button
          onClick={handleToggleCapture}
          disabled={!isConnected || !sessionId}
          className={`w-full flex items-center gap-2 ${
            session?.status === 'active' 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {session?.status === 'active' ? (
            <>
              <MicOff className="h-4 w-4" />
              Stop Capture
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Start Capture
            </>
          )}
        </Button>

        {session?.error && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{session.error}</AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-400 space-y-1">
          <p>• Direct system audio capture via {capabilities.systemAudio?.method || 'native APIs'}</p>
          <p>• No virtual drivers or browser permissions required</p>
          <p>• Works with any meeting platform or application</p>
        </div>

        {showSetup && <NativeAudioSetup />}
      </CardContent>
    </Card>
  );
};
