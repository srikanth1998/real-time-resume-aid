
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

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Get the auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Set the auth header for the client
    supabaseClient.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: '',
    } as any)

    // Verify the session exists and belongs to the user
    const { data: session, error: sessionError } = await supabaseClient
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      throw new Error('Session not found')
    }

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

    // Update session with Stripe session ID
    const { error: updateError } = await supabaseClient
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
