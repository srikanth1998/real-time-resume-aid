
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sessionId, resumeContent, resumeFileName, jobDescription } = await req.json();

    console.log('[PROCESS-ASSETS] Processing assets for session:', sessionId);

    if (!sessionId || !resumeContent || !resumeFileName || !jobDescription) {
      throw new Error('Missing required parameters');
    }

    // Verify session exists and is in correct state
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'pending_assets')
      .single();

    if (sessionError || !session) {
      console.error('[PROCESS-ASSETS] Session verification failed:', sessionError);
      throw new Error('Invalid session or session not ready for assets');
    }

    // Store resume document
    const { data: resumeDoc, error: resumeError } = await supabase
      .from('documents')
      .insert({
        session_id: sessionId,
        type: 'resume',
        filename: resumeFileName,
        mime_type: 'application/pdf',
        file_size: Math.floor(resumeContent.length * 0.75), // Approximate size from base64
        storage_path: `sessions/${sessionId}/${resumeFileName}`,
        parsed_content: resumeContent // Store base64 content temporarily
      })
      .select()
      .single();

    if (resumeError) {
      console.error('[PROCESS-ASSETS] Resume storage failed:', resumeError);
      throw new Error('Failed to store resume');
    }

    // Store job description document
    const { data: jobDoc, error: jobError } = await supabase
      .from('documents')
      .insert({
        session_id: sessionId,
        type: 'job_description',
        filename: 'job_description.txt',
        mime_type: 'text/plain',
        file_size: jobDescription.length,
        storage_path: `sessions/${sessionId}/job_description.txt`,
        parsed_content: jobDescription
      })
      .select()
      .single();

    if (jobError) {
      console.error('[PROCESS-ASSETS] Job description storage failed:', jobError);
      throw new Error('Failed to store job description');
    }

    // Update session status to assets_received
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'assets_received',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('[PROCESS-ASSETS] Session update failed:', updateError);
      throw new Error('Failed to update session status');
    }

    console.log('[PROCESS-ASSETS] Assets processed successfully for session:', sessionId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Assets processed successfully',
        sessionId: sessionId,
        resumeDocId: resumeDoc.id,
        jobDocId: jobDoc.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[PROCESS-ASSETS] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process assets'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
