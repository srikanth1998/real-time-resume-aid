
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Log all incoming requests for debugging
  console.log('[WEBHOOK] =================================')
  console.log('[WEBHOOK] Incoming request URL:', req.url)
  console.log('[WEBHOOK] Request method:', req.method)
  console.log('[WEBHOOK] All headers:', Object.fromEntries(req.headers.entries()))
  console.log('[WEBHOOK] =================================')

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
    
    // Check if webhook secret is configured
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET not configured')
      throw new Error('STRIPE_WEBHOOK_SECRET not configured')
    }
    
    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      console.error('[WEBHOOK] STRIPE_SECRET_KEY not configured')
      throw new Error('STRIPE_SECRET_KEY not configured')
    }
    
    const stripe = new (await import('https://esm.sh/stripe@13.0.0')).default(
      stripeKey,
      {
        apiVersion: '2023-10-16',
      }
    )

    // Verify webhook signature using async method
    let event
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      )
    } catch (err) {
      console.error('[WEBHOOK] Webhook signature verification failed:', err.message)
      throw new Error(`Webhook signature verification failed: ${err.message}`)
    }

    console.log('[WEBHOOK] Event type:', event.type)
    console.log('[WEBHOOK] Event ID:', event.id)

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      const planType = session.metadata?.plan_type
      const deviceMode = session.metadata?.device_mode || 'single'
      const userEmail = session.metadata?.user_email

      console.log('[WEBHOOK] Processing payment for checkout session')
      console.log('[WEBHOOK] Plan type:', planType)
      console.log('[WEBHOOK] Device mode:', deviceMode)
      console.log('[WEBHOOK] User email:', userEmail)
      console.log('[WEBHOOK] Full session metadata:', session.metadata)
      console.log('[WEBHOOK] Stripe session ID:', session.id)
      console.log('[WEBHOOK] Payment intent ID:', session.payment_intent)

      if (!userEmail) {
        console.error('[WEBHOOK] No user_email in metadata')
        throw new Error('No user_email found in Stripe metadata')
      }

      if (!planType) {
        console.error('[WEBHOOK] No plan_type in metadata')
        throw new Error('No plan_type found in Stripe metadata')
      }

      // Generate a new session ID for our database
      const sessionId = crypto.randomUUID()
      console.log('[WEBHOOK] Generated new session ID:', sessionId)

      // Determine duration and price based on plan type
      let durationMinutes = 60
      let priceCents = 1800 // Default Pay-As-You-Go $18.00

      switch (planType) {
        case 'pay-as-you-go':
          durationMinutes = 60
          priceCents = 1800
          break
        case 'pro':
          durationMinutes = 240 // 4 sessions * 60 min each
          priceCents = 2900
          break
        case 'coach':
          durationMinutes = 1200 // 20 credits * 60 min each
          priceCents = 9900
          break
        case 'enterprise':
          durationMinutes = 30000 // 500+ credits * 60 min each
          priceCents = 0 // Custom pricing
          break
      }

      console.log('[WEBHOOK] Session details:', {
        sessionId,
        planType,
        deviceMode,
        durationMinutes,
        priceCents
      })

      // Create session in database with explicit error checking
      console.log('[WEBHOOK] Creating session in database...')
      const sessionData = {
        id: sessionId,
        plan_type: planType,
        device_mode: deviceMode,
        duration_minutes: durationMinutes,
        price_cents: priceCents,
        status: 'pending_assets',
        stripe_payment_intent_id: session.payment_intent,
        stripe_session_id: session.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('[WEBHOOK] Attempting to insert session data:', sessionData)

      const { data: insertedSession, error: sessionError } = await supabaseClient
        .from('sessions')
        .insert(sessionData)
        .select()
        .single()

      if (sessionError) {
        console.error('[WEBHOOK] Error creating session:', sessionError)
        console.error('[WEBHOOK] Session error details:', {
          message: sessionError.message,
          code: sessionError.code,
          details: sessionError.details,
          hint: sessionError.hint
        })
        throw new Error(`Database error creating session: ${sessionError.message}`)
      }

      console.log('[WEBHOOK] Session created successfully:', insertedSession)

      // Verify the session was actually created by checking the database
      const { data: verificationData, error: verificationError } = await supabaseClient
        .from('sessions')
        .select('id, status, plan_type')
        .eq('id', sessionId)
        .single()

      if (verificationError || !verificationData) {
        console.error('[WEBHOOK] Session verification failed:', verificationError)
        throw new Error('Session was not properly created in database')
      }

      console.log('[WEBHOOK] Session verification successful:', verificationData)

      // Generate payment confirmation ID
      const paymentId = session.payment_intent || session.id
      console.log('[WEBHOOK] Payment ID for email:', paymentId)

      // Send email with upload link
      try {
        console.log('[WEBHOOK] Sending upload link email with session ID:', sessionId)
        
        const { data: emailData, error: emailError } = await supabaseClient.functions.invoke('send-upload-link', {
          body: {
            email: userEmail,
            sessionId: sessionId,
            planType: planType,
            deviceMode: deviceMode,
            paymentId: paymentId
          }
        })

        if (emailError) {
          console.error('[WEBHOOK] Error sending email:', emailError)
          // Don't throw here - session was created successfully
        } else {
          console.log('[WEBHOOK] Upload link email sent successfully:', emailData)
        }
      } catch (emailErr) {
        console.error('[WEBHOOK] Email sending failed:', emailErr)
        // Don't throw here - session was created successfully
      }

      console.log('[WEBHOOK] Payment processing completed successfully for session:', sessionId)
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
