import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 MINIMAL TEST FUNCTION')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    console.log('GET request received')
    return new Response(
      JSON.stringify({ 
        status: 'working',
        message: 'Minimal function test successful'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('POST request received')
    
    // Try to parse the body to see what's being sent
    const body = await req.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Function is working',
        receivedData: body
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing request:', error.message)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Error in POST request processing'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})