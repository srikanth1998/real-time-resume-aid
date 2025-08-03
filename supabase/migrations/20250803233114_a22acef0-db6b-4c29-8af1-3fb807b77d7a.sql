-- Add missing columns to sessions table for quota tracking
ALTER TABLE public.sessions 
ADD COLUMN questions_included INTEGER DEFAULT 0,
ADD COLUMN questions_used INTEGER DEFAULT 0,
ADD COLUMN coding_sessions_included INTEGER DEFAULT 0,
ADD COLUMN coding_sessions_used INTEGER DEFAULT 0;