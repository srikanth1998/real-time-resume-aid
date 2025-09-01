-- Create a test session for coding plan and update the previous one to not expire
INSERT INTO public.sessions (
  session_code,
  status,
  plan_type,
  device_mode,
  duration_minutes,
  price_cents,
  questions_included,
  questions_used,
  coding_sessions_included,
  coding_sessions_used,
  job_role,
  session_type,
  user_email,
  expires_at
) VALUES (
  '654321',
  'assets_received',
  'coding-helper',
  'single',
  120,
  20487,
  25,
  0,
  3,
  0,
  'Full Stack Developer',
  'coding',
  'test-coding@example.com',
  NOW() + INTERVAL '10 years'
);

-- Update the previous session to not expire for 10 years
UPDATE public.sessions 
SET expires_at = NOW() + INTERVAL '10 years'
WHERE session_code = '123456';