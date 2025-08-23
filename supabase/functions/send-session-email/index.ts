import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendSessionEmailRequest {
  email: string;
  sessionId: string;
  sessionCode?: string;
  planType?: string;
  jobRole?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("DEBUG: send-session-email function called with:", { email, sessionId, sessionCode, planType, jobRole });
    const { email, sessionId, sessionCode, planType, jobRole }: SendSessionEmailRequest = await req.json();

    if (!email || !sessionId) {
      return new Response(
        JSON.stringify({ error: "Email and session ID are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const appUrl = "https://preview--real-time-resume-aid.lovable.app";
    const sessionUrl = `${appUrl}/upload?session_id=${sessionId}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%); color: white; border-radius: 8px; overflow: hidden;">
        <div style="padding: 32px; text-align: center;">
          <h1 style="color: #60a5fa; margin-bottom: 16px; font-size: 28px;">🎯 Your Interview Session is Ready!</h1>
          
          <div style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 24px; margin: 24px 0; backdrop-filter: blur(10px);">
            <h2 style="color: #34d399; margin-bottom: 16px; font-size: 20px;">Session Details</h2>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Session ID:</strong> <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; color: #fbbf24;">${sessionId}</code></p>
            ${sessionCode ? `<p style="margin: 8px 0; font-size: 16px;"><strong>6-Digit Code:</strong> <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; color: #fbbf24; font-size: 18px; letter-spacing: 2px;">${sessionCode}</code></p>` : ''}
            ${planType ? `<p style="margin: 8px 0; font-size: 16px;"><strong>Plan:</strong> ${planType}</p>` : ''}
            ${jobRole ? `<p style="margin: 8px 0; font-size: 16px;"><strong>Job Role:</strong> ${jobRole}</p>` : ''}
          </div>

          <div style="margin: 24px 0;">
            <a href="${sessionUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; border: 2px solid #60a5fa; transition: all 0.3s;">
              📁 Upload Your Resume & Start Session
            </a>
          </div>

          <div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; border-radius: 6px; padding: 16px; margin: 24px 0;">
            <h3 style="color: #34d399; margin-bottom: 12px; font-size: 18px;">💡 How to Use Your Session</h3>
            <div style="text-align: left; font-size: 14px; line-height: 1.6;">
              <p>1. <strong>Click the button above</strong> to access your session</p>
              <p>2. <strong>Upload your resume</strong> (PDF format)</p>
              <p>3. <strong>Paste the job description</strong> you're applying for</p>
              <p>4. <strong>Start your interview practice</strong> with AI assistance</p>
              ${sessionCode ? '<p>5. <strong>Use the 6-digit code</strong> to access from other devices</p>' : ''}
            </div>
          </div>

          <div style="background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #fbbf24;">
              <strong>⚡ Important:</strong> This session ID is valid for the lifetime of your account. Save this email for future reference!
            </p>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.2); font-size: 12px; color: #94a3b8;">
            <p>Need help? Contact our support team or visit our FAQ section.</p>
            <p style="margin-top: 8px;">
              <strong>InterviewAce</strong> - Your AI-powered interview companion
            </p>
          </div>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "InterviewAce <onboarding@resend.dev>",
      to: [email],
      subject: `🎯 Your Interview Session is Ready! ${sessionCode ? `Code: ${sessionCode}` : ''}`,
      html: emailHtml,
    });

    console.log("Session email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.data?.id,
        message: "Session details sent to email successfully" 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-session-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);