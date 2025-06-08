
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Monitor, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

export const CrossDeviceStatus = ({ sessionId, deviceType, className }: CrossDeviceStatusProps) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    const registerDevice = async () => {
      console.log('Registering device:', { sessionId, deviceType });
      
      try {
        // Register device connection in session_connections table
        const connectionId = `${sessionId}_${deviceType}_${Date.now()}`;
        
        const { error } = await supabase
          .from('session_connections')
          .insert({
            session_id: sessionId,
            connection_id: connectionId,
            device_type: deviceType,
            last_ping: new Date().toISOString()
          });

        if (error) {
          console.error('Failed to register device:', error);
        } else {
          console.log('Device registered successfully:', connectionId);
          setIsRegistered(true);
        }
      } catch (error) {
        console.error('Failed to register device:', error);
      }
    };

    const fetchDevices = async () => {
      try {
        // Get active devices from session_connections table
        const { data: connections, error } = await supabase
          .from('session_connections')
          .select('*')
          .eq('session_id', sessionId)
          .gte('last_ping', new Date(Date.now() - 2 * 60 * 1000).toISOString()); // Active in last 2 minutes

        if (error) {
          console.error('Failed to fetch devices:', error);
        } else {
          setDevices(connections || []);
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
