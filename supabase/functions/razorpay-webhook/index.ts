import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    
    if (!signature) {
      console.error('No Razorpay signature found')
      return new Response('No signature', { status: 400 })
    }

    // Verify webhook signature
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
    if (webhookSecret) {
      const crypto = await import('https://deno.land/std@0.177.0/crypto/mod.ts')
      const expectedSignature = await crypto.crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(body + webhookSecret)
      )
      const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      if (signature !== expectedSignatureHex) {
        console.error('Invalid webhook signature')
        return new Response('Invalid signature', { status: 400 })
      }
    }

    const event = JSON.parse(body)
    console.log('Received Razorpay webhook:', event.event)

    // Initialize Supabase service client
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity
      const orderId = payment.order_id
      
      console.log('Payment captured for order:', orderId)

      // Find session by order ID (stored in stripe_session_id field)
      const { data: session, error: sessionError } = await supabaseService
        .from('sessions')
        .select('*')
        .eq('stripe_session_id', orderId)
        .single()

      if (sessionError || !session) {
        console.error('Session not found for order:', orderId, sessionError)
        return new Response('Session not found', { status: 400 })
      }

      // Update session status to assets_received (waiting for user uploads)
      const { error: updateError } = await supabaseService
        .from('sessions')
        .update({
          status: 'assets_received',
          stripe_payment_intent_id: payment.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id)

      if (updateError) {
        console.error('Error updating session:', updateError)
        return new Response('Error updating session', { status: 500 })
      }

      console.log('Session updated to assets_received status:', session.id)

      // Get user email from session data
      const userEmail = session.user_email || 'support@interviewaceguru.com'
      
      if (userEmail) {
        try {
          await supabaseService.functions.invoke('send-upload-link', {
            body: {
              email: userEmail,
              sessionId: session.id,
              planType: session.plan_type,
              deviceMode: session.device_mode,
              paymentId: payment.id
            }
          })
          console.log('Email sent successfully')
        } catch (emailError) {
          console.error('Error sending email:', emailError)
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})