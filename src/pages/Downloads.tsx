import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Monitor, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';

export const Downloads = () => {
  const [platform, setPlatform] = useState<'windows' | 'macos' | 'linux' | 'unknown'>('unknown');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('windows') || navigator.platform.includes('Win')) {
      setPlatform('windows');
    } else if (userAgent.includes('mac') || navigator.platform.includes('Mac')) {
      setPlatform('macos');
    } else if (userAgent.includes('linux')) {
      setPlatform('linux');
    }
  }, []);

  const downloadHelper = (targetPlatform: 'windows' | 'macos') => {
    // Show coming soon alert instead of broken download
    alert(`${targetPlatform === 'windows' ? 'Windows' : 'macOS'} helper is currently being built. For now, you can use the web app's voice recognition or text input modes. The native helper will be available soon!`);
  };

  const openDriverLink = (targetPlatform: 'windows' | 'macos') => {
    const driverUrl = targetPlatform === 'windows'
      ? 'https://vb-audio.com/Cable/'
      : 'https://github.com/ExistentialAudio/BlackHole/releases';
    
    window.open(driverUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Native Helper Downloads
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Advanced audio capture and stealth overlay features for InterviewAce
            </p>
            
            <Alert className="bg-yellow-900/20 border-yellow-700 text-yellow-200 max-w-2xl mx-auto mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Development Notice:</strong> Native helpers are currently being built. 
                In the meantime, you can use the web app with voice recognition or text input modes.
              </AlertDescription>
            </Alert>
            
            {platform !== 'unknown' && (
              <Alert className="bg-blue-900/20 border-blue-700 text-blue-200 max-w-md mx-auto">
                <Monitor className="h-4 w-4" />
                <AlertDescription>
                  Detected platform: <strong>{platform === 'windows' ? 'Windows' : platform === 'macos' ? 'macOS' : 'Linux'}</strong>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Windows Helper */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Windows Helper
                  {platform === 'windows' && (
                    <Badge variant="default" className="bg-green-600">Recommended</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-gray-300 text-sm space-y-2">
                  <p>• Native system audio capture via WASAPI</p>
                  <p>• Stealth overlay that's hidden from screen sharing</p>
                  <p>• No browser permissions required</p>
                  <p>• Works with any meeting platform</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Requirements:</h4>
                  <div className="text-sm text-gray-300">
                    <p>• Windows 10/11</p>
                    <p>• VB-Cable virtual audio driver</p>
                    <p>• Administrator privileges for installation</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={() => downloadHelper('windows')}
                    className="w-full bg-gray-600 hover:bg-gray-700"
                    disabled
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Coming Soon - Windows Helper
                  </Button>
                  
                  <Button 
                    onClick={() => openDriverLink('windows')}
                    variant="outline"
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Get VB-Cable Driver
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* macOS Helper */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  macOS Helper
                  {platform === 'macos' && (
                    <Badge variant="default" className="bg-green-600">Recommended</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-gray-300 text-sm space-y-2">
                  <p>• Native CoreAudio process-tap (macOS 14.4+)</p>
                  <p>• No virtual drivers required</p>
                  <p>• Stealth overlay with window exclusion</p>
                  <p>• Works with any meeting platform</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Requirements:</h4>
                  <div className="text-sm text-gray-300">
                    <p>• macOS 14.4 or later</p>
                    <p>• Security permissions for audio access</p>
                    <p>• No additional drivers needed</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={() => downloadHelper('macos')}
                    className="w-full bg-gray-600 hover:bg-gray-700"
                    disabled
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Coming Soon - macOS Helper
                  </Button>
                  
                  <Alert className="bg-green-900/20 border-green-700 text-green-200 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>No drivers needed!</strong> Uses native CoreAudio process-tap API.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Linux Notice */}
          {platform === 'linux' && (
            <Alert className="bg-yellow-900/20 border-yellow-700 text-yellow-200 mb-8">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Linux users:</strong> Native helper is not available for Linux yet. 
                You can still use voice recognition or text input modes in your browser.
              </AlertDescription>
            </Alert>
          )}

          {/* Installation Instructions */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Installation Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Windows Setup
                  </h3>
                  <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                    <li>Download and install VB-Cable driver first</li>
                    <li>Restart your computer after driver installation</li>
                    <li>Download and run InterviewAce Helper as Administrator</li>
                    <li>Allow Windows Defender/Antivirus if prompted</li>
                    <li>The helper will run in system tray</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    macOS Setup
                  </h3>
                  <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                    <li>Download and install InterviewAce Helper DMG</li>
                    <li>Grant audio permissions in System Preferences</li>
                    <li>Allow the app in Security & Privacy settings</li>
                    <li>The helper will appear in menu bar</li>
                    <li>No additional drivers required!</li>
                  </ol>
                </div>
              </div>

              <Alert className="bg-green-900/20 border-green-700 text-green-200">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Pro Tip:</strong> After installation, start an interview session and select 
                  "Native Audio" mode for the best experience with stealth overlay features.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};