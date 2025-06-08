
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
    const { sessionId, text, timestamp, source } = await req.json()
    console.log('Processing transcription:', { sessionId, text: text?.substring(0, 50) + '...', source })

    if (!sessionId || !text?.trim()) {
      throw new Error('Session ID and text are required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the session exists and is active or in_progress
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('Session verification failed:', sessionError)
      throw new Error('Session not found or invalid')
    }

    if (session.status !== 'active' && session.status !== 'in_progress') {
      throw new Error(`Session is not active or in progress (current status: ${session.status})`)
    }

    // Store the transcription for processing
    const { error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        session_id: sessionId,
        question_text: text,
        generated_answer: '', // Will be filled by answer generation
        timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
      })

    if (transcriptError) {
      console.error('Failed to store transcript:', transcriptError)
      throw transcriptError
    }

    // Trigger real-time update for cross-device sync
    const { error: realtimeError } = await supabase
      .channel('transcription-updates')
      .send({
        type: 'broadcast',
        event: 'new-transcription',
        payload: {
          sessionId,
          text,
          timestamp: timestamp || Date.now(),
          source
        }
      })

    if (realtimeError) {
      console.warn('Failed to send real-time update:', realtimeError)
      // Don't fail the whole operation for real-time issues
    }

    console.log('Transcription processed successfully for session:', sessionId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Transcription processed successfully',
        sessionId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Process transcription error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
