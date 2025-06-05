
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp }: VerifyOTPRequest = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Email and OTP are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate OTP format (should be 6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ error: "OTP must be a 6-digit number" }),
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

    // Hash the provided OTP for comparison
    const encoder = new TextEncoder();
    const data = encoder.encode(otp + email);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log(`[VERIFY-OTP] Attempting to verify OTP for email: ${email}`);
    console.log(`[VERIFY-OTP] Current time: ${new Date().toISOString()}`);

    // Find valid OTP with extended time window (check if expired within last 30 seconds for clock skew)
    const currentTime = new Date();
    const gracePeriod = new Date(currentTime.getTime() - 30000); // 30 seconds grace period

    const { data: otpRecord, error: fetchError } = await supabaseClient
      .from("email_otps")
      .select("*")
      .eq("email", email)
      .eq("otp_hash", hashHex)
      .eq("used", false)
      .gt("expires_at", gracePeriod.toISOString())
      .lt("attempts", 3)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log(`[VERIFY-OTP] OTP lookup result:`, { otpRecord, fetchError });

    if (fetchError) {
      console.error("Error fetching OTP:", fetchError);
      throw new Error("Database error");
    }

    if (!otpRecord) {
      console.log(`[VERIFY-OTP] No valid OTP found for email: ${email}`);
      
      // Check if there are any recent OTPs for this email (for better error messaging)
      const { data: recentOtps } = await supabaseClient
        .from("email_otps")
        .select("expires_at, used, attempts")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(5);

      console.log(`[VERIFY-OTP] Recent OTPs for debugging:`, recentOtps);

      // Increment attempts for any matching email records to prevent brute force
      await supabaseClient
        .from("email_otps")
        .update({ attempts: 999 }) // Mark as exhausted
        .eq("email", email)
        .eq("used", false);

      // Provide specific error message
      const hasExpiredOTPs = recentOtps?.some(otp => new Date(otp.expires_at) < currentTime);
      const hasExhaustedOTPs = recentOtps?.some(otp => otp.attempts >= 3);

      let errorMessage = "Invalid or expired OTP";
      if (hasExpiredOTPs) {
        errorMessage = "OTP has expired. Please request a new one.";
      } else if (hasExhaustedOTPs) {
        errorMessage = "Too many attempts. Please request a new OTP.";
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if OTP is actually expired (double-check)
    if (new Date(otpRecord.expires_at) < currentTime) {
      console.log(`[VERIFY-OTP] OTP is expired. Expires at: ${otpRecord.expires_at}, Current time: ${currentTime.toISOString()}`);
      
      await supabaseClient
        .from("email_otps")
        .update({ used: true, attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ error: "OTP has expired. Please request a new one." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Mark OTP as used
    const { error: updateError } = await supabaseClient
      .from("email_otps")
      .update({ used: true, attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);

    if (updateError) {
      console.error("Error updating OTP:", updateError);
      throw new Error("Failed to update OTP status");
    }

    console.log(`[VERIFY-OTP] OTP verified successfully for email: ${email}`);

    // Check if user exists, if not create them
    const { data: existingUser } = await supabaseClient
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!existingUser) {
      const { error: userError } = await supabaseClient
        .from("users")
        .insert({ email });

      if (userError) {
        console.error("Error creating user:", userError);
        // Don't fail if user creation fails, as they might exist in auth.users
      }
    }

    // Clean up expired OTPs
    await supabaseClient.rpc('cleanup_expired_otps');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP verified successfully",
        email: email
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
    console.error("Error in verify-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to verify OTP" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
