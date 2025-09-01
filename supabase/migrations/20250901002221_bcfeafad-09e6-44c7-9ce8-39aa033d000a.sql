-- Create a test session with session code for testing
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
  '123456',
  'assets_received',
  'question-analysis',
  'single',
  60,
  2500,
  25,
  0,
  0,
  0,
  'Software Engineer',
  'quiz',
  'test@example.com',
  NOW() + INTERVAL '24 hours'
);