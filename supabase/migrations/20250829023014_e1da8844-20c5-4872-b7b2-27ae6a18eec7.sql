-- Completely remove anonymous SELECT access to sessions table
-- First drop and recreate the function with updated return type

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_session_by_code(TEXT);

-- Drop the policy that still allows anonymous access to full session records  
DROP POLICY IF EXISTS "Anonymous session code verification only" ON public.sessions;

-- Create the secure function with proper return type
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

-- Anonymous users now have NO direct SELECT access to sessions table
-- They can only access session data through the secure function
-- This prevents exposure of sensitive payment data and business intelligence