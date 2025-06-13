
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Eye, EyeOff, Monitor, Settings, Shield } from "lucide-react";
import { useStealthOverlay } from '@/hooks/useStealthOverlay';

interface StealthOverlayControlProps {
  sessionId: string;
  onAnswerGenerated?: (question: string, answer: string) => void;
  className?: string;
}

export const StealthOverlayControl = ({ 
  sessionId, 
  onAnswerGenerated, 
  className 
}: StealthOverlayControlProps) => {
  const overlay = useStealthOverlay(sessionId);
  const [showSettings, setShowSettings] = useState(false);
  const [overlaySize, setOverlaySize] = useState([320]);
  const [overlayOpacity, setOverlayOpacity] = useState([90]);

  // Listen for answer generation and update overlay
  useState(() => {
    if (onAnswerGenerated && overlay.updateOverlayContent) {
      // This would be called when new answers are generated
      // Implementation depends on how answers are generated in the main app
    }
  });

  const handleCreateOverlay = async () => {
    const position = {
      x: window.screen.width - overlaySize[0] - 20,
      y: 20,
      width: overlaySize[0],
      height: Math.min(450, window.screen.height - 100)
    };
    
    await overlay.createOverlay(position);
  };

  if (!overlay.isAvailable) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-600">Stealth Mode Unavailable</p>
              <p className="text-xs text-gray-500">Native helper not detected</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <span>Stealth Mode</span>
          </div>
          <div className="flex items-center space-x-2">
            {overlay.isVisible && (
              <Badge variant="default" className="text-xs">
                Active
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Monitor className="h-4 w-4 text-gray-600" />
              <span className="text-sm">Discrete Overlay</span>
            </div>
            <Switch
              checked={overlay.isVisible}
              onCheckedChange={(checked) => {
                if (checked) {
                  overlay.isVisible ? overlay.showOverlay() : handleCreateOverlay();
                } else {
                  overlay.hideOverlay();
                }
              }}
              disabled={overlay.loading}
            />
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Creates a hidden overlay window that won't appear in screen recordings. 
            Perfect for discrete viewing during video interviews.
          </p>
        </div>

        {showSettings && (
          <div className="space-y-4 pt-3 border-t border-gray-200">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">
                Overlay Width: {overlaySize[0]}px
              </label>
              <Slider
                value={overlaySize}
                onValueChange={setOverlaySize}
                max={400}
                min={280}
                step={20}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">
                Opacity: {overlayOpacity[0]}%
              </label>
              <Slider
                value={overlayOpacity}
                onValueChange={setOverlayOpacity}
                max={100}
                min={50}
                step={10}
                className="w-full"
              />
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={overlay.toggleOverlay}
                disabled={!overlay.isVisible}
                className="flex-1"
              >
                {overlay.isVisible ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Show
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateOverlay}
                disabled={overlay.loading}
                className="flex-1"
              >
                {overlay.loading ? 'Creating...' : 'Recreate'}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-start space-x-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <Shield className="h-4 w-4 text-purple-600 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-purple-800">Screen Capture Protection</p>
            <p className="text-xs text-purple-700 mt-1">
              This overlay is hidden from screen recordings and won't appear during screen sharing.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
