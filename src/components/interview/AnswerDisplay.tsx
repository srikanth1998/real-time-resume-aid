
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, RotateCcw } from "lucide-react";

interface AnswerDisplayProps {
  currentAnswer: string;
  isStreaming: boolean;
  isGeneratingAnswer: boolean;
  currentTranscript: string;
  onCopy: () => void;
  onRegenerate: () => void;
}

export const AnswerDisplay = ({ 
  currentAnswer, 
  isStreaming, 
  isGeneratingAnswer, 
  currentTranscript, 
  onCopy, 
  onRegenerate 
}: AnswerDisplayProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-white text-base md:text-lg">
          <span>AI-Generated Answer {isStreaming && <span className="text-blue-400">(Streaming...)</span>}</span>
          <div className="flex space-x-1 md:space-x-2">
            <Button
              onClick={onCopy}
              variant="outline"
              size="sm"
              disabled={!currentAnswer || isGeneratingAnswer}
              className="p-2"
            >
              <Copy className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            <Button
              onClick={onRegenerate}
              variant="outline"
              size="sm"
              disabled={!currentTranscript || isGeneratingAnswer}
              className="p-2"
            >
              <RotateCcw className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-900 p-3 md:p-4 rounded-lg min-h-[120px] md:min-h-[200px] max-h-60 md:max-h-none overflow-y-auto">
          <p className="text-white leading-relaxed text-sm md:text-base">
            {currentAnswer || "Ask a question to get an AI-generated response tailored to your resume and job description."}
          </p>
          {isGeneratingAnswer && !isStreaming && (
            <div className="flex items-center space-x-2 mt-4 text-blue-400">
              <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-blue-400"></div>
              <span className="text-xs md:text-sm">Analyzing documents and generating personalized answer...</span>
            </div>
          )}
          {isStreaming && (
            <div className="flex items-center space-x-2 mt-4 text-green-400">
              <div className="animate-pulse rounded-full h-3 w-3 md:h-4 md:w-4 bg-green-400"></div>
              <span className="text-xs md:text-sm">Streaming response in real-time...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
