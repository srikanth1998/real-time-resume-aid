
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeviceConnection {
  id: string;
  session_id: string;
  connection_id: string;
  device_type: string;
  last_ping: string;
  created_at: string;
}

interface CrossDeviceSyncState {
  isConnected: boolean;
  connectionId: string | null;
  activeDevices: DeviceConnection[];
  deviceCount: number;
}

export const useCrossDeviceSync = (sessionId: string, deviceType: 'desktop' | 'mobile') => {
  const [state, setState] = useState<CrossDeviceSyncState>({
    isConnected: false,
    connectionId: null,
    activeDevices: [],
    deviceCount: 0
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const registerDevice = useCallback(async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      console.log('Registering device:', { sessionId, deviceType });
      
      const { data, error } = await supabase.functions.invoke('cross-device-sync', {
        body: {
          sessionId,
          action: 'register_device',
          deviceType
        }
      });

      if (error) throw error;

      console.log('Device registration response:', data);

      setState(prev => ({
        ...prev,
        isConnected: true,
        connectionId: data.connectionId
      }));

      toast({
        title: "Device Connected",
        description: `${deviceType} device registered for cross-device session`,
      });

    } catch (error: any) {
      console.error('Device registration error:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to register device",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [sessionId, deviceType, toast]);

  const pingConnection = useCallback(async () => {
    if (!state.connectionId || !sessionId) return;

    try {
      await supabase.functions.invoke('cross-device-sync', {
        body: {
          sessionId,
          action: 'ping',
          data: { connectionId: state.connectionId }
        }
      });
    } catch (error) {
      console.error('Ping error:', error);
    }
  }, [sessionId, state.connectionId]);

  const getActiveDevices = useCallback(async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase.functions.invoke('cross-device-sync', {
        body: {
          sessionId,
          action: 'get_active_devices'
        }
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        activeDevices: data.connections || [],
        deviceCount: data.count || 0
      }));

    } catch (error) {
      console.error('Get active devices error:', error);
    }
  }, [sessionId]);

  // Register device on mount
  useEffect(() => {
    registerDevice();
  }, [registerDevice]);

  // Set up ping interval (every 30 seconds)
  useEffect(() => {
    if (!state.isConnected) return;

    const pingInterval = setInterval(pingConnection, 30000);
    return () => clearInterval(pingInterval);
  }, [state.isConnected, pingConnection]);

  // Set up active devices polling (every 10 seconds)
  useEffect(() => {
    if (!state.isConnected) return;

    const devicesInterval = setInterval(getActiveDevices, 10000);
    getActiveDevices(); // Initial fetch
    
    return () => clearInterval(devicesInterval);
  }, [state.isConnected, getActiveDevices]);

  return {
    ...state,
    loading,
    registerDevice,
    getActiveDevices
  };
};
