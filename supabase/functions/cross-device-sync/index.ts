
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId, action, data, deviceType } = await req.json()
    console.log('Cross-device sync request:', { sessionId, action, deviceType })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the auth header and extract the JWT token
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get user from JWT token
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Use service role key for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the session exists and belongs to the user
    const { data: session, error: sessionError } = await supabaseService
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      throw new Error('Session not found or access denied')
    }

    // Verify session has cross-device mode enabled
    if (session.device_mode !== 'cross') {
      throw new Error('Session is not enabled for cross-device access')
    }

    switch (action) {
      case 'register_device':
        // Register a device connection for this session
        const connectionId = `${user.id}_${deviceType}_${Date.now()}`
        
        const { error: connectionError } = await supabaseService
          .from('session_connections')
          .insert({
            session_id: sessionId,
            connection_id: connectionId,
            device_type: deviceType,
            last_ping: new Date().toISOString()
          })

        if (connectionError) {
          throw connectionError
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            connectionId,
            message: 'Device registered successfully' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )

      case 'ping':
        // Update last ping for device connection
        const { error: pingError } = await supabaseService
          .from('session_connections')
          .update({ last_ping: new Date().toISOString() })
          .eq('session_id', sessionId)
          .eq('connection_id', data.connectionId)

        if (pingError) {
          throw pingError
        }

        // Clean up stale connections (older than 2 minutes)
        await supabaseService.rpc('cleanup_stale_connections')

        return new Response(
          JSON.stringify({ success: true, message: 'Ping updated' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )

      case 'get_active_devices':
        // Get all active device connections for this session
        const { data: connections, error: connectionsError } = await supabaseService
          .from('session_connections')
          .select('*')
          .eq('session_id', sessionId)
          .gte('last_ping', new Date(Date.now() - 2 * 60 * 1000).toISOString()) // Active in last 2 minutes

        if (connectionsError) {
          throw connectionsError
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            connections: connections || [],
            count: connections?.length || 0
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Cross-device sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
