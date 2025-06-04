
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
    console.log('[WEBHOOK] Starting webhook processing')
    
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      console.error('[WEBHOOK] No Stripe signature found')
      throw new Error('No Stripe signature found')
    }

    const body = await req.text()
    console.log('[WEBHOOK] Received webhook body length:', body.length)
    
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

    console.log('[WEBHOOK] Event type:', event.type)
    console.log('[WEBHOOK] Event ID:', event.id)

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      const sessionId = session.metadata?.session_id
      const planType = session.metadata?.plan_type
      const deviceMode = session.metadata?.device_mode || 'single'

      console.log('[WEBHOOK] Processing payment for session:', sessionId)
      console.log('[WEBHOOK] Plan type:', planType)
      console.log('[WEBHOOK] Device mode:', deviceMode)

      if (!sessionId) {
        console.error('[WEBHOOK] No session_id in metadata')
        throw new Error('No session_id found in Stripe metadata')
      }

      // Get session details to fetch user info
      const { data: sessionData, error: sessionError } = await supabaseClient
        .from('sessions')
        .select('*, users(email)')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        console.error('[WEBHOOK] Error fetching session:', sessionError)
        throw new Error('Session not found: ' + sessionId)
      }

      console.log('[WEBHOOK] Found session:', sessionData.id)
      console.log('[WEBHOOK] User email:', sessionData.users?.email)

      // Update session status to pending_assets (ready for upload)
      const { error: updateError } = await supabaseClient
        .from('sessions')
        .update({
          status: 'pending_assets',
          stripe_payment_intent_id: session.payment_intent,
          stripe_session_id: session.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('[WEBHOOK] Error updating session status:', updateError)
        throw updateError
      }

      console.log('[WEBHOOK] Session updated to pending_assets')

      // Send email with upload link - always attempt this
      try {
        console.log('[WEBHOOK] Sending upload link email...')
        
        const { data: emailData, error: emailError } = await supabaseClient.functions.invoke('send-upload-link', {
          body: {
            email: sessionData.users?.email,
            sessionId: sessionId,
            planType: planType,
            deviceMode: deviceMode
          }
        })

        if (emailError) {
          console.error('[WEBHOOK] Error sending email:', emailError)
          // Log error but don't fail the webhook
        } else {
          console.log('[WEBHOOK] Upload link email sent successfully:', emailData)
        }
      } catch (emailErr) {
        console.error('[WEBHOOK] Email sending failed:', emailErr)
        // Continue without failing the webhook
      }

      console.log('[WEBHOOK] Payment processing completed for session:', sessionId)
    } else {
      console.log('[WEBHOOK] Unhandled event type:', event.type)
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('[WEBHOOK] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
