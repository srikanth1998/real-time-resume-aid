
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Type, Volume2, Monitor } from "lucide-react";

interface InputModeSelectorProps {
  inputMode: 'voice' | 'text' | 'native';
  nativeAudioAvailable: boolean;
  onModeChange: (mode: 'voice' | 'text' | 'native') => void;
}

export const InputModeSelector = ({ 
  inputMode, 
  nativeAudioAvailable, 
  onModeChange 
}: InputModeSelectorProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base md:text-lg">
          Question Input Method
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Button
            onClick={() => onModeChange('native')}
            variant={inputMode === 'native' ? "default" : "outline"}
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-3"
            disabled={!nativeAudioAvailable}
          >
            <Monitor className="h-4 w-4" />
            <span className="text-xs">Native Audio</span>
          </Button>
          
          <Button
            onClick={() => onModeChange('voice')}
            variant={inputMode === 'voice' ? "default" : "outline"}
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-3"
          >
            <Mic className="h-4 w-4" />
            <span className="text-xs">Voice</span>
          </Button>
          
          <Button
            onClick={() => onModeChange('text')}
            variant={inputMode === 'text' ? "default" : "outline"}
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-3"
          >
            <Type className="h-4 w-4" />
            <span className="text-xs">Text</span>
          </Button>
        </div>
        
        <div className="mt-3 space-y-2">
          {!nativeAudioAvailable && (
            <div className="text-xs text-blue-400 bg-blue-900/20 p-2 rounded">
              💡 Install the Native Helper for advanced audio capture and stealth overlay features
            </div>
          )}
          
          {nativeAudioAvailable && (
            <div className="text-xs text-green-400 bg-green-900/20 p-2 rounded">
              ⚡ Native audio capture available with stealth overlay mode!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
