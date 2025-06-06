
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Monitor, Wifi, Check } from "lucide-react";

interface DeviceModeSelectorProps {
  value: 'single' | 'cross';
  onChange: (mode: 'single' | 'cross') => void;
  className?: string;
}

export const DeviceModeSelector = ({ value, onChange, className }: DeviceModeSelectorProps) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Choose Your Setup</h3>
        <p className="text-sm text-gray-600">Select how you want to use InterviewAce during your interview</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Single Device Mode */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            value === 'single' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
          onClick={() => onChange('single')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center space-x-2">
                <Monitor className="h-5 w-5 text-blue-600" />
                <span>Single Device</span>
              </div>
              {value === 'single' && <Check className="h-5 w-5 text-blue-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="secondary">Recommended</Badge>
            <p className="text-sm text-gray-600">
              Use Chrome extension on your computer. AI answers appear directly in the browser during your interview.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Easy setup</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Real-time answers</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>No additional devices needed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cross Device Mode */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            value === 'cross' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
          onClick={() => onChange('cross')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center space-x-2">
                <Wifi className="h-5 w-5 text-purple-600" />
                <span>Cross-Device</span>
              </div>
              {value === 'cross' && <Check className="h-5 w-5 text-blue-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="outline">Advanced</Badge>
            <p className="text-sm text-gray-600">
              Chrome extension on computer + mobile device for viewing AI answers discreetly.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Discrete mobile viewing</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Real-time sync</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Requires mobile device</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {value === 'cross' && (
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-start space-x-3">
            <Smartphone className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-medium text-purple-800">Cross-Device Setup</p>
              <p className="text-sm text-purple-700 mt-1">
                You'll need a mobile device to view AI answers. After payment, we'll send you a mobile link to connect your devices.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
