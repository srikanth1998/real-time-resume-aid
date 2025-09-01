-- Clear existing rate limit attempts to reset the counter for testing
DELETE FROM public.session_code_attempts WHERE created_at > (now() - interval '1 hour')