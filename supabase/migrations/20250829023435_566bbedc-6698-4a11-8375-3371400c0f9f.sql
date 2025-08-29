-- Phase 1 Critical Security Fixes

-- 1. RESTRICT SESSION CONNECTIONS ACCESS
-- Remove anonymous access policies from session_connections table
DROP POLICY IF EXISTS "Allow users to view device connections" ON public.session_connections;
DROP POLICY IF EXISTS "Allow users to register device connections" ON public.session_connections;  
DROP POLICY IF EXISTS "Allow users to update device connections" ON public.session_connections;
DROP POLICY IF EXISTS "Allow users to delete old device connections" ON public.session_connections;

-- Create secure RLS policies that require proper session ownership
CREATE POLICY "Users can view connections for their sessions only"
ON public.session_connections
FOR SELECT
USING (
  session_id IN (
    SELECT s.id 
    FROM public.sessions s 
    WHERE s.user_id = auth.uid() 
    OR (s.user_id IS NULL AND s.session_code IS NOT NULL)
  )
);

CREATE POLICY "Users can insert connections for their sessions only" 
ON public.session_connections
FOR INSERT
WITH CHECK (
  session_id IN (
    SELECT s.id 
    FROM public.sessions s 
    WHERE s.user_id = auth.uid()
    OR (s.user_id IS NULL AND s.session_code IS NOT NULL)
  )
);

CREATE POLICY "Users can update connections for their sessions only"
ON public.session_connections  
FOR UPDATE
USING (
  session_id IN (
    SELECT s.id 
    FROM public.sessions s 
    WHERE s.user_id = auth.uid()
    OR (s.user_id IS NULL AND s.session_code IS NOT NULL)
  )
);

CREATE POLICY "Users can delete connections for their sessions only"
ON public.session_connections
FOR DELETE  
USING (
  session_id IN (
    SELECT s.id 
    FROM public.sessions s 
    WHERE s.user_id = auth.uid()
    OR (s.user_id IS NULL AND s.session_code IS NOT NULL)
  )
);

-- 2. SECURE DATABASE FUNCTIONS
-- Add SET search_path = public to functions missing this protection

CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.email_otps 
  WHERE expires_at < NOW() OR used = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_stale_connections()
RETURNS void  
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.session_connections 
  WHERE last_ping < (now() - interval '2 minutes');
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.set_session_type_from_plan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.session_type = CASE 
    WHEN NEW.plan_type = 'coding-helper' THEN 'coding'
    WHEN NEW.plan_type = 'question-analysis' THEN 'quiz'
    WHEN NEW.plan_type = 'quick-session' THEN 'audio'
    ELSE NEW.session_type
  END;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_session_code_rate_limit(client_ip inet)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count attempts from this IP in the last hour
  SELECT COUNT(*) INTO attempt_count
  FROM public.session_code_attempts
  WHERE ip_address = client_ip
    AND created_at > (now() - interval '1 hour');
  
  -- Allow up to 10 attempts per hour per IP
  RETURN attempt_count < 10;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_session_code_attempt(client_ip inet, code text, was_successful boolean)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.session_code_attempts (ip_address, session_code, success)
  VALUES (client_ip, code, was_successful);
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_session(session_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  session_record sessions%ROWTYPE;
  result jsonb;
BEGIN
  -- Get current session details with row lock
  SELECT * INTO session_record 
  FROM public.sessions 
  WHERE id = session_uuid 
  FOR UPDATE;
  
  -- Check if session exists
  IF NOT found THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Session not found'
    );
  END IF;
  
  -- Check if session is already started
  IF session_record.started_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Session code has already been used and cannot be reused'
    );
  END IF;
  
  -- Check if session is expired
  IF session_record.expires_at IS NOT NULL AND session_record.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Session has expired'
    );
  END IF;
  
  -- Mark session as started (use 'in_progress' instead of 'active')
  UPDATE public.sessions 
  SET 
    started_at = NOW(),
    status = 'in_progress'::session_status,
    updated_at = NOW()
  WHERE id = session_uuid;
  
  -- Return success with session details
  SELECT row_to_json(s.*) INTO result
  FROM public.sessions s 
  WHERE s.id = session_uuid;
  
  RETURN jsonb_build_object(
    'success', true,
    'session', result
  );
END;
$function$;