
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sessionId, question } = await req.json();
    
    if (!sessionId || !question) {
      throw new Error('Session ID and question are required');
    }

    console.log('Generating answer for session:', sessionId, 'Question:', question);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get session details and documents
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // Get uploaded documents for this session
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('session_id', sessionId);

    if (docsError) {
      throw new Error('Failed to fetch documents');
    }

    let resumeContent = '';
    let jobDescContent = '';

    // Extract content from documents
    for (const doc of documents) {
      if (doc.type === 'resume' && doc.parsed_content) {
        resumeContent = doc.parsed_content;
      } else if (doc.type === 'job_description') {
        if (doc.parsed_content) {
          jobDescContent = doc.parsed_content;
        } else if (doc.storage_path && doc.storage_path.startsWith('http')) {
          // It's a URL, use it as content
          jobDescContent = `Job posting URL: ${doc.storage_path}`;
        }
      }
    }

    // Create AI prompt with context
    const systemPrompt = `You are an AI interview assistant helping a candidate answer interview questions. You have access to their resume and the job description they're applying for.

IMPORTANT GUIDELINES:
- Provide specific, tailored answers that connect the candidate's experience to the job requirements
- Keep answers concise but comprehensive (2-3 sentences typically)
- Use first person ("I have experience with..." not "The candidate has...")
- Be confident and professional
- Include specific examples from the resume when relevant
- Address the question directly and completely
- If the question is about something not in the resume, provide a thoughtful general response

RESUME CONTENT:
${resumeContent || 'No resume content available'}

JOB DESCRIPTION:
${jobDescContent || 'No job description available'}

Please provide a tailored answer for the following interview question:`;

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error('Failed to generate AI response');
    }

    const data = await response.json();
    const generatedAnswer = data.choices[0].message.content;

    console.log('Generated answer:', generatedAnswer);

    return new Response(JSON.stringify({ 
      answer: generatedAnswer,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-interview-answer function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
