-- Remove duplicate session codes, keeping only the most recent ones
WITH ranked_sessions AS (
  SELECT id, session_code, 
         ROW_NUMBER() OVER (PARTITION BY session_code ORDER BY created_at DESC) as rn
  FROM public.sessions 
  WHERE session_code IN ('101010', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999')
)
DELETE FROM public.sessions 
WHERE id IN (
  SELECT id FROM ranked_sessions WHERE rn > 1
);