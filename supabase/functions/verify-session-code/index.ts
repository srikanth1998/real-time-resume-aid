
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[VERIFY] Starting session code verification')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get client IP for rate limiting - handle comma-separated IPs
    const rawClientIP = req.headers.get('x-forwarded-for') || 
                       req.headers.get('x-real-ip') || 
                       '127.0.0.1';
    
    // Extract first IP from comma-separated list
    const clientIP = rawClientIP.split(',')[0].trim();
    
    console.log('[VERIFY] Client IP:', clientIP);

    // Check rate limit before processing
    const { data: rateLimitCheck, error: rateLimitError } = await supabaseClient
      .rpc('check_session_code_rate_limit', { client_ip: clientIP });
    
    if (rateLimitError) {
      console.error('[VERIFY] Rate limit check error:', rateLimitError);
    } else if (!rateLimitCheck) {
      console.log('[VERIFY] ❌ Rate limit exceeded for IP:', clientIP);
      
      // Log the failed attempt
      await supabaseClient.rpc('log_session_code_attempt', {
        client_ip: clientIP,
        code: null,
        was_successful: false
      });
      
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Too many attempts. Please try again later.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { session_code } = await req.json()
    console.log('[VERIFY] Received session code:', session_code?.substring(0, 5) + '...')

    if (!session_code) {
      console.log('[VERIFY] ❌ No session code provided')
      
      // Log the failed attempt
      await supabaseClient.rpc('log_session_code_attempt', {
        client_ip: clientIP,
        code: null,
        was_successful: false
      });
      
      return new Response(
        JSON.stringify({ success: false, error: 'Session code is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // First, look up the session by session_code to get the session ID
    const { data: sessionLookup, error: lookupError } = await supabaseClient
      .from('sessions')
      .select('id, expires_at, started_at')
      .eq('session_code', session_code)
      .in('status', ['assets_received', 'in_progress'])
      .is('started_at', null)
      .single()

    if (lookupError || !sessionLookup) {
      console.error('Session lookup error:', lookupError)
      
      // Log the failed attempt
      await supabaseClient.rpc('log_session_code_attempt', {
        client_ip: clientIP,
        code: session_code,
        was_successful: false
      });
      
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired session code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Now use the start_session function to mark the session as started and prevent reuse
    const { data: startResult, error: startError } = await supabaseClient
      .rpc('start_session', { session_uuid: sessionLookup.id })

    if (startError) {
      console.error('Start session error:', startError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to start session' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Check the result from start_session function
    if (!startResult.success) {
      console.error('Session start failed:', startResult.error)
      return new Response(
        JSON.stringify({ success: false, error: startResult.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const session = startResult.session

    // Log successful session code verification
    await supabaseClient.rpc('log_session_code_attempt', {
      client_ip: clientIP,
      code: session_code,
      was_successful: true
    });

    console.log('[VERIFY] ✅ Session started successfully:', session.id);

    // Calculate remaining duration in hours
    const now = new Date()
    let remainingHours = 24 // Default to 24 hours if no expiry set
    
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at)
      
      // Calculate remaining duration in hours
      const remainingMs = expiresAt.getTime() - now.getTime()
      remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60))
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        duration_hours: Math.max(1, remainingHours), // At least 1 hour
        user_email: 'session-user',
        plan_type: session.plan_type,
        session_type: session.session_type,
        job_role: session.job_role,
        // Usage tracking fields
        questions_included: session.questions_included || 0,
        questions_used: session.questions_used || 0,
        coding_sessions_included: session.coding_sessions_included || 0,
        coding_sessions_used: session.coding_sessions_used || 0,
        // Calculated remaining values
        questions_remaining: Math.max(0, (session.questions_included || 0) - (session.questions_used || 0)),
        coding_sessions_remaining: Math.max(0, (session.coding_sessions_included || 0) - (session.coding_sessions_used || 0))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in verify-session-code:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
