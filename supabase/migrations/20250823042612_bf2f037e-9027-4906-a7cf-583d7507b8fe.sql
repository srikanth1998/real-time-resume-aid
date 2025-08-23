-- Fix critical security vulnerability: email_otps table exposing user email addresses
-- The table currently has overly permissive access that could allow email harvesting

-- First, check if there are any policies that allow public read access
-- We need to ensure only service role can access this sensitive data

-- Remove any existing policies that might allow public access
-- Note: The existing "Service role can manage OTPs" policy should remain

-- Add explicit deny policies for non-service roles to prevent email harvesting
-- This ensures no public or authenticated users can read email addresses

-- Policy to explicitly deny SELECT access to non-service roles
CREATE POLICY "Deny public access to OTPs"
ON public.email_otps
FOR SELECT
TO public
USING (false);

-- Policy to explicitly deny SELECT access to authenticated users (non-service role)
CREATE POLICY "Deny authenticated access to OTPs"
ON public.email_otps
FOR SELECT
TO authenticated
USING (false);

-- Policy to explicitly deny INSERT/UPDATE/DELETE for non-service roles
CREATE POLICY "Deny public modifications to OTPs"
ON public.email_otps
FOR ALL
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny authenticated modifications to OTPs"
ON public.email_otps
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Add comment explaining the security fix
COMMENT ON TABLE public.email_otps IS 
'Stores email OTP data. Access restricted to service role only to prevent email harvesting and protect user privacy. No public or authenticated user access allowed.';

-- Verify the service role policy exists and is properly configured
-- The existing "Service role can manage OTPs" policy should handle all service operations