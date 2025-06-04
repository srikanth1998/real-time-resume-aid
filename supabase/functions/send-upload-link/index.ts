
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
    const { email, sessionId, planType } = await req.json()

    if (!email || !sessionId) {
      throw new Error('Email and sessionId are required')
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
    
    const uploadUrl = `https://jafylkqbmvdptrqwwyed.supabase.co/upload?session_id=${sessionId}&payment_success=true`

    const emailResponse = await resend.emails.send({
      from: "InterviewAce <onboarding@resend.dev>",
      to: [email],
      subject: "Your InterviewAce Session is Ready - Upload Your Documents",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; font-size: 28px; margin-bottom: 10px;">🧠 InterviewAce</h1>
            <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Payment Confirmed!</h2>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="color: #059669; margin-top: 0;">✅ Your ${planType} Plan is Active</h3>
            <p style="color: #374151; line-height: 1.6;">
              Thank you for your payment! Your InterviewAce session is now ready to be set up.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${uploadUrl}" 
               style="background-color: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block;">
              Upload Your Documents →
            </a>
          </div>

          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h4 style="color: #92400e; margin-top: 0;">📋 Next Steps:</h4>
            <ol style="color: #92400e; line-height: 1.8;">
              <li><strong>Upload your resume</strong> (PDF, Word, or text format)</li>
              <li><strong>Upload job description</strong> (file or paste URL)</li>
              <li><strong>Test your setup</strong> in the lobby</li>
              <li><strong>Start your interview</strong> with AI assistance</li>
            </ol>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 14px;">
              This link is valid for 24 hours. If you need help, please contact our support team.
            </p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 15px;">
              © 2024 InterviewAce. All rights reserved.
            </p>
          </div>
        </div>
      `,
    })

    console.log('Email sent successfully:', emailResponse)

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error sending upload link email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
