
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConversationEntry {
  question: string;
  answer: string;
  timestamp: string;
}

interface ConversationHistoryProps {
  conversationHistory: ConversationEntry[];
  isMobile: boolean;
  onClose?: () => void;
}

export const ConversationHistory = ({ 
  conversationHistory, 
  isMobile, 
  onClose 
}: ConversationHistoryProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base md:text-lg flex items-center justify-between">
          <span>Conversation History</span>
          {isMobile && onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              ✕
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'max-h-96' : 'h-[calc(100%-80px)]'} overflow-y-auto`}>
        <div className="space-y-3 md:space-y-4">
          {conversationHistory.length === 0 ? (
            <div className="text-center py-6 md:py-8">
              <p className="text-gray-400 mb-4 text-sm md:text-base">
                Your conversation history will appear here as you ask questions.
              </p>
              <div className="text-xs md:text-sm text-blue-400 bg-blue-900/20 p-3 md:p-4 rounded-lg">
                <p className="font-medium mb-2">🚀 AI Interview Assistant</p>
                <p>• Choose your input method above</p>
                <p>• Voice recognition or manual text input</p>
                <p>• Native audio capture with stealth overlay</p>
                <p>• Real-time AI answer streaming ✅</p>
              </div>
            </div>
          ) : (
            conversationHistory.map((entry, index) => (
              <div key={index} className="border-b border-gray-700 pb-3 md:pb-4">
                <div className="mb-2">
                  <p className="text-gray-400 text-xs md:text-sm">Question:</p>
                  <p className="text-white text-sm">{entry.question}</p>
                </div>
                <div className="mb-2">
                  <p className="text-gray-400 text-xs md:text-sm">AI Answer:</p>
                  <p className="text-gray-200 text-xs md:text-sm leading-relaxed">{entry.answer}</p>
                </div>
                <p className="text-gray-500 text-xs">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
