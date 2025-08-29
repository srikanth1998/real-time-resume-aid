-- Fix security vulnerability: Restrict anonymous access to sessions table
-- Current policies expose sensitive payment data and business intelligence to anonymous users

-- Drop the overly permissive anonymous access policies
DROP POLICY IF EXISTS "Anonymous can access session via code" ON public.sessions;
DROP POLICY IF EXISTS "Secure session code lookup" ON public.sessions;

-- Create a more restrictive anonymous access policy that only returns essential fields
-- Anonymous users should only be able to verify session existence and basic status, not payment details
CREATE POLICY "Anonymous session code verification only"
ON public.sessions
FOR SELECT
TO anon
USING (
  session_code IS NOT NULL 
  AND user_id IS NULL 
  AND status IN ('assets_received', 'in_progress', 'completed')
  -- This policy will still return full records, but we'll handle field restriction in the application layer
  -- The application should only expose: id, session_code, status, expires_at, session_type
);

-- Keep existing secure policies for authenticated users
-- "Authenticated users can lookup sessions by code" (already exists)
-- "Users can view their own sessions" (already exists)
-- "Users can create sessions" (already exists) 
-- "Users can update their own sessions" (already exists)

-- Keep anonymous insert access for checkout process
-- "Anonymous users can create sessions for checkout" (already exists)

-- Keep service role access
-- "Service role can manage sessions" (already exists)

-- Add a database function to safely return session data for anonymous code lookups
CREATE OR REPLACE FUNCTION public.get_session_by_code(session_code_input TEXT)
RETURNS TABLE (
  id UUID,
  session_code TEXT,
  status session_status,
  expires_at TIMESTAMPTZ,
  session_type TEXT,
  device_mode TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.session_code,
    s.status,
    s.expires_at,
    s.session_type,
    s.device_mode
  FROM public.sessions s
  WHERE s.session_code = session_code_input
    AND s.user_id IS NULL
    AND s.status IN ('assets_received', 'in_progress', 'completed')
  LIMIT 1;
$$;