import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...init.headers },
  });
}

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function parseUserIdFromToken(token: string): string {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const decodedPayload = JSON.parse(atob(normalized)) as { sub?: string };
  if (!decodedPayload.sub) throw new Error("No user ID in token");
  return decodedPayload.sub;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return jsonResponse({ error: "Missing Supabase environment variables." }, { status: 500 });
  }

  const authHeader = req.headers.get("Authorization");
  const token = extractBearerToken(authHeader);
  if (!token) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  let userId: string;
  try {
    userId = parseUserIdFromToken(token);
  } catch {
    return jsonResponse({ error: "Invalid token" }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonResponse({ error: error.message }, { status: 500 });
  }

  const normalized = (data ?? []).map((story: Record<string, unknown>) => {
    const content = (story.content ?? {}) as Record<string, unknown>;
    return {
      ...story,
      ...content,
      chapters: Array.isArray(content.chapters) ? content.chapters : [],
    };
  });

  return jsonResponse(normalized, { status: 200 });
});
