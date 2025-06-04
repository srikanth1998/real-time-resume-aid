
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

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabaseClient
      .from("email_otps")
      .select("*")
      .eq("email", email)
      .eq("otp_hash", hashHex)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .lt("attempts", 3)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching OTP:", fetchError);
      throw new Error("Database error");
    }

    if (!otpRecord) {
      // Increment attempts for any matching email/time records
      await supabaseClient
        .from("email_otps")
        .update({ attempts: 999 }) // Mark as exhausted
        .eq("email", email)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString());

      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP" }),
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

    // Use Supabase Auth to sign in with OTP
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      }
    });

    if (authError) {
      console.error("Auth error:", authError);
      // Fallback: return a success response and let the frontend handle auth
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
