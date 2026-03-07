import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StoryRequest = {
  genre: string;
  chapters: number;
  character_seed?: number;
};

type StoryChapter = {
  title: string;
  content: string;
  image_prompt?: string;
  image_seed?: number;
  image_url?: string | null;
  image_error?: string | null;
};

type StoryResponse = {
  title: string;
  moral: string;
  chapters: StoryChapter[];
  character_seed: number;
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const STORY_IMAGES_BUCKET = Deno.env.get("STORY_IMAGES_BUCKET") ?? "story-images";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
const SKIP_IMAGE_GENERATION = Deno.env.get("SKIP_IMAGE_GENERATION") === "true";
const HF_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";
const IMAGE_GEN_DELAY_MS = 2000;

const systemPrompt = [
  "You are a Pixar movie director and a children story author.",
  "Write engaging, detailed stories for children with rich descriptions.",
  "Each chapter should be AT LEAST 200-300 words with vivid details and dialogue.",
  "Output valid JSON only.",
  "CONSISTENCY RULE: describe characters exactly the same way every time.",
  "MANDATORY JSON STRUCTURE:",
  '{"title":"...","moral":"...","chapters":[{"title":"...","content":"...","image_prompt":"..."}]}'
].join("\n");

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...init.headers },
  });
}

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80",
  "https://images.unsplash.com/photo-1534361960057-19889db9621e?w=800&q=80",
  "https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=800&q=80",
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&q=80",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateImageHuggingFace(
  prompt: string,
  apiKey: string,
  retries = 3,
): Promise<Uint8Array | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${HF_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: prompt }),
        },
      );

      if (response.status === 503) {
        const delay = Math.min(5000 * (attempt + 1), 15000);
        await sleep(delay);
        continue;
      }

      if (response.status === 429) {
        const delay = Math.min(10000 * (attempt + 1), 30000);
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      if (attempt === retries - 1) {
        throw error;
      }
      await sleep(2000);
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  if (!GROQ_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse(
      { error: "Missing required environment variables." },
      { status: 500 },
    );
  }

  if (!SKIP_IMAGE_GENERATION && !HUGGINGFACE_API_KEY) {
    return jsonResponse(
      { error: "Missing HUGGINGFACE_API_KEY. Set SKIP_IMAGE_GENERATION=true for testing without images." },
      { status: 500 },
    );
  }

  let payload: StoryRequest;
  try {
    payload = await req.json();
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload?.genre || !payload?.chapters) {
    return jsonResponse({ error: "genre and chapters are required." }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const characterSeed = payload.character_seed ?? Math.floor(Math.random() * 90000) + 10000;

  const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Write a ${payload.genre} story with ${payload.chapters} chapters. Make each chapter detailed and engaging with at least 200-300 words. Include vivid descriptions, dialogue, and emotions.`,
        },
      ],
    }),
  });

  if (!groqResponse.ok) {
    const errorBody = await groqResponse.text();
    return jsonResponse(
      { error: "Groq request failed", details: errorBody },
      { status: 502 },
    );
  }

  const groqData = await groqResponse.json();
  let story: StoryResponse;
  try {
    story = JSON.parse(groqData?.choices?.[0]?.message?.content ?? "{}") as StoryResponse;
  } catch (_error) {
    return jsonResponse({ error: "Invalid Groq JSON response" }, { status: 502 });
  }

  if (!story?.title || !story?.moral || !Array.isArray(story?.chapters)) {
    return jsonResponse({ error: "Groq response missing story fields" }, { status: 502 });
  }

  const chapters: StoryChapter[] = [];

  for (let i = 0; i < story.chapters.length; i += 1) {
    const chapter = story.chapters[i] ?? { title: "", content: "" };
    const basePrompt = chapter.image_prompt ?? `${chapter.title}. ${chapter.content}`;
    const imagePrompt = [
      "Pixar-style, child-friendly, colorful illustration.",
      "Highly detailed, vibrant colors, magical atmosphere.",
      "Keep the main character identical across all images.",
      basePrompt.slice(0, 200),
    ].join(" ");

    let imageUrl: string | null = null;
    let imageError: string | null = null;

    if (SKIP_IMAGE_GENERATION) {
      imageUrl = PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length];
    } else {
      try {
        if (i > 0) {
          await sleep(IMAGE_GEN_DELAY_MS);
        }

        const imageBytes = await generateImageHuggingFace(imagePrompt, HUGGINGFACE_API_KEY!);
        if (!imageBytes) {
          imageError = "No image returned by HuggingFace.";
        } else {
          const objectPath = `${authData.user.id}/story-${Date.now()}/chapter-${i + 1}.png`;

          const uploadResult = await supabase.storage
            .from(STORY_IMAGES_BUCKET)
            .upload(objectPath, imageBytes, {
              contentType: "image/png",
              upsert: true,
            });

          if (uploadResult.error) {
            imageError = uploadResult.error.message;
          } else {
            const signed = await supabase.storage
              .from(STORY_IMAGES_BUCKET)
              .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

            if (signed.error || !signed.data?.signedUrl) {
              imageError = signed.error?.message ?? "Failed to create signed URL.";
            } else {
              imageUrl = signed.data.signedUrl;
            }
          }
        }
      } catch (error) {
        imageError = error instanceof Error ? error.message : "Image generation failed.";
      }
    }

    chapters.push({
      title: chapter.title,
      content: chapter.content,
      image_prompt: chapter.image_prompt ?? basePrompt,
      image_seed: characterSeed,
      image_url: imageUrl,
      image_error: imageError,
    });
  }

  const response: StoryResponse = {
    title: story.title,
    moral: story.moral,
    chapters,
    character_seed: characterSeed,
  };

  return jsonResponse(response, { status: 200 });
});
