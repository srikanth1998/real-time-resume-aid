import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 INTERMEDIATE TEST - No external calls')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    console.log('GET request - test endpoint')
    return new Response(
      JSON.stringify({ 
        status: 'working',
        message: 'Intermediate test function'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('Processing POST request...')
    
    // Get secrets but don't fail if missing
    const razorpayKeyId = Deno.env.get('RZP_KEY_ID')
    const razorpaySecretKey = Deno.env.get('RZP_SECRET_KEY')
    
    console.log('Secrets check:', {
      keyId: razorpayKeyId ? 'Present' : 'Missing',
      secretKey: razorpaySecretKey ? 'Present' : 'Missing'
    })

    // Parse request body
    console.log('Parsing request body...')
    const body = await req.json()
    console.log('Request data received:', Object.keys(body))
    
    const { planType, userEmail, totalPrice, quota, deviceMode = 'single' } = body
    console.log('Extracted values:', { planType, userEmail, totalPrice, quota, deviceMode })

    // Create mock response similar to what Razorpay would return
    const mockOrderId = `order_mock_${Date.now()}`
    const mockSessionId = `session_mock_${Date.now()}`
    const mockSessionCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    console.log('Creating mock response...')
    
    const response = {
      order_id: mockOrderId,
      amount: totalPrice || 10000,
      currency: 'INR',
      key_id: razorpayKeyId || 'rzp_test_mock',
      sessionId: mockSessionId,
      sessionCode: mockSessionCode,
      name: 'InterviewAce',
      description: 'Interview preparation session',
      prefill: {
        email: userEmail || 'test@example.com',
      }
    }

    console.log('Returning mock response:', response)
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in intermediate test:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})