
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
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('No Stripe signature found')
    }

    const body = await req.text()
    
    // Initialize Stripe
    const stripe = new (await import('https://esm.sh/stripe@13.0.0')).default(
      Deno.env.get('STRIPE_SECRET_KEY') ?? '',
      {
        apiVersion: '2023-10-16',
      }
    )

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    )

    console.log('Webhook event type:', event.type)

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      const sessionId = session.metadata.session_id
      const planType = session.metadata.plan_type

      console.log('Processing payment for session:', sessionId)

      // Update session status to pending_assets (ready for upload)
      const { error: updateError } = await supabaseClient
        .from('sessions')
        .update({
          status: 'pending_assets',
          stripe_payment_intent_id: session.payment_intent,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('Error updating session status:', updateError)
        throw updateError
      }

      console.log('Session updated successfully to pending_assets:', sessionId)
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
