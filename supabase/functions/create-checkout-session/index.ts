
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
    const { sessionId, planType, priceAmount, planName, duration } = await req.json()
    console.log('Received request:', { sessionId, planType, priceAmount, planName, duration })

    // Initialize Supabase client with anon key for auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the auth header and extract the JWT token
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      console.error('No authorization header')
      throw new Error('No authorization header')
    }

    // Get user from JWT token
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    
    if (userError || !user) {
      console.error('Authentication error:', userError)
      throw new Error('User not authenticated')
    }

    console.log('Authenticated user:', user.id)

    // Use service role key to verify session
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the session exists and belongs to the user
    const { data: session, error: sessionError } = await supabaseService
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      console.error('Session not found:', sessionError)
      throw new Error('Session not found')
    }

    console.log('Found session:', session.id)

    // Initialize Stripe
    const stripe = new (await import('https://esm.sh/stripe@13.0.0')).default(
      Deno.env.get('STRIPE_SECRET_KEY') ?? '',
      {
        apiVersion: '2023-10-16',
      }
    )

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `InterviewAce ${planName} Plan`,
              description: `${duration} of real-time interview assistance`,
            },
            unit_amount: priceAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/upload?session_id=${sessionId}`,
      cancel_url: `${req.headers.get('origin')}/payment`,
      metadata: {
        session_id: sessionId,
        plan_type: planType,
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
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error updating session:', updateError)
    }

    return new Response(
      JSON.stringify({ url: checkoutSession.url }),
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
