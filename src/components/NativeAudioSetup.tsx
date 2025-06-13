
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { useNativeAudio } from '@/hooks/useNativeAudio';

export const NativeAudioSetup = () => {
  const { capabilities, checkNativeHelper } = useNativeAudio(null);
  const [isChecking, setIsChecking] = useState(false);
  const [platform, setPlatform] = useState<'windows' | 'macos' | 'unknown'>('unknown');

  useEffect(() => {
    // Detect platform
    if (navigator.platform.includes('Win')) {
      setPlatform('windows');
    } else if (navigator.platform.includes('Mac')) {
      setPlatform('macos');
    }
  }, []);

  const handleCheckHelper = async () => {
    setIsChecking(true);
    await checkNativeHelper();
    setIsChecking(false);
  };

  const downloadHelper = () => {
    // This would download the appropriate helper for the platform
    const downloadUrl = platform === 'windows' 
      ? '/downloads/InterviewAce-Helper-Windows.exe'
      : '/downloads/InterviewAce-Helper-macOS.dmg';
    
    window.open(downloadUrl, '_blank');
  };

  const installDriver = () => {
    const driverUrl = platform === 'windows'
      ? 'https://vb-audio.com/Cable/'
      : 'https://github.com/ExistentialAudio/BlackHole';
    
    window.open(driverUrl, '_blank');
  };

  if (platform === 'unknown') {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Native audio capture is only supported on Windows and macOS.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          Native Audio Setup
          {capabilities.available && <CheckCircle className="h-5 w-5 text-green-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Platform:</span>
          <Badge variant="outline">{platform}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-300">Helper Status:</span>
          <Badge variant={capabilities.available ? "default" : "destructive"}>
            {capabilities.available ? "Connected" : "Not Available"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-300">Audio Driver:</span>
          <Badge variant={capabilities.drivers[platform] ? "default" : "destructive"}>
            {platform === 'windows' ? 'VB-Cable' : 'BlackHole'} 
            {capabilities.drivers[platform] ? " ✓" : " ✗"}
          </Badge>
        </div>

        {!capabilities.available && (
          <div className="space-y-3 pt-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                To use native audio capture, you need to install the helper application and audio driver.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={downloadHelper} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Helper
              </Button>
              
              <Button onClick={installDriver} variant="outline" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Get {platform === 'windows' ? 'VB-Cable' : 'BlackHole'}
              </Button>
            </div>

            <Button 
              onClick={handleCheckHelper} 
              disabled={isChecking}
              variant="secondary" 
              className="w-full"
            >
              {isChecking ? 'Checking...' : 'Check Installation'}
            </Button>
          </div>
        )}

        {capabilities.available && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Native audio capture is ready! You can now capture audio without browser extensions.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
