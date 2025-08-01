-- Update existing sessions to have correct session_type based on plan_type
UPDATE sessions 
SET session_type = CASE 
  WHEN plan_type = 'coding-helper' THEN 'coding'
  WHEN plan_type = 'question-analysis' THEN 'quiz'
  ELSE session_type
END
WHERE plan_type IN ('coding-helper', 'question-analysis');

-- Add a trigger to automatically set correct session_type when inserting new sessions
CREATE OR REPLACE FUNCTION public.set_session_type_from_plan()
RETURNS TRIGGER AS $$
BEGIN
  NEW.session_type = CASE 
    WHEN NEW.plan_type = 'coding-helper' THEN 'coding'
    WHEN NEW.plan_type = 'question-analysis' THEN 'quiz'
    ELSE NEW.session_type
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new sessions
CREATE TRIGGER set_session_type_trigger
  BEFORE INSERT ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_session_type_from_plan();