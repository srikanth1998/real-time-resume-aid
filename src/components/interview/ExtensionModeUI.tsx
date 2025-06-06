
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExtensionModeUIProps {
  extensionStatus: string;
  currentTranscript: string;
  processingRef: React.RefObject<boolean>;
}

export const ExtensionModeUI = ({ extensionStatus, currentTranscript, processingRef }: ExtensionModeUIProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-white text-base md:text-lg">
          <span>Meeting Audio Capture</span>
          <div className="flex items-center space-x-2 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs">{extensionStatus}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-900 p-3 md:p-4 rounded-lg min-h-[80px] md:min-h-[100px]">
          <p className="text-gray-400 text-xs md:text-sm mb-2">
            Last question from meeting:
          </p>
          <p className="text-white text-sm md:text-base leading-relaxed">
            {currentTranscript || "Chrome extension will automatically capture and process meeting audio"}
          </p>
          {processingRef.current && (
            <div className="flex items-center space-x-2 mt-2 text-yellow-400">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-400"></div>
              <span className="text-xs">Processing question...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
