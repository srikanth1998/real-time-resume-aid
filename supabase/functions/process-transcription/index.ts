
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

    // Generate AI answer first
    console.log('Generating AI answer for question:', text)
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('generate-interview-answer', {
      body: {
        sessionId: sessionId,
        question: text,
        streaming: false
      }
    })

    if (aiError) {
      console.error('Failed to generate AI answer:', aiError)
    }

    const generatedAnswer = aiResponse?.answer || 'Sorry, I could not generate an answer at this time.'
    console.log('Generated answer:', generatedAnswer.substring(0, 100) + '...')

    // Store the transcription with the generated answer
    const { error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        session_id: sessionId,
        question_text: text,
        generated_answer: generatedAnswer,
        timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
      })

    if (transcriptError) {
      console.error('Failed to store transcript:', transcriptError)
      throw transcriptError
    }

    console.log('Transcription and answer stored successfully for session:', sessionId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Transcription processed and answer generated successfully',
        sessionId,
        answer: generatedAnswer
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
