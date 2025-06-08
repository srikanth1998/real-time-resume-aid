
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Monitor, Wifi, WifiOff } from "lucide-react";

interface Device {
  id: string;
  device_type: string;
  connection_id: string;
  last_ping: string;
  created_at: string;
}

interface CrossDeviceStatusProps {
  sessionId: string;
  deviceType: 'desktop' | 'mobile';
  className?: string;
}

const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY";

export const CrossDeviceStatus = ({ sessionId, deviceType, className }: CrossDeviceStatusProps) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    const registerDevice = async () => {
      console.log('Registering device:', { sessionId, deviceType });
      
      try {
        const response = await fetch(
          `https://jafylkqbmvdptrqwwyed.supabase.co/functions/v1/cross-device-sync`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              sessionId,
              action: 'register_device',
              deviceType,
            }),
          }
        );

        const result = await response.json();
        console.log('Device registration response:', result);
        
        if (result.success) {
          setIsRegistered(true);
        }
      } catch (error) {
        console.error('Failed to register device:', error);
      }
    };

    const fetchDevices = async () => {
      try {
        const response = await fetch(
          `https://jafylkqbmvdptrqwwyed.supabase.co/functions/v1/cross-device-sync`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              sessionId,
              action: 'get_active_devices',
            }),
          }
        );

        const result = await response.json();
        if (result.success && result.devices) {
          setDevices(result.devices);
        }
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      } finally {
        setLoading(false);
      }
    };

    registerDevice();
    fetchDevices();

    // Set up periodic device checking
    const interval = setInterval(fetchDevices, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, [sessionId, deviceType]);

  const getDeviceIcon = (type: string) => {
    return type === 'mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />;
  };

  const getConnectionStatus = () => {
    const hasDesktop = devices.some(d => d.device_type === 'desktop');
    const hasMobile = devices.some(d => d.device_type === 'mobile');
    
    if (deviceType === 'mobile') {
      return hasDesktop ? 'connected' : 'waiting';
    } else {
      return hasMobile ? 'connected' : 'single-device';
    }
  };

  const connectionStatus = getConnectionStatus();

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Wifi className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Checking device connections...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Cross-Device Status</span>
            {connectionStatus === 'connected' ? (
              <Badge variant="default" className="flex items-center space-x-1">
                <Wifi className="h-3 w-3" />
                <span>Connected</span>
              </Badge>
            ) : connectionStatus === 'waiting' ? (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <WifiOff className="h-3 w-3" />
                <span>Waiting for Desktop</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center space-x-1">
                <Monitor className="h-3 w-3" />
                <span>Single Device</span>
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  {getDeviceIcon(device.device_type)}
                  <span className="capitalize">{device.device_type}</span>
                  {device.device_type === deviceType && (
                    <Badge variant="outline" className="text-xs">This Device</Badge>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  Active {Math.round((Date.now() - new Date(device.last_ping).getTime()) / 1000)}s ago
                </span>
              </div>
            ))}
          </div>

          {connectionStatus === 'waiting' && (
            <p className="text-xs text-gray-600">
              Open your interview session on desktop to see AI answers here in real-time.
            </p>
          )}

          {connectionStatus === 'connected' && (
            <p className="text-xs text-green-600">
              ✓ Cross-device sync active - answers will appear in real-time
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
