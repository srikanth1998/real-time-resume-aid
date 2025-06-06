
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useInterviewSession = (sessionId: string | null) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = (expiresAt: Date) => {
    timerRef.current = setInterval(() => {
      const now = new Date();
      const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeRemaining(timeLeft);
      
      if (timeLeft <= 0) {
        handleSessionExpired();
      } else if (timeLeft === 300) {
        toast({
          title: "5 minutes remaining",
          description: "Your session will end in 5 minutes.",
          variant: "destructive"
        });
      } else if (timeLeft === 60) {
        toast({
          title: "1 minute remaining",
          description: "Your session will end in 1 minute.",
          variant: "destructive"
        });
      }
    }, 1000);
  };

  const handleSessionExpired = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    toast({
      title: "Session completed",
      description: "Your interview session has ended.",
    });

    navigate(`/complete?session_id=${sessionId}`);
  };

  useEffect(() => {
    const checkSession = async () => {
      console.log('🔍 Checking session with ID:', sessionId);
      
      if (!sessionId) {
        console.log('❌ No session ID provided');
        setSessionCheckFailed(true);
        setLoading(false);
        return;
      }

      try {
        // First, try to get the session data regardless of auth status
        console.log('📊 Fetching session data...');
        const { data: sessionData, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        console.log('📊 Session data:', sessionData);
        console.log('📊 Session error:', error);

        if (error || !sessionData) {
          console.log('❌ Session not found or error:', error);
          setSessionCheckFailed(true);
          setLoading(false);
          return;
        }

        // Check if this session requires authentication (has a user_id)
        if (sessionData.user_id) {
          console.log('🔐 Session requires authentication, checking auth status...');
          const { data: { session: authSession } } = await supabase.auth.getSession();
          console.log('🔐 Auth session:', authSession?.user?.id ? 'Found' : 'Not found');
          
          if (!authSession) {
            console.log('❌ No auth session for authenticated session, redirecting to auth');
            navigate('/auth');
            return;
          }

          // Verify the authenticated user owns this session
          if (authSession.user.id !== sessionData.user_id) {
            console.log('❌ User does not own this session');
            setSessionCheckFailed(true);
            setLoading(false);
            return;
          }
        } else {
          console.log('✅ Session does not require authentication (single device mode)');
        }

        if (sessionData.status !== 'in_progress' && sessionData.status !== 'assets_received') {
          console.log('❌ Session not in valid status, status:', sessionData.status);
          navigate('/');
          return;
        }

        if (sessionData.status === 'assets_received') {
          console.log('🔄 Session has assets_received status, updating to in_progress...');
          
          const now = new Date();
          const expiresAt = new Date(now.getTime() + sessionData.duration_minutes * 60 * 1000);
          
          const { data: updatedSession, error: updateError } = await supabase
            .from('sessions')
            .update({
              status: 'in_progress',
              started_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              updated_at: now.toISOString()
            })
            .eq('id', sessionId)
            .select()
            .single();

          if (updateError) {
            console.error('❌ Error updating session status:', updateError);
            setSessionCheckFailed(true);
            setLoading(false);
            return;
          }

          console.log('✅ Session updated to in_progress:', updatedSession);
          setSession(updatedSession);
          
          const timeLeft = Math.max(0, Math.floor((new Date(updatedSession.expires_at).getTime() - now.getTime()) / 1000));
          setTimeRemaining(timeLeft);
          
          startTimer(new Date(updatedSession.expires_at));
        } else {
          const now = new Date();
          const expiresAt = new Date(sessionData.expires_at);
          
          if (now >= expiresAt) {
            console.log('❌ Session expired');
            await handleSessionExpired();
            return;
          }

          console.log('✅ Session valid and in progress, setting up...');
          setSession(sessionData);
          
          const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
          setTimeRemaining(timeLeft);
          
          startTimer(expiresAt);
        }
        
        setLoading(false);
        
      } catch (error) {
        console.error('❌ Error checking session:', error);
        setSessionCheckFailed(true);
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionId, navigate]);

  return {
    session,
    loading,
    sessionCheckFailed,
    timeRemaining,
    handleSessionExpired
  };
};
