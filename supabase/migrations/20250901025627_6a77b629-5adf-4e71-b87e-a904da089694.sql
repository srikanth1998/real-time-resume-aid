-- Add more session codes for testing with valid device modes
INSERT INTO public.sessions (
  session_code,
  status,
  duration_minutes,
  price_cents,
  plan_type,
  questions_included,
  coding_sessions_included,
  device_mode,
  job_role,
  session_type,
  expires_at
) VALUES 
  ('123456', 'assets_received', 60, 2999, 'quick-session', 20, 0, 'single', 'Software Engineer', 'audio', '2030-12-31 23:59:59+00'),
  ('654321', 'assets_received', 90, 4999, 'coding-helper', 15, 3, 'single', 'Full Stack Developer', 'coding', '2030-12-31 23:59:59+00'),
  ('789012', 'assets_received', 45, 1999, 'question-analysis', 25, 0, 'single', 'Product Manager', 'quiz', '2030-12-31 23:59:59+00'),
  ('210987', 'assets_received', 60, 2999, 'quick-session', 20, 0, 'single', 'Data Scientist', 'audio', '2030-12-31 23:59:59+00'),
  ('345678', 'assets_received', 120, 7999, 'coding-helper', 30, 5, 'single', 'DevOps Engineer', 'coding', '2030-12-31 23:59:59+00'),
  ('876543', 'assets_received', 30, 999, 'question-analysis', 10, 0, 'single', 'UI/UX Designer', 'quiz', '2030-12-31 23:59:59+00'),
  ('456789', 'assets_received', 75, 3999, 'quick-session', 25, 1, 'single', 'Backend Developer', 'audio', '2030-12-31 23:59:59+00'),
  ('987654', 'assets_received', 60, 2999, 'coding-helper', 20, 2, 'single', 'Frontend Developer', 'coding', '2030-12-31 23:59:59+00'),
  ('112233', 'assets_received', 90, 4999, 'question-analysis', 35, 0, 'single', 'Technical Lead', 'quiz', '2030-12-31 23:59:59+00'),
  ('998877', 'assets_received', 45, 1999, 'quick-session', 15, 0, 'single', 'QA Engineer', 'audio', '2030-12-31 23:59:59+00');