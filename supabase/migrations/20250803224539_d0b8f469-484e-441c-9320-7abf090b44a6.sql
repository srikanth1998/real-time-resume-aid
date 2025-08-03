-- First, update existing sessions to map to the new 3-plan structure
UPDATE sessions 
SET plan_type = CASE 
  WHEN plan_type IN ('coding-helper', 'live-coding') THEN 'coding-helper'
  WHEN plan_type IN ('question-analysis', 'live-quiz') THEN 'question-analysis'
  WHEN plan_type IN ('standard', 'pro', 'elite', 'pay-as-you-go') THEN 'quick-session'
  ELSE 'coding-helper' -- default fallback
END;

-- Drop the old enum and recreate with only 3 plans
DROP TYPE IF EXISTS plan_type CASCADE;
CREATE TYPE plan_type AS ENUM (
  'coding-helper',
  'quick-session', 
  'question-analysis'
);

-- Re-add the plan_type column with the new enum
ALTER TABLE sessions 
ADD COLUMN new_plan_type plan_type;

-- Migrate data to new column
UPDATE sessions 
SET new_plan_type = CASE 
  WHEN plan_type::text = 'coding-helper' THEN 'coding-helper'::plan_type
  WHEN plan_type::text = 'question-analysis' THEN 'question-analysis'::plan_type
  ELSE 'quick-session'::plan_type
END;

-- Drop old column and rename new one
ALTER TABLE sessions DROP COLUMN plan_type;
ALTER TABLE sessions RENAME COLUMN new_plan_type TO plan_type;
ALTER TABLE sessions ALTER COLUMN plan_type SET NOT NULL;

-- Update the trigger function to handle the new plan types
CREATE OR REPLACE FUNCTION public.set_session_type_from_plan()
RETURNS TRIGGER AS $$
BEGIN
  NEW.session_type = CASE 
    WHEN NEW.plan_type = 'coding-helper' THEN 'coding'
    WHEN NEW.plan_type = 'question-analysis' THEN 'quiz'
    WHEN NEW.plan_type = 'quick-session' THEN 'audio'
    ELSE NEW.session_type
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;