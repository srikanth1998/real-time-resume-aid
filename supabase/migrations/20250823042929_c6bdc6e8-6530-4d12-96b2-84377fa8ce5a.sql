-- Final comprehensive fix for email_otps security vulnerability
-- Create a uniquely named policy to ensure complete security

-- Drop any problematic existing policies that might allow broad access
DROP POLICY IF EXISTS "Service role can manage OTPs" ON public.email_otps;

-- Ensure RLS is properly enabled
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Create a restrictive policy with unique name for service role only
CREATE POLICY "secure_service_role_only_email_otps_access_2024"
ON public.email_otps
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure no other roles have access by revoking permissions
REVOKE ALL ON public.email_otps FROM public;
REVOKE ALL ON public.email_otps FROM authenticated; 
REVOKE ALL ON public.email_otps FROM anon;

-- Grant specific access only to service_role for OTP operations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_otps TO service_role;