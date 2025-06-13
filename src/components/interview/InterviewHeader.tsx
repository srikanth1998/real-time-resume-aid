
import { Brain, Clock, AlertTriangle, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InterviewHeaderProps {
  isStreaming: boolean;
  timeRemaining: number;
  isMobile: boolean;
  showHistory: boolean;
  onToggleHistory: () => void;
}

export const InterviewHeader = ({
  isStreaming,
  timeRemaining,
  isMobile,
  showHistory,
  onToggleHistory
}: InterviewHeaderProps) => {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining <= 300;

  return (
    <div className="border-b border-gray-800 p-3 md:p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
          <span className="font-semibold text-sm md:text-base">InterviewAce</span>
          {isStreaming && (
            <span className="bg-blue-800 text-blue-200 text-xs px-2 py-1 rounded animate-pulse">
              🧠 AI Responding
            </span>
          )}
        </div>
        
        {isMobile && (
          <Button
            onClick={onToggleHistory}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm md:text-base ${isLowTime ? 'bg-red-900 text-red-200' : 'bg-gray-800'}`}>
          <Clock className="h-3 w-3 md:h-4 md:w-4" />
          <span className="font-mono">{formatTime(timeRemaining)}</span>
          {isLowTime && <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-red-400" />}
        </div>
      </div>
    </div>
  );
};
