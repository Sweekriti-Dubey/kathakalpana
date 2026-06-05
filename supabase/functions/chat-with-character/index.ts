/**
 * chat-with-character
 * 
 * An AI-powered endpoint that lets kids chat with a story's main character.
 * Uses Groq (Llama 3.3) to generate in-character responses.
 * 
 * Request body:
 *   character_name  – name of the story's protagonist
 *   story_title     – title of the story for context
 *   story_summary   – brief summary / moral for grounding
 *   messages        – array of { role: 'user' | 'assistant', content: string }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...init.headers,
    },
  });
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  character_name: string;
  story_title: string;
  story_summary: string;
  messages: ChatMessage[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  if (!GROQ_API_KEY) {
    return jsonResponse(
      { error: "Missing GROQ_API_KEY env variable." },
      { status: 500 }
    );
  }

  let payload: ChatRequest;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { character_name, story_title, story_summary, messages } = payload;

  if (!character_name || !story_title || !messages?.length) {
    return jsonResponse(
      { error: "character_name, story_title, and messages are required." },
      { status: 400 }
    );
  }

  // Build the system prompt to ground the AI in-character
  const systemPrompt = [
    `You are ${character_name}, the main character from the children's story "${story_title}".`,
    `Story summary/moral: ${story_summary || "A wonderful adventure story for children."}`,
    "",
    "RULES:",
    `- Stay FULLY in character as ${character_name} at all times.`,
    "- You are talking to a child who just finished reading your story.",
    "- Be friendly, warm, encouraging, and age-appropriate (ages 3-12).",
    "- Use simple vocabulary. Keep responses short (2-4 sentences max).",
    "- You can reference events from the story but don't make up new plot points.",
    "- If the child asks something unrelated to the story, gently steer back.",
    "- NEVER break character. NEVER say you are an AI or a language model.",
    "- Add a relevant emoji at the end of each response to make it fun.",
    "- If the child says something kind, respond warmly and encourage them to keep reading!",
  ].join("\n");

  // Build the conversation for Groq
  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: groqMessages,
          max_tokens: 200,
          temperature: 0.8,
        }),
      }
    );

    if (!groqResponse.ok) {
      const errorBody = await groqResponse.text();
      console.error("Groq error:", errorBody);
      return jsonResponse(
        { error: "AI response failed", details: errorBody },
        { status: 502 }
      );
    }

    const groqData = await groqResponse.json();
    const reply =
      groqData?.choices?.[0]?.message?.content?.trim() ||
      `Hi! I'm ${character_name}. What would you like to talk about? 😊`;

    return jsonResponse({ reply });
  } catch (err) {
    console.error("Chat with character error:", err);
    return jsonResponse(
      {
        error: "Failed to generate character response",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
});
