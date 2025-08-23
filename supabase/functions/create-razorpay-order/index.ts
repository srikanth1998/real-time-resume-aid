import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { planType, priceAmount, planName, duration, deviceMode = 'single', userEmail, totalPrice, hours, quota } = await req.json()
    console.log('=== RAZORPAY ORDER CREATION START ===')
    console.log('Received request:', { planType, priceAmount, planName, duration, deviceMode, userEmail, totalPrice, hours, quota })

    if (!userEmail) {
      console.error('❌ ERROR: User email is required')
      throw new Error('User email is required')
    }

    console.log('✅ Email validation passed')

    // Initialize Supabase client with anon key for auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    console.log('✅ Supabase client initialized')

    // Get the auth header and extract the JWT token (if provided)
    const authHeader = req.headers.get('authorization')
    let userId = null

    if (authHeader) {
      try {
        const jwt = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
        if (user) {
          userId = user.id
          console.log('✅ Authenticated user:', user.id)
        }
      } catch (authError) {
        console.log('ℹ️ No valid auth, proceeding as guest checkout')
      }
    } else {
      console.log('ℹ️ No auth header, proceeding as guest')
    }

    // Use service role key to create session
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log('✅ Supabase service client initialized')

    // Map plan types to valid enum values and configuration
    const planConfigs = {
      'pay-as-you-go': {
        name: 'Quick Session',
        billing: 'one-time',
        duration: hours ? hours * 60 : 60, // Convert hours to minutes
        description: 'Pay-per-hour coaching session'
      },
      'standard': {
        name: 'Single Session',
        billing: 'one-time',
        duration: 60,
        description: 'Private coaching overlay'
      },
      'pro': {
        name: 'Pro Plan', 
        billing: 'monthly',
        duration: 240, // 4 sessions * 60 min each
        description: '4 coaching sessions per month'
      },
      'elite': {
        name: 'Elite Plan',
        billing: 'monthly', 
        duration: 1200, // 20 credits * 60 min each
        description: 'Premium coaching features'
      },
      'question-analysis': {
        name: 'Question Analysis Plan',
        billing: 'one-time',
        duration: 0, // Not time-based
        description: 'AI-powered question analysis'
      },
      'coding-helper': {
        name: 'Coding Helper Plan',
        billing: 'one-time', 
        duration: 0, // Not time-based
        description: 'AI coding assistance'
      }
    }

    const planConfig = planConfigs[planType as keyof typeof planConfigs]
    console.log('Looking for plan config for planType:', planType)
    console.log('Available plan types:', Object.keys(planConfigs))
    if (!planConfig) {
      console.error(`Invalid plan type: ${planType}`)
      throw new Error(`Invalid plan type: ${planType}`)
    }

    // Use totalPrice from frontend if provided, otherwise calculate default
    const finalPrice = totalPrice || 1800 // Default to $18 if not provided (in cents)
    const amountInPaise = finalPrice // Razorpay expects amount in paise (same as cents for USD)

    console.log('Using plan config:', { ...planConfig, finalPrice, amountInPaise })

    // Determine questions and coding sessions based on plan type and quota
    let questionsIncluded = 0
    let codingSessionsIncluded = 0
    
    switch (planType) {
      case 'question-analysis':
        questionsIncluded = quota || 50 // Use quota if provided, default to 50
        codingSessionsIncluded = 2
        break
      case 'coding-helper':
        questionsIncluded = 25
        codingSessionsIncluded = quota || 5 // Use quota if provided, default to 5
        break
      case 'quick-session':
      case 'pay-as-you-go':
        questionsIncluded = 10
        codingSessionsIncluded = 1
        break
      case 'pro':
        questionsIncluded = 100
        codingSessionsIncluded = 10
        break
      case 'elite':
        questionsIncluded = 200
        codingSessionsIncluded = 20
        break
      default:
        questionsIncluded = 10
        codingSessionsIncluded = 1
    }

    console.log('✅ Setting session quotas:', { questionsIncluded, codingSessionsIncluded, quota, hours })

    // Create a new session record for tracking
    console.log('🔄 Creating session in database...')
    const { data: session, error: sessionError } = await supabaseService
      .from('sessions')
      .insert({
        user_id: userId,
        plan_type: planType,
        duration_minutes: planConfig.duration,
        price_cents: finalPrice,
        device_mode: deviceMode,
        status: 'pending_payment',
        questions_included: questionsIncluded,
        coding_sessions_included: codingSessionsIncluded,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (sessionError || !session) {
      console.error('❌ ERROR: Failed to create session:', sessionError)
      throw new Error(`Failed to create session: ${sessionError?.message || 'Unknown error'}`)
    }

    console.log('✅ Created session successfully:', session.id)

    // Initialize Razorpay
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpaySecretKey = Deno.env.get('RAZORPAY_SECRET_KEY')
    
    console.log('Razorpay keys check:', {
      keyId: razorpayKeyId ? 'Present' : 'Missing',
      secretKey: razorpaySecretKey ? 'Present' : 'Missing'
    })
    
    if (!razorpayKeyId) {
      throw new Error('Razorpay Key ID not configured')
    }
    
    if (!razorpaySecretKey) {
      throw new Error('Razorpay Secret Key not configured')
    }

    const deviceModeText = deviceMode === 'cross' ? ' (Cross-Device)' : ''

    // Create Razorpay order
    const orderData = {
      amount: amountInPaise, // Amount in paise
      currency: 'INR',
      receipt: `session_${session.id}`,
      notes: {
        session_id: session.id,
        plan_type: planType,
        device_mode: deviceMode,
        user_email: userEmail,
        billing_type: planConfig.billing
      }
    }

    console.log('🔄 Creating Razorpay order with data:', orderData)

    const auth = btoa(`${razorpayKeyId}:${razorpaySecretKey}`)
    
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    })

    console.log('🔄 Razorpay API response status:', razorpayResponse.status)

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.text()
      console.error('❌ ERROR: Razorpay API failed:', {
        status: razorpayResponse.status,
        statusText: razorpayResponse.statusText,
        errorData: errorData
      })
      throw new Error(`Razorpay API failed: ${razorpayResponse.status} - ${errorData}`)
    }

    const razorpayOrder = await razorpayResponse.json()
    console.log('✅ Created Razorpay order successfully:', razorpayOrder.id)

    // Update session with Razorpay order ID
    const { error: updateError } = await supabaseService
      .from('sessions')
      .update({ 
        stripe_session_id: razorpayOrder.id, // Reusing this field for Razorpay order ID
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id)

    if (updateError) {
      console.error('Error updating session:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: razorpayKeyId,
        sessionId: session.id,
        name: `InterviewAce ${planConfig.name}${deviceModeText}`,
        description: `${planConfig.description}${deviceModeText}`,
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
    console.error('❌ FATAL ERROR in create-razorpay-order:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check edge function logs for more information'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})