
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[EMAIL] Starting send-upload-link function')
    
    const { email, sessionId, planType, deviceMode } = await req.json()
    console.log('[EMAIL] Request data:', { email, sessionId, planType, deviceMode })

    if (!email || !sessionId) {
      console.error('[EMAIL] Missing required fields:', { email: !!email, sessionId: !!sessionId })
      throw new Error('Email and sessionId are required')
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('[EMAIL] RESEND_API_KEY not found')
      throw new Error('RESEND_API_KEY not configured')
    }

    const resend = new Resend(resendApiKey)
    console.log('[EMAIL] Resend client initialized')
    
    // Create the direct upload URL with payment confirmation
    const uploadUrl = `https://jafylkqbmvdptrqwwyed.supabase.co/upload?session_id=${sessionId}&payment_confirmed=true`
    console.log('[EMAIL] Upload URL:', uploadUrl)

    const deviceModeText = deviceMode === 'cross' ? ' (Cross-Device)' : ''
    const planDisplayName = planType ? planType.charAt(0).toUpperCase() + planType.slice(1) : 'Premium'

    console.log('[EMAIL] Sending email to:', email)
    
    const emailResponse = await resend.emails.send({
      from: "InterviewAce <onboarding@resend.dev>",
      to: [email],
      subject: "🚀 Payment Confirmed - Start Your InterviewAce Session",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; font-size: 28px; margin-bottom: 10px;">🧠 InterviewAce</h1>
            <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Payment Confirmed! Ready to Start 🎉</h2>
          </div>

          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #0ea5e9;">
            <h3 style="color: #059669; margin-top: 0; font-size: 18px;">✅ Your ${planDisplayName} Plan${deviceModeText} is Active</h3>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 0;">
              Your payment has been processed successfully! Click the button below to upload your documents and begin your AI-powered interview preparation.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${uploadUrl}" 
               style="background-color: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.25);">
              📄 Upload Documents & Start Session →
            </a>
          </div>

          <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #f59e0b;">
            <h4 style="color: #92400e; margin-top: 0; font-size: 16px;">📋 What to Upload:</h4>
            <ul style="color: #92400e; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li><strong>Your resume</strong> (PDF, Word, or text format)</li>
              <li><strong>Job description</strong> (file upload or paste URL)</li>
            </ul>
            <p style="color: #92400e; margin-top: 15px; margin-bottom: 0;">
              Once uploaded, you'll be taken to the lobby to test your setup and then start your interview session.
            </p>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h4 style="color: #1f2937; margin-top: 0; font-size: 16px;">🔧 Quick Setup Tips:</h4>
            <ul style="color: #4b5563; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Ensure your resume is clearly formatted and up-to-date</li>
              <li>Have a stable internet connection for the best experience</li>
              <li>Test your microphone and camera before starting</li>
              <li>Your session expires automatically after the purchased duration</li>
            </ul>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-center;">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
              <strong>Session ID:</strong> ${sessionId}
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">
              This link is valid for 24 hours. If you need help, please contact our support team.
            </p>
            <p style="color: #6b7280; font-size: 12px; margin: 15px 0 0 0;">
              © 2024 InterviewAce. All rights reserved.
            </p>
          </div>
        </div>
      `,
    })

    console.log('[EMAIL] Email sent successfully:', emailResponse)

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.id,
        message: 'Upload link email sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('[EMAIL] Error sending upload link email:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send upload link email'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
