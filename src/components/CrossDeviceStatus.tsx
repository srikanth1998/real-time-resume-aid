
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Monitor, Wifi, WifiOff, Users } from "lucide-react";
import { useCrossDeviceSync } from "@/hooks/useCrossDeviceSync";

interface CrossDeviceStatusProps {
  sessionId: string;
  deviceType: 'desktop' | 'mobile';
  className?: string;
}

export const CrossDeviceStatus = ({ sessionId, deviceType, className }: CrossDeviceStatusProps) => {
  const { isConnected, deviceCount, activeDevices, loading } = useCrossDeviceSync(sessionId, deviceType);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          <span>Cross-Device Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Connection Status</span>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {loading ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Active Devices</span>
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">{deviceCount}</span>
          </div>
        </div>

        {activeDevices.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm text-gray-600">Connected Devices:</span>
            {activeDevices.map((device) => (
              <div key={device.connection_id} className="flex items-center space-x-2">
                {device.device_type === 'desktop' ? (
                  <Monitor className="h-4 w-4 text-blue-500" />
                ) : (
                  <Smartphone className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm capitalize">{device.device_type}</span>
                <Badge variant="outline" className="text-xs">
                  {new Date(device.last_ping).toLocaleTimeString()}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {deviceType === 'mobile' && isConnected && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              ✅ This device is ready to receive AI answers from your desktop interview session.
            </p>
          </div>
        )}

        {deviceType === 'desktop' && isConnected && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              ✅ Chrome extension will capture audio and sync answers to your connected mobile device.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
