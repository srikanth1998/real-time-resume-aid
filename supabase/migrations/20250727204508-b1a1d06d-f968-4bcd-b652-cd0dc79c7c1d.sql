-- Add new values to the plan_type enum
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'question-analysis';
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'coding-helper';