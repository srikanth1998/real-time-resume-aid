
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff } from "lucide-react";

interface VoiceModeUIProps {
  isListening: boolean;
  currentTranscript: string;
  isMobile: boolean;
  onToggleListening: () => void;
}

export const VoiceModeUI = ({ isListening, currentTranscript, isMobile, onToggleListening }: VoiceModeUIProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-white text-base md:text-lg">
          <span>Voice Recognition</span>
          <Button
            onClick={onToggleListening}
            variant={isListening ? "destructive" : "default"}
            size={isMobile ? "sm" : "lg"}
            className="flex items-center space-x-2"
          >
            {isListening ? <MicOff className="h-4 w-4 md:h-5 md:w-5" /> : <Mic className="h-4 w-4 md:h-5 md:w-5" />}
            <span className="text-xs md:text-sm">{isListening ? "Stop" : "Start"}</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-900 p-3 md:p-4 rounded-lg min-h-[80px] md:min-h-[100px]">
          <p className="text-gray-400 text-xs md:text-sm mb-2">
            Current transcript:
          </p>
          <p className="text-white text-sm md:text-base leading-relaxed">
            {currentTranscript || (isListening 
              ? "Listening for interviewer question..." 
              : "Tap 'Start' to begin listening for questions"
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
