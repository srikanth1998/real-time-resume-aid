
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
    const { sessionId, question, streaming = true } = await req.json();
    
    if (!sessionId || !question) {
      throw new Error('Session ID and question are required');
    }

    console.log('Generating answer for session:', sessionId, 'Question:', question, 'Streaming:', streaming);

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

    // Get uploaded documents for this session (limit content to avoid token limits)
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('session_id', sessionId);

    if (docsError) {
      throw new Error('Failed to fetch documents');
    }

    let resumeContent = '';
    let jobDescContent = '';

    // Extract content from documents but limit length to avoid token limits
    for (const doc of documents) {
      if (doc.type === 'resume' && doc.parsed_content) {
        // Limit resume content to 2000 characters to avoid token limits
        resumeContent = doc.parsed_content.substring(0, 2000);
      } else if (doc.type === 'job_description') {
        if (doc.parsed_content) {
          // Limit job description to 1000 characters
          jobDescContent = doc.parsed_content.substring(0, 1000);
        } else if (doc.storage_path && doc.storage_path.startsWith('http')) {
          jobDescContent = `Job posting URL: ${doc.storage_path}`;
        }
      }
    }

    // Create a shorter, more focused prompt to avoid token limits
    const systemPrompt = `You are an interview assistant. Generate a concise, professional answer (max 100 words) for the interview question.

Resume highlights: ${resumeContent || 'No resume provided'}
Job context: ${jobDescContent || 'No job description provided'}

Guidelines:
- Keep answers under 100 words
- Be specific and relevant
- Use STAR method when applicable
- Sound confident and professional`;

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (streaming) {
      // Streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini', // Use cheaper, faster model
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: question }
                ],
                temperature: 0.7,
                max_tokens: 150, // Reduced max tokens
                stream: true,
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to generate AI response');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullAnswer = '';

            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content;
                      if (content) {
                        fullAnswer += content;
                        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content, type: 'delta' })}\n\n`));
                      }
                    } catch (e) {
                      // Skip invalid JSON
                    }
                  }
                }
              }
            }

            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'done', fullAnswer })}\n\n`));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response (fallback)
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Use cheaper, faster model
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ],
          temperature: 0.7,
          max_tokens: 150, // Reduced max tokens
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        throw new Error('Failed to generate AI response');
      }

      const data = await response.json();
      const generatedAnswer = data.choices[0].message.content;

      return new Response(JSON.stringify({ 
        answer: generatedAnswer,
        success: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
