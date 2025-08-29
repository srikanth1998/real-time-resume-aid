-- Fix security vulnerability: Remove overly permissive transcript access policies
-- The current policies with "true" expressions allow unrestricted access to proprietary content

-- Drop the insecure policies that allow unrestricted access
DROP POLICY IF EXISTS "Allow reading transcripts for any session" ON public.transcripts;
DROP POLICY IF EXISTS "Allow system to insert transcripts" ON public.transcripts;

-- Keep the secure policies that properly check session ownership:
-- "Users can insert transcripts to their sessions" (already exists)
-- "Users can view transcripts from their sessions" (already exists)

-- Add service role access for system operations (edge functions need this)
CREATE POLICY "Service role can manage all transcripts"
ON public.transcripts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add authenticated role access for system inserts (for edge functions using service role key)
CREATE POLICY "System can insert transcripts for valid sessions"
ON public.transcripts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE sessions.id = transcripts.session_id
  )
);