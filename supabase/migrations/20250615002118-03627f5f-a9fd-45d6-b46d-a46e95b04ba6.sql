-- Create user profiles table for account mode
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Account preferences
  preferred_interview_duration INTEGER DEFAULT 60,
  notification_preferences JSONB DEFAULT '{}',
  ai_learning_enabled BOOLEAN DEFAULT true,
  
  PRIMARY KEY (id)
);

-- Create resumes table for multiple resume storage
CREATE TABLE public.resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  content TEXT, -- Parsed resume content
  file_url TEXT, -- Storage URL
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interview_sessions table (enhanced version of sessions)
CREATE TABLE public.interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT 'account', -- 'session' or 'account'
  
  -- Session metadata
  title TEXT,
  company_name TEXT,
  position_title TEXT,
  interview_type TEXT, -- 'phone', 'video', 'in-person'
  
  -- Resume used
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_description TEXT,
  
  -- Session status
  status TEXT NOT NULL DEFAULT 'created', -- 'created', 'active', 'completed', 'cancelled'
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  
  -- Performance tracking
  questions_count INTEGER DEFAULT 0,
  ai_suggestions_count INTEGER DEFAULT 0,
  user_satisfaction_rating INTEGER, -- 1-5 scale
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interview_transcripts table (enhanced)
CREATE TABLE public.interview_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  
  -- Content
  question_text TEXT NOT NULL,
  ai_suggestion TEXT NOT NULL,
  user_response TEXT, -- If captured
  
  -- Metadata
  timestamp_in_session INTEGER NOT NULL, -- Seconds from session start
  confidence_score FLOAT, -- AI confidence in suggestion
  user_feedback TEXT, -- 'helpful', 'not_helpful', 'partially_helpful'
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session_analytics table for performance tracking
CREATE TABLE public.session_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Performance metrics
  total_questions INTEGER NOT NULL DEFAULT 0,
  avg_response_time FLOAT, -- Average time to respond
  ai_usage_rate FLOAT, -- % of questions where AI was used
  
  -- Question categories
  behavioral_questions INTEGER DEFAULT 0,
  technical_questions INTEGER DEFAULT 0,
  company_questions INTEGER DEFAULT 0,
  
  -- AI effectiveness
  helpful_suggestions INTEGER DEFAULT 0,
  total_suggestions INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create RLS policies for resumes
CREATE POLICY "Users can manage their own resumes"
  ON public.resumes FOR ALL
  USING (auth.uid() = user_id);

-- Create RLS policies for interview_sessions
CREATE POLICY "Users can manage their own sessions"
  ON public.interview_sessions FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Create RLS policies for interview_transcripts
CREATE POLICY "Users can view transcripts for their sessions"
  ON public.interview_transcripts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.interview_sessions s 
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ));

CREATE POLICY "Users can insert transcripts for their sessions"
  ON public.interview_transcripts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.interview_sessions s 
    WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
  ));

-- Create RLS policies for session_analytics
CREATE POLICY "Users can view their own analytics"
  ON public.session_analytics FOR ALL
  USING (auth.uid() = user_id);

-- Create functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_sessions_updated_at
  BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();