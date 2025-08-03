-- Step 1: Create the new enum with only 3 plans
CREATE TYPE plan_type_new AS ENUM (
  'coding-helper',
  'quick-session', 
  'question-analysis'
);

-- Step 2: Add new column with the new enum type
ALTER TABLE sessions 
ADD COLUMN plan_type_new plan_type_new;

-- Step 3: Migrate existing data to new plan structure
UPDATE sessions 
SET plan_type_new = CASE 
  WHEN plan_type::text IN ('coding-helper', 'live-coding') THEN 'coding-helper'::plan_type_new
  WHEN plan_type::text IN ('question-analysis', 'live-quiz') THEN 'question-analysis'::plan_type_new
  WHEN plan_type::text IN ('standard', 'pro', 'elite', 'pay-as-you-go') THEN 'quick-session'::plan_type_new
  ELSE 'coding-helper'::plan_type_new -- default fallback
END;

-- Step 4: Drop old column and rename new one
ALTER TABLE sessions DROP COLUMN plan_type;
ALTER TABLE sessions RENAME COLUMN plan_type_new TO plan_type;
ALTER TABLE sessions ALTER COLUMN plan_type SET NOT NULL;

-- Step 5: Drop old enum and rename new one
DROP TYPE IF EXISTS plan_type CASCADE;
ALTER TYPE plan_type_new RENAME TO plan_type;

-- Step 6: Update the trigger function for the new plan types
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