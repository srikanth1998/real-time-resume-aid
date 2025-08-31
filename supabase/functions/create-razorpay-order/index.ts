import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 RAZORPAY ORDER FUNCTION - FULL VERSION')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    console.log('GET request - test endpoint')
    return new Response(
      JSON.stringify({ 
        status: 'working',
        message: 'Razorpay order function is operational'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('Processing payment request...')
    
    // Get secrets
    const razorpayKeyId = Deno.env.get('RZP_KEY_ID')
    const razorpaySecretKey = Deno.env.get('RZP_SECRET_KEY')
    
    console.log('Secrets check:', {
      keyId: razorpayKeyId ? 'Present' : 'Missing',
      secretKey: razorpaySecretKey ? 'Present' : 'Missing'
    })

    if (!razorpayKeyId || !razorpaySecretKey) {
      console.error('Missing Razorpay credentials')
      throw new Error('Razorpay credentials not configured')
    }

    // Parse request body
    const body = await req.json()
    console.log('Request data:', JSON.stringify(body, null, 2))
    
    const { planType, userEmail, totalPrice, quota, deviceMode = 'single' } = body

    if (!userEmail) {
      throw new Error('User email is required')
    }

    if (!totalPrice) {
      throw new Error('Total price is required')
    }

    // Create Razorpay order
    console.log('Creating Razorpay order for amount:', totalPrice)
    
    const orderData = {
      amount: totalPrice,
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      notes: {
        plan_type: planType,
        user_email: userEmail
      }
    }

    const auth = btoa(`${razorpayKeyId}:${razorpaySecretKey}`)
    
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    })

    console.log('Razorpay API response status:', razorpayResponse.status)

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text()
      console.error('Razorpay API error:', errorText)
      throw new Error(`Razorpay API failed: ${razorpayResponse.status}`)
    }

    const razorpayOrder = await razorpayResponse.json()
    console.log('Razorpay order created:', razorpayOrder.id)

    // Create session in database
    console.log('Creating session in database...')
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const durationMinutes = quota ? quota * 60 : 60

    const sessionData = {
      session_code: sessionCode,
      user_email: userEmail,
      plan_type: planType === 'pay-as-you-go' ? 'quick-session' : 
                 planType === 'question-analysis' ? 'question-analysis' :
                 planType === 'coding-helper' ? 'coding-helper' : 'quick-session',
      device_mode: deviceMode,
      stripe_session_id: razorpayOrder.id,
      status: 'pending_payment',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration_minutes: durationMinutes,
      price_cents: totalPrice,
      quota: quota || null
    }

    const { data: session, error: sessionError } = await supabaseService
      .from('sessions')
      .insert(sessionData)
      .select()
      .single()

    if (sessionError) {
      console.error('Database error:', sessionError)
      throw new Error(`Failed to create session: ${sessionError.message}`)
    }

    console.log('Session created successfully:', session.id)

    // Return the expected response format
    const response = {
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
    }

    console.log('Returning successful response')
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Payment processing error:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})