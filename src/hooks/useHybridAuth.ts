import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export type AuthMode = 'session' | 'account';

interface HybridAuthState {
  mode: AuthMode;
  user: User | null;
  session: Session | null;
  sessionId: string | null;
  isLoading: boolean;
  isUpgrading: boolean;
}

interface LocalSessionData {
  sessionId: string;
  resumeData?: any;
  preferences?: any;
  tempTranscripts?: any[];
}

export const useHybridAuth = () => {
  const [state, setState] = useState<HybridAuthState>({
    mode: 'session',
    user: null,
    session: null,
    sessionId: null,
    isLoading: true,
    isUpgrading: false
  });

  // Generate local session ID
  const generateSessionId = useCallback(() => {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for existing Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setState(prev => ({
            ...prev,
            mode: 'account',
            user: session.user,
            session,
            sessionId: null,
            isLoading: false
          }));
        } else {
          // Check for local session
          const localSession = localStorage.getItem('local_session_data');
          if (localSession) {
            const sessionData: LocalSessionData = JSON.parse(localSession);
            setState(prev => ({
              ...prev,
              mode: 'session',
              sessionId: sessionData.sessionId,
              isLoading: false
            }));
          } else {
            setState(prev => ({
              ...prev,
              isLoading: false
            }));
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setState(prev => ({
          ...prev,
          mode: 'account',
          user: session.user,
          session,
          sessionId: null
        }));
      } else if (event === 'SIGNED_OUT') {
        setState(prev => ({
          ...prev,
          mode: 'session',
          user: null,
          session: null,
          sessionId: null
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Start session mode
  const startSessionMode = useCallback(() => {
    const sessionId = generateSessionId();
    const sessionData: LocalSessionData = { sessionId };
    
    localStorage.setItem('local_session_data', JSON.stringify(sessionData));
    setState(prev => ({
      ...prev,
      mode: 'session',
      sessionId,
      user: null,
      session: null
    }));

    return sessionId;
  }, [generateSessionId]);

  // Upgrade session to account
  const upgradeToAccount = useCallback(async (email: string, password: string) => {
    if (state.mode !== 'session' || !state.sessionId) {
      throw new Error('No active session to upgrade');
    }

    setState(prev => ({ ...prev, isUpgrading: true }));

    try {
      // Get local session data
      const localData = localStorage.getItem('local_session_data');
      const sessionData: LocalSessionData = localData ? JSON.parse(localData) : {};

      // Create account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            upgraded_from_session: state.sessionId,
            session_data: sessionData
          }
        }
      });

      if (error) throw error;

      // Clear local session data after successful upgrade
      localStorage.removeItem('local_session_data');

      return data;
    } catch (error) {
      setState(prev => ({ ...prev, isUpgrading: false }));
      throw error;
    }
  }, [state.mode, state.sessionId]);

  // Sign in to existing account
  const signInToAccount = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('local_session_data');
    setState(prev => ({
      ...prev,
      mode: 'session',
      user: null,
      session: null,
      sessionId: null
    }));
  }, []);

  // End current session
  const endSession = useCallback(() => {
    if (state.mode === 'session') {
      localStorage.removeItem('local_session_data');
      setState(prev => ({
        ...prev,
        sessionId: null
      }));
    }
  }, [state.mode]);

  // Save data to appropriate storage
  const saveData = useCallback((key: string, data: any) => {
    if (state.mode === 'session') {
      // Save to localStorage for session mode
      const existingData = localStorage.getItem('local_session_data');
      const sessionData: LocalSessionData = existingData ? JSON.parse(existingData) : {};
      sessionData[key as keyof LocalSessionData] = data;
      localStorage.setItem('local_session_data', JSON.stringify(sessionData));
    } else {
      // Save to Supabase for account mode
      // This would be handled by other hooks/services
    }
  }, [state.mode]);

  // Get data from appropriate storage
  const getData = useCallback((key: string) => {
    if (state.mode === 'session') {
      const sessionData = localStorage.getItem('local_session_data');
      if (sessionData) {
        const data: LocalSessionData = JSON.parse(sessionData);
        return data[key as keyof LocalSessionData];
      }
    }
    return null;
  }, [state.mode]);

  return {
    ...state,
    startSessionMode,
    upgradeToAccount,
    signInToAccount,
    signOut,
    endSession,
    saveData,
    getData
  };
};