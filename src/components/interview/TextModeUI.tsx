
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface TextModeUIProps {
  manualQuestion: string;
  currentTranscript: string;
  isGeneratingAnswer: boolean;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
}

export const TextModeUI = ({ 
  manualQuestion, 
  currentTranscript, 
  isGeneratingAnswer, 
  onQuestionChange, 
  onSubmit 
}: TextModeUIProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base md:text-lg">
          Text Input
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex space-x-2">
            <Input
              value={manualQuestion}
              onChange={(e) => onQuestionChange(e.target.value)}
              placeholder="Type the interviewer's question here..."
              className="bg-gray-900 border-gray-600 text-white"
              onKeyPress={(e) => e.key === 'Enter' && onSubmit()}
            />
            <Button
              onClick={onSubmit}
              disabled={!manualQuestion.trim() || isGeneratingAnswer}
              size="sm"
            >
              Submit
            </Button>
          </div>
          {currentTranscript && (
            <div className="bg-gray-900 p-3 rounded-lg">
              <p className="text-gray-400 text-xs mb-1">Last question:</p>
              <p className="text-white text-sm">{currentTranscript}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
