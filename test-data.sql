
-- Test data for both authentication types
-- Run this separately after fixing the enum issue

-- First, let's see what enum values are valid for plan_type
-- You may need to check your database schema for the correct enum values

-- For now, using generic values that should work
INSERT INTO sessions (
  id, 
  user_id, 
  plan_type, 
  status, 
  duration_minutes, 
  price_cents, 
  session_code, 
  started_at, 
  expires_at, 
  device_mode, 
  job_role,
  created_at, 
  updated_at
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440001',
  'standard', -- Using 'standard' instead of 'premium'
  'active',
  60,
  2999,
  '123456',
  now(),
  now() + interval '1 hour',
  'single',
  'Software Engineer',
  now(),
  now()
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440001',
  'basic',
  'active',
  30,
  1999,
  '789012',
  now(),
  now() + interval '30 minutes',
  'single',
  'Product Manager',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
