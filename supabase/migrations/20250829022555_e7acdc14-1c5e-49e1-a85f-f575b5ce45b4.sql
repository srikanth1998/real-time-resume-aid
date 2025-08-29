-- Fix security vulnerability: Remove overly permissive document access policies
-- The current policies with "true" expressions allow unrestricted access

-- Drop the insecure policies that allow unrestricted access
DROP POLICY IF EXISTS "Allow deleting documents" ON public.documents;
DROP POLICY IF EXISTS "Allow document uploads for sessions" ON public.documents;
DROP POLICY IF EXISTS "Allow reading documents" ON public.documents;
DROP POLICY IF EXISTS "Allow updating documents" ON public.documents;

-- Keep the secure policies that properly check session ownership:
-- "Users can insert documents to their sessions" (already exists)
-- "Users can view documents from their sessions" (already exists)

-- Add missing secure policies for UPDATE and DELETE operations
CREATE POLICY "Users can update documents from their sessions"
ON public.documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE sessions.id = documents.session_id 
    AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
  )
);

CREATE POLICY "Users can delete documents from their sessions"
ON public.documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE sessions.id = documents.session_id 
    AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
  )
);

-- Add service role access for system operations
CREATE POLICY "Service role can manage all documents"
ON public.documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);