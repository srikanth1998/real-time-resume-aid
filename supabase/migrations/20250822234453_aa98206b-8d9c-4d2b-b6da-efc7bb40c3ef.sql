-- CRITICAL SECURITY FIX: Remove overly permissive public access policies from sessions table
-- These policies were allowing anyone to read, insert, update, and delete session data
-- which contains sensitive financial and user information

-- Drop the dangerous public access policies
DROP POLICY IF EXISTS "Allow public delete access to sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow public insert access to sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow public read access to sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow public update access to sessions" ON public.sessions;

-- Keep the secure user-specific policies:
-- "Users can create sessions" - allows users to create their own sessions
-- "Users can update their own sessions" - allows users to update their own sessions  
-- "Users can view their own sessions" - allows users to view their own sessions
-- "Allow session access with payment verification" - allows access with valid payment

-- Add a policy for service role to access sessions (needed for edge functions)
CREATE POLICY "Service role can manage sessions" ON public.sessions
FOR ALL USING (
  current_setting('role') = 'service_role'
);

-- Add a policy to allow anonymous users to create sessions (for checkout flow)
CREATE POLICY "Anonymous users can create sessions for checkout" ON public.sessions
FOR INSERT WITH CHECK (
  auth.role() = 'anon' AND 
  user_id IS NULL AND 
  status = 'pending_payment'
);

-- Add a policy to allow reading sessions by session_code (for session verification)
-- This is needed for the verify-session-code function
CREATE POLICY "Allow session lookup by session_code" ON public.sessions
FOR SELECT USING (
  session_code IS NOT NULL AND 
  (auth.uid() = user_id OR user_id IS NULL)
);