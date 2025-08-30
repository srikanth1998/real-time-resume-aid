import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 EDGE FUNCTION v11.0 - SIMPLIFIED TEST')
  console.log('🕐 Timestamp:', new Date().toISOString())
  console.log('Method:', req.method)
  console.log('🌍 URL:', req.url)
  
  // Handle CORS preflight requests first
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Immediate secret check
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpaySecretKey = Deno.env.get('RAZORPAY_SECRET_KEY')
    
    console.log('🔍 SECRET CHECK:', {
      keyId: razorpayKeyId ? `Present: ${razorpayKeyId.substring(0, 12)}...` : 'MISSING',
      keyIdLength: razorpayKeyId ? razorpayKeyId.length : 0,
      secretKey: razorpaySecretKey ? `Present: ${razorpaySecretKey.substring(0, 8)}...` : 'MISSING',
      secretKeyLength: razorpaySecretKey ? razorpaySecretKey.length : 0
    })

    // Test endpoint for debugging
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({ 
          status: 'Function working',
          timestamp: new Date().toISOString(),
          secrets: {
            keyId: razorpayKeyId ? `${razorpayKeyId.substring(0, 12)}...` : 'MISSING',
            secretKey: razorpaySecretKey ? `${razorpaySecretKey.substring(0, 8)}...` : 'MISSING'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('✅ Request body parsed:', body)
    
    const { planType, userEmail, totalPrice, quota, deviceMode = 'single' } = body

    if (!userEmail) {
      throw new Error('User email is required')
    }

    if (!razorpayKeyId || !razorpaySecretKey) {
      throw new Error(`Missing Razorpay credentials: KeyID=${!!razorpayKeyId}, Secret=${!!razorpaySecretKey}`)
    }

    console.log('💰 Creating Razorpay order...')
    const orderData = {
      amount: totalPrice || 100,
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      notes: {
        plan_type: planType,
        user_email: userEmail
      }
    }

    console.log('📤 Order data:', orderData)

    const auth = btoa(`${razorpayKeyId}:${razorpaySecretKey}`)
    console.log('🔐 Auth header created successfully')
    
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
      const errorData = await razorpayResponse.text()
      console.error('❌ Razorpay API error:', errorData)
      throw new Error(`Razorpay API failed: ${razorpayResponse.status} - ${errorData}`)
    }

    const razorpayOrder = await razorpayResponse.json()
    console.log('✅ Razorpay order created:', razorpayOrder.id)

    return new Response(
      JSON.stringify({ 
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: razorpayKeyId,
        sessionId: 'test-session',
        name: 'InterviewAce',
        description: 'Interview preparation session',
        prefill: {
          email: userEmail,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 FATAL ERROR:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    })
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})