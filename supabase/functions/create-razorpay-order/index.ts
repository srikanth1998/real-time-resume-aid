import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 RAZORPAY TEST MODE WITH DATABASE INTEGRATION')
  
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
    
    const { userEmail, totalPrice, planType: requestPlanType, quota } = body
    console.log('🔍 Extracted:', { userEmail, totalPrice, requestPlanType, quota })

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

    // Create Supabase client for database operations
    console.log('💾 Creating session in database...')
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Determine session details from request body or fallback to defaults
    let planType = requestPlanType || 'question-analysis'
    let questionsIncluded = 25  // Default
    let codingSessions = 0      // Default
    
    // Use quota from frontend selection if available
    if (quota && quota > 0) {
      if (planType === 'question-analysis') {
        questionsIncluded = parseInt(quota) // e.g., 25, 50, 100 images
        codingSessions = 0
      } else if (planType === 'coding-helper') {
        questionsIncluded = 25 // Fixed for coding plans
        codingSessions = parseInt(quota) // e.g., 3, 5, 10 sessions
      }
    }
    
    console.log('📊 Session limits:', { planType, questionsIncluded, codingSessions })

    // Generate session code
    const sessionCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Create session in database
    const { data: sessionData, error: sessionError } = await supabaseService
      .from('sessions')
      .insert({
        user_email: userEmail, // Save user email for webhook processing
        plan_type: planType,
        device_mode: 'single',
        duration_minutes: 0,
        price_cents: totalPrice,
        questions_included: questionsIncluded,
        coding_sessions_included: codingSessions,
        stripe_session_id: razorpayOrder.id, // Save Razorpay order ID here
        session_code: sessionCode,
        status: 'pending_payment',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
      .select()
      .single()

    if (sessionError) {
      console.error('❌ Error creating session:', sessionError)
      throw new Error(`Database error: ${sessionError.message}`)
    }

    console.log('✅ Session created:', sessionData.id)

    // Return response for Razorpay checkout
    const response = {
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: razorpayKeyId,
      sessionId: sessionData.id,
      sessionCode: sessionCode,
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