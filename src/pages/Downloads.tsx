import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Monitor, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';

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

  const downloadHelper = async (targetPlatform: 'windows' | 'macos') => {
    // Get the Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jafylkqbmvdptrqwwyed.supabase.co';
    
    const downloadUrl = targetPlatform === 'windows' 
      ? `${supabaseUrl}/storage/v1/object/public/native-helpers/InterviewAce-Helper-Windows.exe`
      : `${supabaseUrl}/storage/v1/object/public/native-helpers/InterviewAce-Helper-macOS.dmg`;
    
    // Create temporary link to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = targetPlatform === 'windows' ? 'InterviewAce-Helper-Windows.exe' : 'InterviewAce-Helper-macOS.dmg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openDriverLink = (targetPlatform: 'windows' | 'macos') => {
    const driverUrl = targetPlatform === 'windows'
      ? 'https://vb-audio.com/Cable/'
      : 'https://github.com/ExistentialAudio/BlackHole/releases';
    
    window.open(driverUrl, '_blank');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" />
      
      {/* Floating orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-teal-400/20 to-blue-400/20 rounded-full blur-3xl" />
      <div className="fixed top-40 right-10 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl" />

      <Navigation />
      
      <div className="relative pt-32 px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl lg:text-6xl font-bold font-poppins text-white mb-6">
              Native Helper
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400"> Downloads</span>
            </h1>
            <p className="text-xl text-white/80 font-inter mb-8 max-w-3xl mx-auto">
              Advanced audio capture and stealth overlay features for seamless interview coaching
            </p>
            
            {platform !== 'unknown' && (
              <div className="inline-flex items-center space-x-2 backdrop-blur-md bg-glass border border-glass-border rounded-full px-6 py-3">
                <Monitor className="h-4 w-4 text-accent" />
                <span className="text-white font-medium">
                  Detected: {platform === 'windows' ? 'Windows' : platform === 'macos' ? 'macOS' : 'Linux'}
                </span>
              </div>
            )}
          </div>

          {/* Download Cards */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            
            {/* Windows Helper */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <Card className="relative backdrop-blur-md bg-glass border border-glass-border rounded-3xl overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                
                <CardHeader className="text-center pb-6 pt-8">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full bg-blue-500/20 border border-blue-500/30">
                      <Monitor className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white font-poppins flex items-center justify-center gap-3">
                    Windows Helper
                    {platform === 'windows' && (
                      <Badge className="bg-green-600/20 text-green-400 border-green-500/50">Recommended</Badge>
                    )}
                  </CardTitle>
                  <p className="text-white/70">Advanced system audio capture with stealth overlay</p>
                </CardHeader>
                
                <CardContent className="space-y-6 p-8">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-white text-lg">Features</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        'Native WASAPI audio capture',
                        'Zero-driver system audio loopback',
                        'Invisible stealth overlay',
                        'Works with all meeting platforms',
                        'Real-time audio processing'
                      ].map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                          <span className="text-white/80 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-4">
                    <h4 className="font-semibold text-white mb-2">System Requirements</h4>
                    <div className="text-sm text-white/70 space-y-1">
                      <p>• Windows 10/11 (64-bit)</p>
                      <p>• 4GB RAM minimum</p>
                      <p>• Administrator privileges</p>
                      <p>• No additional drivers required</p>
                    </div>
                  </div>

                  <Button 
                    onClick={() => downloadHelper('windows')}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-2xl font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download for Windows
                  </Button>
                  
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                    <div className="text-green-400 text-sm font-medium mb-1">✅ Ready to Download</div>
                    <div className="text-green-300/80 text-xs">Native WASAPI - No drivers needed!</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* macOS Helper - Coming Soon */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 to-gray-600/10 rounded-3xl blur-xl transition-all duration-300" />
              <Card className="relative backdrop-blur-md bg-glass border border-glass-border rounded-3xl overflow-hidden opacity-75">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-500 to-gray-600" />
                
                <CardHeader className="text-center pb-6 pt-8">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full bg-gray-500/20 border border-gray-500/30">
                      <Monitor className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white font-poppins flex items-center justify-center gap-3">
                    macOS Helper
                    <Badge className="bg-orange-600/20 text-orange-400 border-orange-500/50">Coming Soon</Badge>
                  </CardTitle>
                  <p className="text-white/70">Advanced CoreAudio capture for macOS</p>
                </CardHeader>
                
                <CardContent className="space-y-6 p-8">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-white text-lg">Planned Features</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        'Native CoreAudio process-tap',
                        'System audio capture (macOS 14.4+)',
                        'Stealth overlay with window exclusion',
                        'Cross-platform compatibility',
                        'Zero-latency audio processing'
                      ].map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="h-4 w-4 rounded-full border-2 border-gray-400 flex-shrink-0" />
                          <span className="text-white/60 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-4">
                    <h4 className="font-semibold text-white mb-2">Planned Requirements</h4>
                    <div className="text-sm text-white/60 space-y-1">
                      <p>• macOS 14.4 Sonoma or later</p>
                      <p>• Apple Silicon or Intel processor</p>
                      <p>• Security permissions for audio</p>
                      <p>• No additional drivers required</p>
                    </div>
                  </div>

                  <Button 
                    disabled
                    className="w-full bg-gray-600/50 text-white/50 py-4 rounded-2xl font-semibold text-lg cursor-not-allowed"
                  >
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Coming Soon
                  </Button>
                  
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
                    <div className="text-orange-400 text-sm font-medium mb-1">🚧 In Development</div>
                    <div className="text-orange-300/80 text-xs">Expected release: Q2 2024</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Linux Notice */}
          {platform === 'linux' && (
            <div className="max-w-2xl mx-auto mb-12">
              <Alert className="backdrop-blur-md bg-glass border border-glass-border rounded-2xl p-6">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <AlertDescription className="text-white/80 ml-2">
                  <strong className="text-white">Linux Support:</strong> Native helper is planned for future release. 
                  You can currently use browser-based voice recognition or text input modes.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Installation Guide */}
          <div className="backdrop-blur-md bg-glass border border-glass-border rounded-3xl p-8">
            <h2 className="text-3xl font-bold text-white font-poppins text-center mb-8">
              Installation Guide
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              
              {/* Windows Guide */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <Monitor className="h-5 w-5 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Windows Setup</h3>
                </div>
                
                <div className="space-y-3">
                  {[
                    'Download the InterviewAce Helper executable',
                    'Right-click and "Run as Administrator"',
                    'Allow Windows Defender if prompted',
                    'Helper will appear in system tray',
                    'Start your interview session!'
                  ].map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="text-white/80">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* macOS Guide */}
              <div className="space-y-4 opacity-60">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 rounded-lg bg-gray-500/20 border border-gray-500/30">
                    <Monitor className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">macOS Setup (Coming Soon)</h3>
                </div>
                
                <div className="space-y-3">
                  {[
                    'Download and install the DMG package',
                    'Grant audio permissions in System Settings',
                    'Allow app in Security & Privacy',
                    'Helper will appear in menu bar',
                    'Ready for interview sessions!'
                  ].map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-500/20 border border-gray-500/50 flex items-center justify-center text-gray-400 text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="text-white/60">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 backdrop-blur-sm bg-accent/10 border border-accent/20 rounded-2xl">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-accent font-semibold mb-1">Pro Tip</div>
                  <div className="text-white/80 text-sm">
                    After installation, test your setup before the actual interview. Start a practice session 
                    to ensure audio capture and overlay visibility work perfectly.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};