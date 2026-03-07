import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StoryPayload = {
  title: string;
  moral: string;
  chapters: Array<Record<string, unknown>>;
  character_seed?: number;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...init.headers },
  });
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

  let payload: StoryPayload;
  try {
    payload = await req.json();
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload?.title || !payload?.moral || !Array.isArray(payload?.chapters)) {
    return jsonResponse({ error: "Story payload missing required fields." }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  });

  // Decode token to get user_id (JWT format: header.payload.signature)
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  
  if (!token) {
    return jsonResponse({ error: "Missing authorization token" }, { status: 401 });
  }

  // Decode token to get user_id (JWT format: header.payload.signature)
  let userId: string;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT format");
    const decodedPayload = JSON.parse(atob(parts[1]));
    userId = decodedPayload.sub; // Supabase stores user ID as "sub" claim
    if (!userId) throw new Error("No user ID in token");
  } catch (e) {
    return jsonResponse({ error: "Invalid token: " + (e as Error).message }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: userId,
      title: payload.title,
      type: "story",
      content: payload,
      image_url: payload.chapters?.[0]?.image_url ?? null,
    })
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, { status: 500 });
  }

  return jsonResponse({ message: "Story saved to library!", data }, { status: 200 });
});
