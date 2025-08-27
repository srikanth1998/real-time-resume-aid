-- Create rate limiting table for session code verification
CREATE TABLE IF NOT EXISTS public.session_code_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  session_code TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_session_code_attempts_ip_time 
ON public.session_code_attempts(ip_address, created_at);

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_session_code_rate_limit(client_ip INET)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count attempts from this IP in the last hour
  SELECT COUNT(*) INTO attempt_count
  FROM public.session_code_attempts
  WHERE ip_address = client_ip
    AND created_at > (now() - interval '1 hour');
  
  -- Allow up to 10 attempts per hour per IP
  RETURN attempt_count < 10;
END;
$$ LANGUAGE plpgsql;

-- Create function to log session code attempts
CREATE OR REPLACE FUNCTION public.log_session_code_attempt(
  client_ip INET,
  code TEXT,
  was_successful BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.session_code_attempts (ip_address, session_code, success)
  VALUES (client_ip, code, was_successful);
END;
$$ LANGUAGE plpgsql;