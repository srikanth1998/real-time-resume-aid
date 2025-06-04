
-- Create answer_cache table for predictive caching
CREATE TABLE IF NOT EXISTS answer_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  question_hash text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_answer_cache_session_hash ON answer_cache(session_id, question_hash);
CREATE INDEX IF NOT EXISTS idx_answer_cache_created_at ON answer_cache(created_at);

-- Add RLS policies
ALTER TABLE answer_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cached answers" ON answer_cache
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cached answers for their sessions" ON answer_cache
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own cached answers" ON answer_cache
  FOR UPDATE USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_answer_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_answer_cache_updated_at_trigger
  BEFORE UPDATE ON answer_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_answer_cache_updated_at();
