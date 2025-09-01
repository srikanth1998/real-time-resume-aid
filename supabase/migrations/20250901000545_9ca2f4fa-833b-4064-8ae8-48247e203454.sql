-- Update session 408430 to have correct limits for question-analysis plan
UPDATE sessions 
SET 
  questions_included = 25,
  coding_sessions_included = 0,
  updated_at = NOW()
WHERE session_code = '408430';