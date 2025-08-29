-- Completely remove anonymous SELECT access to sessions table
-- The previous fix still allowed full record access, we need to remove it entirely

-- Drop the policy that still allows anonymous access to full session records
DROP POLICY IF EXISTS "Anonymous session code verification only" ON public.sessions;

-- Anonymous users should have NO direct access to sessions table
-- All anonymous session lookups must go through the secure function get_session_by_code()

-- Keep all other existing policies for authenticated users and service role
-- "Authenticated users can lookup sessions by code" (exists)
-- "Users can view their own sessions" (exists) 
-- "Users can create sessions" (exists)
-- "Users can update their own sessions" (exists)
-- "Anonymous users can create sessions for checkout" (exists)
-- "Service role can manage sessions" (exists)

-- Update the secure function to handle session validation more robustly
CREATE OR REPLACE FUNCTION public.get_session_by_code(session_code_input TEXT)
RETURNS TABLE (
  id UUID,
  session_code TEXT,
  status session_status,
  expires_at TIMESTAMPTZ,
  session_type TEXT,
  device_mode TEXT,
  job_role TEXT
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
    s.device_mode,
    s.job_role
  FROM public.sessions s
  WHERE s.session_code = session_code_input
    AND s.user_id IS NULL
    AND s.status IN ('assets_received', 'in_progress', 'completed')
    AND s.expires_at > NOW()
  LIMIT 1;
$$;

-- Grant execute permission on the function to anonymous users
GRANT EXECUTE ON FUNCTION public.get_session_by_code(TEXT) TO anon;