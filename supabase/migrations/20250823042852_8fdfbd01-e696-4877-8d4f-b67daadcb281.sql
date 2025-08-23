-- Complete fix for email_otps table public access vulnerability
-- The table is still showing as publicly readable, need to ensure proper lockdown

-- First, drop ALL existing policies on email_otps to start fresh
DROP POLICY IF EXISTS "Service role can manage OTPs" ON public.email_otps;
DROP POLICY IF EXISTS "Deny public access to OTPs" ON public.email_otps;
DROP POLICY IF EXISTS "Deny authenticated access to OTPs" ON public.email_otps;
DROP POLICY IF EXISTS "Deny public modifications to OTPs" ON public.email_otps;
DROP POLICY IF EXISTS "Deny authenticated modifications to OTPs" ON public.email_otps;

-- Ensure RLS is enabled
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Create a single, secure policy that ONLY allows service_role access
-- This completely blocks all other access including public, anon, and authenticated users
CREATE POLICY "service_role_only_access"
ON public.email_otps
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Explicitly revoke all permissions from public and authenticated roles
REVOKE ALL ON public.email_otps FROM public;
REVOKE ALL ON public.email_otps FROM authenticated;
REVOKE ALL ON public.email_otps FROM anon;

-- Grant permissions only to service_role
GRANT ALL ON public.email_otps TO service_role;

-- Add table comment explaining security model
COMMENT ON TABLE public.email_otps IS 
'Email OTP storage - SECURITY CRITICAL: Contains user emails and OTP hashes. 
Access restricted to service_role ONLY. No public, anon, or authenticated user access permitted. 
All OTP operations must go through edge functions using service_role credentials.';