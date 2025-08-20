CREATE OR REPLACE FUNCTION public.start_session(session_uuid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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
$function$