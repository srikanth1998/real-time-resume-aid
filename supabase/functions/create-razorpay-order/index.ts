import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 EDGE FUNCTION v6.0 - DEBUG MODE')
  console.log('🕐 Timestamp:', new Date().toISOString())
  console.log('Method:', req.method)
  console.log('🌍 URL:', req.url)
  console.log('📋 Headers:', Object.fromEntries(req.headers.entries()))
  
  // Handle CORS preflight requests first
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers')
    return new Response('ok', { headers: corsHeaders })
  }

  // Add a simple test endpoint
  if (req.method === 'GET') {
    console.log('GET request - returning test response')
    return new Response(
      JSON.stringify({ 
        status: 'Function is working!',
        timestamp: new Date().toISOString(),
        secrets_available: {
          razorpay_key_id: !!Deno.env.get('RAZORPAY_KEY_ID'),
          razorpay_secret: !!Deno.env.get('RAZORPAY_SECRET_KEY')
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('✅ Request body parsed successfully')
    
    const { planType, userEmail, totalPrice, quota, deviceMode = 'single' } = body
    console.log('📊 Request data:', { planType, userEmail, totalPrice, quota, deviceMode })

    if (!userEmail) {
      console.error('❌ No email provided')
      throw new Error('User email is required')
    }

    // Get Razorpay credentials with detailed logging
    console.log('🔑 Loading Razorpay credentials...')
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpaySecretKey = Deno.env.get('RAZORPAY_SECRET_KEY')
    
    // Enhanced debugging
    const envObject = Deno.env.toObject()
    const razorpayVars = Object.keys(envObject).filter(key => key.includes('RAZORPAY'))
    console.log('🔍 Available RAZORPAY variables:', razorpayVars)
    
    console.log('🔑 Credentials status:', {
      keyId: razorpayKeyId ? `Present (${razorpayKeyId.length} chars)` : 'MISSING',
      secretKey: razorpaySecretKey ? `Present (${razorpaySecretKey.length} chars)` : 'MISSING'
    })
    
    if (!razorpayKeyId || !razorpaySecretKey) {
      const errorMsg = `Missing Razorpay credentials: KeyID=${!!razorpayKeyId}, Secret=${!!razorpaySecretKey}`
      console.error('❌', errorMsg)
      throw new Error(errorMsg)
    }
    
    console.log('✅ Both Razorpay keys are available')

    console.log('💰 Creating Razorpay order...')
    const orderData = {
      amount: totalPrice || 100, // Default to 1 INR if no amount
      currency: 'INR',
      receipt: `test_${Date.now()}`,
      notes: {
        plan_type: planType,
        user_email: userEmail
      }
    }

    console.log('📤 Order data:', orderData)

    const auth = btoa(`${razorpayKeyId}:${razorpaySecretKey}`)
    
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

    console.log('🎉 SUCCESS - Returning order data')
    return new Response(
      JSON.stringify({ 
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: razorpayKeyId,
        sessionId: 'test-session',
        name: 'InterviewAce Test',
        description: 'Test order',
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
    
    // Log additional context for debugging
    console.error('🔍 Error Context:', {
      hasRazorpayKeyId: !!Deno.env.get('RAZORPAY_KEY_ID'),
      hasRazorpaySecretKey: !!Deno.env.get('RAZORPAY_SECRET_KEY'),
      errorType: error.constructor.name,
      isNetworkError: error.message.includes('fetch'),
      isAuthError: error.message.includes('401') || error.message.includes('auth'),
    })
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        debug_info: {
          error_type: error.name,
          has_keys: {
            key_id: !!Deno.env.get('RAZORPAY_KEY_ID'),
            secret_key: !!Deno.env.get('RAZORPAY_SECRET_KEY')
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})