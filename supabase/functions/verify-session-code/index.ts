
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { session_code } = await req.json()

    if (!session_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session code is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Look up the session by session_code
    const { data: session, error: sessionError } = await supabaseClient
      .from('sessions')
      .select('*, users(email)')
      .eq('session_code', session_code)
      .eq('status', 'active')
      .maybeSingle()

    if (sessionError || !session) {
      console.error('Session lookup error:', sessionError)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired session code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if session is still valid (not expired)
    const now = new Date()
    const expiresAt = new Date(session.expires_at)
    
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session has expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Calculate remaining duration in hours
    const remainingMs = expiresAt.getTime() - now.getTime()
    const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60))

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        duration_hours: Math.max(1, remainingHours), // At least 1 hour
        user_email: session.users?.email || 'session-user',
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
