
import React, { useState } from 'react';
import { OverlayAuth } from '@/components/overlay/OverlayAuth';
import { OverlayInterface } from '@/components/overlay/OverlayInterface';

type OverlayMode = 'auth' | 'session' | 'account';

export default function Overlay() {
  const [mode, setMode] = useState<OverlayMode>('auth');
  const [sessionData, setSessionData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  const handleSessionConnected = (session: any) => {
    setSessionData(session);
    setMode('session');
  };

  const handleAccountConnected = (user: any) => {
    setUserData(user);
    setMode('account');
  };

  const handleDisconnect = () => {
    setMode('auth');
    setSessionData(null);
    setUserData(null);
  };

  if (mode === 'auth') {
    return (
      <OverlayAuth
        onSessionConnected={handleSessionConnected}
        onAccountConnected={handleAccountConnected}
      />
    );
  }

  return (
    <OverlayInterface
      sessionData={sessionData}
      userData={userData}
      mode={mode === 'session' ? 'session' : 'account'}
      onDisconnect={handleDisconnect}
    />
  );
}
