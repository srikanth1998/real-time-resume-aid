
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendOTPRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: SendOTPRequest = await req.json();

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check rate limiting - max 3 OTPs per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseClient
      .from("email_otps")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", oneHourAgo);

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests. Please try again later." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the OTP for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(otp + email); // Add email as salt
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store OTP in database (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    
    const { error: insertError } = await supabaseClient
      .from("email_otps")
      .insert({
        email,
        otp_hash: hashHex,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      throw new Error("Failed to store OTP");
    }

    // Send OTP email
    const emailResponse = await resend.emails.send({
      from: "InterviewAce <onboarding@resend.dev>",
      to: [email],
      subject: "Your InterviewAce Login Code",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Your Login Code</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .logo { color: #2563eb; font-size: 24px; font-weight: bold; }
              .otp-code { 
                background: #f3f4f6; 
                padding: 20px; 
                text-align: center; 
                border-radius: 8px; 
                margin: 20px 0;
                border: 2px dashed #2563eb;
              }
              .code { 
                font-size: 36px; 
                font-weight: bold; 
                color: #2563eb; 
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
              }
              .warning { 
                background: #fef3c7; 
                padding: 15px; 
                border-radius: 6px; 
                margin: 20px 0;
                border-left: 4px solid #f59e0b;
              }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🧠 InterviewAce</div>
                <h2>Your Login Code</h2>
              </div>
              
              <p>Hi there!</p>
              <p>Use the following code to complete your login to InterviewAce:</p>
              
              <div class="otp-code">
                <div class="code">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #6b7280;">Enter this code in the app</p>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0;">
                  <li>This code expires in <strong>5 minutes</strong></li>
                  <li>Never share this code with anyone</li>
                  <li>Our team will never ask for this code</li>
                </ul>
              </div>
              
              <p>If you didn't request this code, please ignore this email.</p>
              
              <div class="footer">
                <p>Best regards,<br>The InterviewAce Team</p>
                <p>Need help? Contact us at support@interviewace.com</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("OTP email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent successfully",
        expiresIn: 300 // 5 minutes in seconds
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
    console.error("Error in send-otp-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send OTP" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
