
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
    const { 
      sessionId, 
      resumeFile, 
      resumeFilename, 
      jobDescription, 
      jobRole,
      sessionCode 
    } = await req.json()

    console.log('Processing session assets for session:', sessionId)
    console.log('Job role:', jobRole)
    console.log('Session code:', sessionCode)

    if (!sessionId || !resumeFile || !jobDescription || !jobRole || !sessionCode) {
      throw new Error('Missing required fields')
    }

    // Initialize Supabase client with service role key
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify session exists - allow both pending_payment and pending_assets status
    const { data: session, error: sessionError } = await supabaseService
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('Session not found:', sessionError)
      throw new Error('Session not found')
    }

    console.log('Session status:', session.status)

    // Allow processing for pending_payment, pending_assets, and assets_received status
    if (session.status !== 'pending_assets' && session.status !== 'pending_payment' && session.status !== 'assets_received') {
      console.error('Session not in valid status for asset processing:', session.status)
      throw new Error('Session not ready for assets')
    }

    // Store the resume file (convert base64 to file)
    const resumeBuffer = Uint8Array.from(atob(resumeFile), c => c.charCodeAt(0))
    
    // Store documents in the documents table
    const { data: document, error: docError } = await supabaseService
      .from('documents')
      .insert({
        session_id: sessionId,
        type: 'resume',
        filename: resumeFilename,
        mime_type: resumeFilename.endsWith('.pdf') ? 'application/pdf' : 'application/msword',
        storage_path: `sessions/${sessionId}/resume/${resumeFilename}`,
        file_size: resumeBuffer.length,
        parsed_content: `Resume for ${jobRole} position` // Placeholder - in real app would parse the file
      })
      .select()
      .single()

    if (docError) {
      console.error('Error storing resume document:', docError)
      throw new Error('Failed to store resume')
    }

    // Store job description as document
    const { data: jdDocument, error: jdError } = await supabaseService
      .from('documents')
      .insert({
        session_id: sessionId,
        type: 'job_description',
        filename: 'job_description.txt',
        mime_type: 'text/plain',
        storage_path: `sessions/${sessionId}/job_description.txt`,
        file_size: jobDescription.length,
        parsed_content: jobDescription
      })
      .select()
      .single()

    if (jdError) {
      console.error('Error storing job description:', jdError)
      throw new Error('Failed to store job description')
    }

    // Update session with assets received status, session code, and 24-hour expiry
    const now = new Date()
    const expires24h = new Date(now.getTime() + (24 * 60 * 60 * 1000)) // 24 hours from now
    
    const { data: updatedSession, error: updateError } = await supabaseService
      .from('sessions')
      .update({
        status: 'assets_received',
        session_code: sessionCode,
        job_role: jobRole,
        expires_at: expires24h.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating session:', updateError)
      throw new Error('Failed to update session status')
    }

    console.log('Session assets processed successfully:', updatedSession)

    // Send session email with code if we have user email
    if (updatedSession.user_id) {
      try {
        // Get user email from profiles or sessions table
        const { data: profile } = await supabaseService
          .from('profiles')
          .select('email')
          .eq('id', updatedSession.user_id)
          .single()

        if (profile?.email) {
          // Call send-session-email function
          const emailResponse = await supabaseService.functions.invoke('send-session-email', {
            body: {
              email: profile.email,
              sessionId: sessionId,
              sessionCode: sessionCode,
              planType: updatedSession.plan_type,
              jobRole: jobRole
            }
          })

          console.log('Email function response:', emailResponse)
        }
      } catch (emailError) {
        console.error('Error sending session email:', emailError)
        // Don't fail the whole process if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionCode: sessionCode,
        message: 'Session prepared successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
