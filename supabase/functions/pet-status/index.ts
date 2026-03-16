import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...init.headers },
  });
}

function parseUserIdFromAuthorizationHeader(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : "";

  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    const claims = JSON.parse(json) as { sub?: string };
    return claims.sub ?? null;
  } catch (_error) {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: "Missing Supabase environment variables." }, { status: 500 });
  }

  const userId = parseUserIdFromAuthorizationHeader(req.headers.get("Authorization"));
  if (!userId) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from("pet_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return jsonResponse({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return jsonResponse(
      {
        pet_name: "Chotuu",
        xp: 0,
        level: 1,
        evolution_stage: "egg",
      },
      { status: 200 },
    );
  }

  return jsonResponse(data, { status: 200 });
});
