-- Update rate limiting to be more lenient for testing
-- Increase from 10 attempts per hour to 100 attempts per hour
CREATE OR REPLACE FUNCTION public.check_session_code_rate_limit(client_ip inet)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count attempts from this IP in the last hour
  SELECT COUNT(*) INTO attempt_count
  FROM public.session_code_attempts
  WHERE ip_address = client_ip
    AND created_at > (now() - interval '1 hour');
  
  -- Allow up to 100 attempts per hour per IP (increased for testing)
  RETURN attempt_count < 100;
END;
$function$