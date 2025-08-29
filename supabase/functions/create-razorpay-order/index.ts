import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 EDGE FUNCTION STARTED - v3.0 (Secrets Updated)')
  console.log('Method:', req.method)
  console.log('🕐 Timestamp:', new Date().toISOString())
  console.log('🌍 Environment check:', {
    NODE_ENV: Deno.env.get('NODE_ENV'),
    DENO_DEPLOYMENT_ID: Deno.env.get('DENO_DEPLOYMENT_ID')
  })
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('✅ Request body parsed successfully')
    console.log('📊 Body keys:', Object.keys(body))
    
    const { planType, userEmail, totalPrice, quota, deviceMode = 'single' } = body
    console.log('📊 Extracted data:', { planType, userEmail, totalPrice, quota, deviceMode })

    if (!userEmail) {
      console.error('❌ No email provided')
      throw new Error('User email is required')
    }

    console.log('🔑 Checking Razorpay keys...')
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpaySecretKey = Deno.env.get('RAZORPAY_SECRET_KEY')
    
    // Debug: List all environment variables that start with RAZORPAY
    const allEnvVars = Object.keys(Deno.env.toObject()).filter(key => key.startsWith('RAZORPAY'))
    console.log('🔍 All RAZORPAY env vars:', allEnvVars)
    
    console.log('🔑 Key status:', {
      keyId: razorpayKeyId ? 'Present' : 'Missing',
      secretKey: razorpaySecretKey ? 'Present' : 'Missing'
    })
    
    console.log('🔍 Debug - Key lengths:', {
      keyIdLength: razorpayKeyId ? razorpayKeyId.length : 0,
      secretKeyLength: razorpaySecretKey ? razorpaySecretKey.length : 0
    })
    
    // Debug: Show first few characters of keys (masked)
    console.log('🔍 Key previews:', {
      keyIdPreview: razorpayKeyId ? `${razorpayKeyId.substring(0, 8)}...` : 'null',
      secretKeyPreview: razorpaySecretKey ? `${razorpaySecretKey.substring(0, 8)}...` : 'null'  
    })
    
    if (!razorpayKeyId) {
      const errorMsg = 'Razorpay Key ID not configured'
      console.error('❌', errorMsg)
      throw new Error(errorMsg)
    }
    
    if (!razorpaySecretKey) {
      const errorMsg = 'Razorpay Secret Key not configured'
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