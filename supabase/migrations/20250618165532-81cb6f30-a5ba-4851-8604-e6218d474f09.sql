
-- Add missing columns to sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_code TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS job_role TEXT;
