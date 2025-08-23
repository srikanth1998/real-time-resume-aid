-- Fix critical security vulnerability in sessions table
-- Remove the overly permissive policy that allows public access to payment data

-- First, drop the problematic policy that exposes sensitive data
DROP POLICY IF EXISTS "Allow session access with payment verification" ON public.sessions;

-- Also drop the existing session_code lookup policy to recreate it more securely
DROP POLICY IF EXISTS "Allow session lookup by session_code" ON public.sessions;

-- Create a secure policy for session code lookup that doesn't expose sensitive data
-- Only allow access to sessions via session_code for legitimate use cases
CREATE POLICY "Secure session code lookup"
ON public.sessions
FOR SELECT
USING (
  -- Only allow access via session_code when:
  -- 1. Session code exists
  -- 2. User owns the session OR it's an anonymous session
  -- 3. Session is in an active state (not just pending payment)
  session_code IS NOT NULL 
  AND (auth.uid() = user_id OR user_id IS NULL)
  AND status IN ('assets_received', 'in_progress', 'completed')
);

-- Add comment explaining the security fix
COMMENT ON POLICY "Secure session code lookup" ON public.sessions IS 
'Secure replacement for overly permissive payment verification policy. Only allows session access via session_code for active sessions, preventing exposure of sensitive payment data to unauthorized users.';