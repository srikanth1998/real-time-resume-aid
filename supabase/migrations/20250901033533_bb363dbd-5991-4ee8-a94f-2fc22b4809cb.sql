-- Modify start_session function to support reusable session codes for testing
CREATE OR REPLACE FUNCTION public.start_session(session_uuid uuid, allow_reuse boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  
  -- Check if session is already started (only if reuse is not allowed)
  IF NOT allow_reuse AND session_record.started_at IS NOT NULL THEN
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
  
  -- Mark session as started (only set started_at if not allowing reuse or if it's null)
  UPDATE public.sessions 
  SET 
    started_at = CASE 
      WHEN allow_reuse THEN session_record.started_at 
      ELSE COALESCE(session_record.started_at, NOW()) 
    END,
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