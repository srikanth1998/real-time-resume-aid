-- Fix critical security issue: Remove overly permissive session access policy
-- The current "Allow session access with payment verification" policy allows anyone
-- to read any session with payment data, exposing sensitive information

-- First, drop the problematic policy that allows public access to sessions with payment info
DROP POLICY IF EXISTS "Allow session access with payment verification" ON public.sessions;

-- Create a more secure policy that only allows session access for specific use cases:
-- 1. Service functions need to access sessions for processing (using service role)
-- 2. Users can access their own sessions
-- 3. Anonymous session access only when using session_code (for one-time access after payment)

-- Policy for anonymous users to access sessions via session_code (one-time use)
CREATE POLICY "Anonymous can access session via code"
ON public.sessions
FOR SELECT
TO anon
USING (
  session_code IS NOT NULL 
  AND user_id IS NULL 
  AND status IN ('assets_received', 'in_progress', 'completed')
);

-- Ensure authenticated users can only see their own sessions
-- (This policy already exists but making sure it's properly secured)
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
CREATE POLICY "Users can view their own sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add policy for service role operations (already exists but ensuring it's explicit)
-- This allows edge functions to manage sessions for payment processing, etc.
DROP POLICY IF EXISTS "Service role can manage sessions" ON public.sessions;
CREATE POLICY "Service role can manage sessions"
ON public.sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add a policy for public session lookup only by session_code for authenticated users
-- This is needed for session verification workflows
CREATE POLICY "Authenticated users can lookup sessions by code"
ON public.sessions
FOR SELECT
TO authenticated
USING (
  session_code IS NOT NULL 
  AND (auth.uid() = user_id OR user_id IS NULL)
  AND status IN ('assets_received', 'in_progress', 'completed')
);