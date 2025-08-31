-- Add user_email column to sessions table for webhook processing
ALTER TABLE public.sessions 
ADD COLUMN user_email TEXT;

-- Create index for better performance when looking up by email
CREATE INDEX idx_sessions_user_email ON public.sessions(user_email);