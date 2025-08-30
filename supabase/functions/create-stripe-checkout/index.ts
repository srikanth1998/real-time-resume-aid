import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 STRIPE CHECKOUT FUNCTION v1.0')
  console.log('🕐 Timestamp:', new Date().toISOString())
  console.log('Method:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('✅ Request body parsed successfully')
    
    const { planType, userEmail, totalPrice, quota, hours, deviceMode = 'single' } = body
    console.log('📊 Request data:', { planType, userEmail, totalPrice, quota, hours, deviceMode })

    if (!userEmail) {
      console.error('❌ No email provided')
      throw new Error('User email is required')
    }

    // Get Stripe secret key
    console.log('🔑 Loading Stripe credentials...')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    
    if (!stripeSecretKey) {
      const errorMsg = 'Missing Stripe secret key'
      console.error('❌', errorMsg)
      throw new Error(errorMsg)
    }
    
    console.log('✅ Stripe secret key is available')

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('💳 Creating Stripe checkout session...')
    
    // Determine the price and product details
    let priceInCents: number
    let productName: string
    let description: string

    if (planType === 'question-analysis' || planType === 'coding-helper') {
      // Quota-based payment (already in INR, convert to cents)
      priceInCents = Math.round(totalPrice)
      productName = planType === 'question-analysis' ? 'Question Analysis Plan' : 'Coding Helper Plan'
      description = `${quota} ${planType === 'question-analysis' ? 'images' : 'questions'} - One-time payment`
    } else {
      // Hourly payment (USD, convert to cents)
      priceInCents = Math.round((totalPrice || (9.99 * (hours || 1))) * 100)
      productName = 'Interview Session'
      description = `${hours || 1} hour${(hours || 1) > 1 ? 's' : ''} interview session`
    }

    // Create Stripe checkout session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': planType === 'question-analysis' || planType === 'coding-helper' ? 'inr' : 'usd',
        'line_items[0][price_data][product_data][name]': productName,
        'line_items[0][price_data][product_data][description]': description,
        'line_items[0][price_data][unit_amount]': priceInCents.toString(),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${req.headers.get('origin') || 'http://localhost:5173'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${req.headers.get('origin') || 'http://localhost:5173'}/payment?cancelled=true`,
        'customer_email': userEmail,
        'metadata[plan_type]': planType,
        'metadata[device_mode]': deviceMode,
        'metadata[quota]': quota?.toString() || '',
        'metadata[hours]': hours?.toString() || '',
      })
    })

    console.log('📥 Stripe response status:', stripeResponse.status)

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.text()
      console.error('❌ Stripe API error:', errorData)
      throw new Error(`Stripe API failed: ${stripeResponse.status} - ${errorData}`)
    }

    const stripeSession = await stripeResponse.json()
    console.log('✅ Stripe session created:', stripeSession.id)

    // Create session record in database
    const sessionData = {
      stripe_session_id: stripeSession.id,
      user_email: userEmail,
      plan_type: planType,
      device_mode: deviceMode,
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    }

    if (quota) {
      sessionData.quota = parseInt(quota)
    }

    if (hours) {
      sessionData.duration_hours = parseInt(hours)
    }

    console.log('💾 Creating session record...')
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select()
      .single()

    if (sessionError) {
      console.error('❌ Database error:', sessionError)
      throw new Error(`Failed to create session: ${sessionError.message}`)
    }

    console.log('✅ Session record created:', session.id)

    console.log('🎉 SUCCESS - Returning checkout URL')
    return new Response(
      JSON.stringify({ 
        checkout_url: stripeSession.url,
        session_id: stripeSession.id,
        database_session_id: session.id
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
        timestamp: new Date().toISOString(),
        debug_info: {
          error_type: error.name,
          has_stripe_key: !!Deno.env.get('STRIPE_SECRET_KEY')
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})