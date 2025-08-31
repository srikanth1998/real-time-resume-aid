import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 SIMPLIFIED RAZORPAY - NO DATABASE')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    console.log('GET request - test endpoint')
    return new Response(
      JSON.stringify({ 
        status: 'working',
        message: 'Simplified Razorpay function'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('✅ POST request received')
    
    // Get secrets
    const razorpayKeyId = Deno.env.get('RZP_KEY_ID')
    const razorpaySecretKey = Deno.env.get('RZP_SECRET_KEY')
    
    console.log('🔍 Secrets check:', {
      keyId: razorpayKeyId ? 'Present' : 'Missing',
      secretKey: razorpaySecretKey ? 'Present' : 'Missing'
    })

    if (!razorpayKeyId || !razorpaySecretKey) {
      console.error('❌ Missing Razorpay credentials')
      throw new Error('Razorpay credentials not configured')
    }

    // Parse request body
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('✅ Body parsed successfully')
    
    const { userEmail, totalPrice } = body
    console.log('🔍 Extracted:', { userEmail, totalPrice })

    if (!userEmail || !totalPrice) {
      throw new Error('Missing required fields')
    }

    // Create REAL Razorpay order
    console.log('💰 Creating Razorpay order for:', totalPrice)
    
    const orderData = {
      amount: totalPrice,
      currency: 'INR',
      receipt: `order_${Date.now()}`,
    }

    console.log('📤 Order data:', orderData)

    const auth = btoa(`${razorpayKeyId}:${razorpaySecretKey}`)
    
    console.log('🌐 Making API call to Razorpay...')
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    })

    console.log('📥 Razorpay response status:', razorpayResponse.status)

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text()
      console.error('❌ Razorpay API error:', errorText)
      throw new Error(`Razorpay API failed: ${razorpayResponse.status}`)
    }

    const razorpayOrder = await razorpayResponse.json()
    console.log('✅ Razorpay order created:', razorpayOrder.id)

    // Return simplified response (no database session for now)
    const response = {
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: razorpayKeyId,
      sessionId: `temp_${Date.now()}`, // Temporary session ID
      sessionCode: 'TEMP123', // Temporary session code
      name: 'InterviewAce',
      description: 'Interview preparation session',
      prefill: {
        email: userEmail,
      }
    }

    console.log('✅ Returning response')
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
    
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