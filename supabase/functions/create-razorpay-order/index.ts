import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 EDGE FUNCTION v13.0 - NEW SECRET NAMES')
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
    const razorpayKeyId = Deno.env.get('RZP_KEY_ID')
    const razorpaySecretKey = Deno.env.get('RZP_SECRET_KEY')
    
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
    console.log('✅ Request body parsed:', JSON.stringify(body, null, 2))
    
    const { planType, userEmail, totalPrice, quota, deviceMode = 'single' } = body

    console.log('🔍 EXTRACTED VALUES:', {
      planType,
      userEmail,
      totalPrice,
      quota,
      deviceMode
    })

    if (!userEmail) {
      console.error('❌ Missing userEmail')
      throw new Error('User email is required')
    }

    if (!razorpayKeyId || !razorpaySecretKey) {
      console.error('❌ Missing Razorpay credentials')
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

    console.log('📤 Order data to send to Razorpay:', JSON.stringify(orderData, null, 2))

    const auth = btoa(`${razorpayKeyId}:${razorpaySecretKey}`)
    console.log('🔐 Auth header created successfully')
    
    console.log('🌐 Making request to Razorpay API...')
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    })

    console.log('📥 Razorpay response status:', razorpayResponse.status)
    console.log('📥 Razorpay response headers:', Object.fromEntries(razorpayResponse.headers.entries()))

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.text()
      console.error('❌ Razorpay API error:', errorData)
      throw new Error(`Razorpay API failed: ${razorpayResponse.status} - ${errorData}`)
    }

    const razorpayOrder = await razorpayResponse.json()
    console.log('✅ Razorpay order created:', JSON.stringify(razorpayOrder, null, 2))

    // Create session in database
    console.log('💾 Creating session in database...')
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 SUPABASE CONFIG:', {
      url: Deno.env.get('SUPABASE_URL') ? 'Present' : 'MISSING',
      serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Present' : 'MISSING'
    })

    // Generate session code
    const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    console.log('🎯 Generated session code:', sessionCode)
    
    // Calculate duration based on plan type
    const durationMinutes = quota ? quota * 60 : 60; // quota * 60 minutes for quota plans, or 60 default
    console.log('⏱️ Calculated duration:', durationMinutes, 'minutes')
    
    const sessionData = {
      session_code: sessionCode,
      user_email: userEmail,
      plan_type: planType === 'pay-as-you-go' ? 'quick-session' : 
                 planType === 'question-analysis' ? 'question-analysis' :
                 planType === 'coding-helper' ? 'coding-helper' : 'quick-session',
      device_mode: deviceMode,
      stripe_session_id: razorpayOrder.id,
      status: 'pending_payment',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      duration_minutes: durationMinutes,
      price_cents: totalPrice,
      quota: quota || null
    }

    console.log('📋 Session data to insert:', JSON.stringify(sessionData, null, 2))

    const { data: session, error: sessionError } = await supabaseService
      .from('sessions')
      .insert(sessionData)
      .select()
      .single()

    if (sessionError) {
      console.error('❌ Error creating session:', JSON.stringify(sessionError, null, 2))
      throw new Error(`Failed to create session in database: ${sessionError.message}`)
    }

    console.log('✅ Session created successfully:', JSON.stringify(session, null, 2))

    return new Response(
      JSON.stringify({ 
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: razorpayKeyId,
        sessionId: session.id,
        sessionCode: sessionCode,
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