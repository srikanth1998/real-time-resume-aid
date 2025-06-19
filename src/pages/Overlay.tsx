
import { useState, useEffect } from "react";
import { OverlayAuth } from "@/components/overlay/OverlayAuth";
import { OverlayInterface } from "@/components/overlay/OverlayInterface";
import { supabase } from "@/integrations/supabase/client";

export default function Overlay() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'session' | 'account'>('session');
  const [sessionData, setSessionData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userSession, setUserSession] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        setAuthMode('account');
        setUserData(session.user);
        setUserSession(session);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        setAuthMode('account');
        setUserData(session.user);
        setUserSession(session);
      } else if (event === 'SIGNED_OUT') {
        handleLogout();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSessionConnect = (sessionId: string, data: any) => {
    setIsAuthenticated(true);
    setAuthMode('session');
    setSessionData(data);
  };

  const handleAccountConnect = (user: any, session: any) => {
    setIsAuthenticated(true);
    setAuthMode('account');
    setUserData(user);
    setUserSession(session);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthMode('session');
    setSessionData(null);
    setUserData(null);
    setUserSession(null);
    
    // Sign out from Supabase if needed
    if (userSession) {
      supabase.auth.signOut();
    }
  };

  if (!isAuthenticated) {
    return (
      <OverlayAuth
        onSessionConnect={handleSessionConnect}
        onAccountConnect={handleAccountConnect}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <OverlayInterface
        sessionData={sessionData}
        userData={userData}
        authMode={authMode}
        onLogout={handleLogout}
      />
    </div>
  );
}
