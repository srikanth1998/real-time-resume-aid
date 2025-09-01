-- Create 10 additional test session codes
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
('TEST001', 'assets_received', 'question-analysis', 'single', 60, 1499, 15, 0, 0, 0, 'Software Engineer', 'quiz', 'test1@example.com', NOW() + INTERVAL '10 years'),
('TEST002', 'assets_received', 'coding-helper', 'single', 90, 2999, 20, 0, 2, 0, 'Backend Developer', 'coding', 'test2@example.com', NOW() + INTERVAL '10 years'),
('TEST003', 'assets_received', 'quick-session', 'single', 30, 999, 10, 0, 0, 0, 'Frontend Developer', 'audio', 'test3@example.com', NOW() + INTERVAL '10 years'),
('TEST004', 'assets_received', 'question-analysis', 'single', 75, 1999, 18, 0, 0, 0, 'DevOps Engineer', 'quiz', 'test4@example.com', NOW() + INTERVAL '10 years'),
('TEST005', 'assets_received', 'coding-helper', 'single', 120, 3499, 25, 0, 3, 0, 'Data Scientist', 'coding', 'test5@example.com', NOW() + INTERVAL '10 years'),
('TEST006', 'assets_received', 'quick-session', 'single', 45, 1299, 12, 0, 0, 0, 'Product Manager', 'audio', 'test6@example.com', NOW() + INTERVAL '10 years'),
('TEST007', 'assets_received', 'question-analysis', 'single', 60, 1799, 16, 0, 0, 0, 'UI/UX Designer', 'quiz', 'test7@example.com', NOW() + INTERVAL '10 years'),
('TEST008', 'assets_received', 'coding-helper', 'single', 100, 2799, 22, 0, 2, 0, 'Machine Learning Engineer', 'coding', 'test8@example.com', NOW() + INTERVAL '10 years'),
('TEST009', 'assets_received', 'quick-session', 'single', 35, 1099, 8, 0, 0, 0, 'QA Engineer', 'audio', 'test9@example.com', NOW() + INTERVAL '10 years'),
('TEST010', 'assets_received', 'question-analysis', 'single', 80, 2199, 20, 0, 0, 0, 'System Architect', 'quiz', 'test10@example.com', NOW() + INTERVAL '10 years');