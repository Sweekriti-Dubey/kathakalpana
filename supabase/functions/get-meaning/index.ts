import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!GROQ_API_KEY) {
      throw new Error("Missing GROQ_API_KEY");
    }

    const { word } = await req.json();

    if (!word || typeof word !== "string") {
      throw new Error("Invalid word provided");
    }

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a friendly dictionary for young children. Given a word in any language, provide a very short, simple, 1-2 sentence definition or translation in English. Output ONLY the definition and absolutely nothing else.",
          },
          { role: "user", content: `Define this word: ${word}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!groqResponse.ok) {
      throw new Error("Failed to fetch meaning from Groq");
    }

    const groqData = await groqResponse.json();
    const meaning = groqData.choices[0]?.message?.content?.trim() || "No meaning found.";

    return new Response(JSON.stringify({ meaning }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
