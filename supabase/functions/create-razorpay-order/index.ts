import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 EDGE FUNCTION STARTED')
  console.log('Method:', req.method)
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('✅ Request body parsed:', body)
    
    const { planType, userEmail, totalPrice, quota, deviceMode = 'single' } = body
    console.log('📊 Extracted data:', { planType, userEmail, totalPrice, quota, deviceMode })

    if (!userEmail) {
      console.error('❌ No email provided')
      throw new Error('User email is required')
    }

    console.log('🔑 Checking Razorpay keys...')
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpaySecretKey = Deno.env.get('RAZORPAY_SECRET_KEY')
    
    console.log('🔑 Key status:', {
      keyId: razorpayKeyId ? 'Present' : 'Missing',
      secretKey: razorpaySecretKey ? 'Present' : 'Missing'
    })
    
    if (!razorpayKeyId) {
      throw new Error('Razorpay Key ID not configured')
    }
    
    if (!razorpaySecretKey) {
      throw new Error('Razorpay Secret Key not configured')
    }

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
      name: error.name
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