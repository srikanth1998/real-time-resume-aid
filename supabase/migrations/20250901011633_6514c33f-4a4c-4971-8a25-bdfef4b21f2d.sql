-- Create 10 additional test session codes with number format
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
) VALUES 
('111111', 'assets_received', 'question-analysis', 'single', 60, 1499, 15, 0, 0, 0, 'Software Engineer', 'quiz', 'test11@example.com', NOW() + INTERVAL '10 years'),
('222222', 'assets_received', 'coding-helper', 'single', 90, 2999, 20, 0, 2, 0, 'Backend Developer', 'coding', 'test12@example.com', NOW() + INTERVAL '10 years'),
('333333', 'assets_received', 'quick-session', 'single', 30, 999, 10, 0, 0, 0, 'Frontend Developer', 'audio', 'test13@example.com', NOW() + INTERVAL '10 years'),
('444444', 'assets_received', 'question-analysis', 'single', 75, 1999, 18, 0, 0, 0, 'DevOps Engineer', 'quiz', 'test14@example.com', NOW() + INTERVAL '10 years'),
('555555', 'assets_received', 'coding-helper', 'single', 120, 3499, 25, 0, 3, 0, 'Data Scientist', 'coding', 'test15@example.com', NOW() + INTERVAL '10 years'),
('666666', 'assets_received', 'quick-session', 'single', 45, 1299, 12, 0, 0, 0, 'Product Manager', 'audio', 'test16@example.com', NOW() + INTERVAL '10 years'),
('777777', 'assets_received', 'question-analysis', 'single', 60, 1799, 16, 0, 0, 0, 'UI/UX Designer', 'quiz', 'test17@example.com', NOW() + INTERVAL '10 years'),
('888888', 'assets_received', 'coding-helper', 'single', 100, 2799, 22, 0, 2, 0, 'Machine Learning Engineer', 'coding', 'test18@example.com', NOW() + INTERVAL '10 years'),
('999999', 'assets_received', 'quick-session', 'single', 35, 1099, 8, 0, 0, 0, 'QA Engineer', 'audio', 'test19@example.com', NOW() + INTERVAL '10 years'),
('101010', 'assets_received', 'question-analysis', 'single', 80, 2199, 20, 0, 0, 0, 'System Architect', 'quiz', 'test20@example.com', NOW() + INTERVAL '10 years');