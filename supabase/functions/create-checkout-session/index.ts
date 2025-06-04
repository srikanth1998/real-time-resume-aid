
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
    const { planType, priceAmount, planName, duration, deviceMode = 'single', userEmail } = await req.json()
    console.log('Received request:', { planType, priceAmount, planName, duration, deviceMode, userEmail })

    if (!userEmail) {
      throw new Error('User email is required')
    }

    // Initialize Supabase client with anon key for auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the auth header and extract the JWT token (if provided)
    const authHeader = req.headers.get('authorization')
    let userId = null

    if (authHeader) {
      try {
        const jwt = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
        if (user) {
          userId = user.id
          console.log('Authenticated user:', user.id)
        }
      } catch (authError) {
        console.log('No valid auth, proceeding as guest checkout')
      }
    }

    // Use service role key to create session
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create a new session record for tracking
    const { data: session, error: sessionError } = await supabaseService
      .from('sessions')
      .insert({
        user_id: userId,
        plan_type: planType,
        duration_minutes: planType === 'basic' ? 30 : planType === 'pro' ? 120 : planType === 'standard' ? 60 : planType === 'elite' ? 180 : 60,
        price_cents: priceAmount,
        device_mode: deviceMode,
        status: 'pending_payment',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (sessionError || !session) {
      console.error('Error creating session:', sessionError)
      throw new Error('Failed to create session')
    }

    console.log('Created session:', session.id)

    // Initialize Stripe
    const stripe = new (await import('https://esm.sh/stripe@13.0.0')).default(
      Deno.env.get('STRIPE_SECRET_KEY') ?? '',
      {
        apiVersion: '2023-10-16',
      }
    )

    const deviceModeText = deviceMode === 'cross' ? ' (Cross-Device)' : ''

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `InterviewAce ${planName} Plan${deviceModeText}`,
              description: `${duration} of real-time interview assistance${deviceModeText}`,
            },
            unit_amount: priceAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment-success?session_id=${session.id}`,
      cancel_url: `${req.headers.get('origin')}/payment?cancelled=true`,
      metadata: {
        session_id: session.id,
        plan_type: planType,
        device_mode: deviceMode,
        user_email: userEmail,
      },
    })

    console.log('Created Stripe session:', checkoutSession.id)

    // Update session with Stripe session ID
    const { error: updateError } = await supabaseService
      .from('sessions')
      .update({ 
        stripe_session_id: checkoutSession.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id)

    if (updateError) {
      console.error('Error updating session:', updateError)
    }

    return new Response(
      JSON.stringify({ url: checkoutSession.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
