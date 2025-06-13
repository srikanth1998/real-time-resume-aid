
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StealthOverlayControl } from "@/components/StealthOverlayControl";

interface StealthOverlayPanelProps {
  sessionId: string;
  onAnswerGenerated?: (question: string, answer: string) => void;
  className?: string;
}

export const StealthOverlayPanel = ({ 
  sessionId, 
  onAnswerGenerated, 
  className 
}: StealthOverlayPanelProps) => {
  return (
    <div className={className}>
      <StealthOverlayControl
        sessionId={sessionId}
        onAnswerGenerated={onAnswerGenerated}
      />
    </div>
  );
};
