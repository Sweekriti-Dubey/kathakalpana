import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const XP_PER_COMPLETION = 20;

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...init.headers },
  });
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function calcStage(level: number, middleStage: "hatchling" | "hatching") {
  if (level >= 10) return "adult";
  if (level >= 5) return middleStage;
  return "egg";
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

  const accessToken = extractBearerToken(req.headers.get("Authorization"));
  if (!accessToken) {
    return jsonResponse({ error: "Missing or invalid Authorization header." }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData?.user) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = authData.user.id;

  const today = new Date();
  const todayStr = formatDate(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  const { data: profileRow, error: profileFetchError } = await supabase
    .from("profiles")
    .select("streak_count,last_read_date")
    .eq("id", userId)
    .maybeSingle();

  if (profileFetchError) {
    return jsonResponse({ error: `profiles fetch failed: ${profileFetchError.message}` }, { status: 500 });
  }

  const currentStreak = profileRow?.streak_count ?? 0;
  const lastReadDate = profileRow?.last_read_date ?? null;

  let nextStreak = 1;
  if (lastReadDate === todayStr) {
    nextStreak = currentStreak || 1;
  } else if (lastReadDate === yesterdayStr) {
    nextStreak = currentStreak + 1;
  }

  const { error: profileUpsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        streak_count: nextStreak,
        last_read_date: todayStr,
      },
      { onConflict: "id" },
    );

  if (profileUpsertError) {
    return jsonResponse({ error: `profiles upsert failed: ${profileUpsertError.message}` }, { status: 500 });
  }

  const { data: petRow, error: petFetchError } = await supabase
    .from("pet_stats")
    .select("xp")
    .eq("user_id", userId)
    .maybeSingle();

  if (petFetchError) {
    return jsonResponse({ error: `pet_stats fetch failed: ${petFetchError.message}` }, { status: 500 });
  }

  const nextXp = (petRow?.xp ?? 0) + XP_PER_COMPLETION;
  const nextLevel = Math.floor(nextXp / 100) + 1;

  const primaryStage = calcStage(nextLevel, "hatchling");
  const fallbackStage = calcStage(nextLevel, "hatching");

  let { error: petUpsertError } = await supabase
    .from("pet_stats")
    .upsert(
      {
        user_id: userId,
        xp: nextXp,
        level: nextLevel,
        evolution_stage: primaryStage,
      },
      { onConflict: "user_id" },
    );

  if (petUpsertError && primaryStage !== fallbackStage) {
    const fallback = await supabase
      .from("pet_stats")
      .upsert(
        {
          user_id: userId,
          xp: nextXp,
          level: nextLevel,
          evolution_stage: fallbackStage,
        },
        { onConflict: "user_id" },
      );
    petUpsertError = fallback.error;
  }

  if (petUpsertError) {
    return jsonResponse({ error: `pet_stats upsert failed: ${petUpsertError.message}` }, { status: 500 });
  }

  return jsonResponse(
    {
      message: "Reading recorded! Chotuu is happy.",
      user_id: userId,
      xp_gained: XP_PER_COMPLETION,
    },
    { status: 200 },
  );
});
