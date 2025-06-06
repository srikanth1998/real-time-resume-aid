
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Type, Volume2 } from "lucide-react";

interface InputModeSelectorProps {
  inputMode: 'voice' | 'text' | 'extension';
  extensionConnected: boolean;
  onModeChange: (mode: 'voice' | 'text' | 'extension') => void;
}

export const InputModeSelector = ({ inputMode, extensionConnected, onModeChange }: InputModeSelectorProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base md:text-lg">
          Question Input Method
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={() => onModeChange('extension')}
            variant={inputMode === 'extension' ? "default" : "outline"}
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-3"
            disabled={!extensionConnected}
          >
            <Volume2 className="h-4 w-4" />
            <span className="text-xs">Extension</span>
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
        
        {!extensionConnected && (
          <div className="mt-3 text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded">
            💡 Install the InterviewAce Chrome Extension for automatic meeting audio capture
          </div>
        )}
      </CardContent>
    </Card>
  );
};
