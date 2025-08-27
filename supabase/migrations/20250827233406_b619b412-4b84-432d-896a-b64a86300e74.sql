-- Enable RLS on session_code_attempts table
ALTER TABLE public.session_code_attempts ENABLE ROW LEVEL SECURITY;

-- Create restrictive RLS policies for session_code_attempts
-- Only service role should access this table for rate limiting
CREATE POLICY "Service role only access for rate limiting"
ON public.session_code_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);