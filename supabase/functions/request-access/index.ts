import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ACCESS_REQUEST_TO_EMAIL = Deno.env.get("ACCESS_REQUEST_TO_EMAIL");
const ACCESS_REQUEST_FROM_EMAIL = Deno.env.get("ACCESS_REQUEST_FROM_EMAIL") ?? "onboarding@resend.dev";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
const ACCESS_REQUEST_SMS_TO = Deno.env.get("ACCESS_REQUEST_SMS_TO");

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...init.headers },
  });
}

async function sendEmailNotification(userEmail: string, userId: string): Promise<{ sent: boolean; error?: string }> {
  if (!RESEND_API_KEY || !ACCESS_REQUEST_TO_EMAIL) {
    return { sent: false, error: "Email notification is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ACCESS_REQUEST_FROM_EMAIL,
      to: [ACCESS_REQUEST_TO_EMAIL],
      subject: "New story generation access request",
      text: [
        "A user requested access to story generation.",
        `Email: ${userEmail}`,
        `User ID: ${userId}`,
        "Approve in Supabase table: public.story_generation_access",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { sent: false, error: `Email send failed: ${body}` };
  }

  return { sent: true };
}

async function sendSmsNotification(userEmail: string): Promise<{ sent: boolean; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER || !ACCESS_REQUEST_SMS_TO) {
    return { sent: false, error: "SMS notification is not configured." };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const authToken = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const formData = new URLSearchParams({
    To: ACCESS_REQUEST_SMS_TO,
    From: TWILIO_FROM_NUMBER,
    Body: `New app access request from ${userEmail}`,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    return { sent: false, error: `SMS send failed: ${body}` };
  }

  return { sent: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: "Missing Supabase environment variables." }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const user = authData.user;
  const userEmail = user.email ?? "";
  if (!userEmail) {
    return jsonResponse({ error: "User email is missing." }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("story_generation_access")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return jsonResponse({ error: existingError.message }, { status: 500 });
  }

  if (existing?.status === "approved") {
    return jsonResponse({ message: "You are already approved." }, { status: 200 });
  }

  const { error: upsertError } = await supabase
    .from("story_generation_access")
    .upsert(
      {
        user_id: user.id,
        email: userEmail,
        status: "pending",
        requested_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (upsertError) {
    return jsonResponse({ error: upsertError.message }, { status: 500 });
  }

  const [emailResult, smsResult] = await Promise.all([
    sendEmailNotification(userEmail, user.id),
    sendSmsNotification(userEmail),
  ]);

  return jsonResponse(
    {
      message: "Access request submitted.",
      notifications: {
        emailSent: emailResult.sent,
        emailError: emailResult.error ?? null,
        smsSent: smsResult.sent,
        smsError: smsResult.error ?? null,
      },
    },
    { status: 200 },
  );
});
