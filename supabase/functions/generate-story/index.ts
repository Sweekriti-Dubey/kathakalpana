/// <reference path="../edge-runtime.d.ts" />
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
  use_sample_images?: boolean;
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
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STORY_IMAGES_BUCKET = Deno.env.get("STORY_IMAGES_BUCKET") ?? "story-images";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
const LEGACY_SKIP_IMAGE_GENERATION = Deno.env.get("SKIP_IMAGE_GENERATION") === "true";
const IMAGE_MODE = (
  Deno.env.get("IMAGE_MODE") ??
  (LEGACY_SKIP_IMAGE_GENERATION ? "sample" : "huggingface")
).toLowerCase();
const SAMPLE_IMAGES_BUCKET = Deno.env.get("SAMPLE_IMAGES_BUCKET") ?? "story-samples";
const SAMPLE_IMAGES_PREFIX = Deno.env.get("SAMPLE_IMAGES_PREFIX") ?? "cartoon";

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

function parseUserIdFromAuthorizationHeader(authorizationHeader: string): string {
  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : "";

  if (!token) return "public";

  try {
    const payload = token.split(".")[1];
    if (!payload) return "public";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized)) as { sub?: string };
    return decoded.sub ?? "public";
  } catch (_error) {
    return "public";
  }
}



function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSampleImageUrl(chapterIndex: number): string {
  
  const chapterNumber = ((chapterIndex % 10) + 1);
  const objectPath = `${SAMPLE_IMAGES_PREFIX}/chapter-${chapterNumber}.png`;
  return `${SUPABASE_URL}/storage/v1/object/public/${SAMPLE_IMAGES_BUCKET}/${objectPath}`;
}

async function generateImageHuggingFace(
  prompt: string,
  apiKey: string,
  seed: number,
  retries = 3,
): Promise<Uint8Array | null> {
  const hfUrl = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        hfUrl,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              seed,
              guidance_scale: 7.5,
              num_inference_steps: 30,
              negative_prompt: "scary, horror, gore, realistic violence, disturbing, dark"
            },
          }),
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

  if (!["sample", "huggingface"].includes(IMAGE_MODE)) {
    return jsonResponse(
      { error: "Invalid IMAGE_MODE. Use 'sample' or 'huggingface'." },
      { status: 500 },
    );
  }

  if (IMAGE_MODE === "huggingface" && !HUGGINGFACE_API_KEY) {
    return jsonResponse(
      { error: "Missing HUGGINGFACE_API_KEY. Use IMAGE_MODE=sample for testing without token usage." },
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

  const userId = parseUserIdFromAuthorizationHeader(req.headers.get("Authorization") ?? "");

  // Admin client is used for storage operations so generation does not depend on caller auth state.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY);

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
      "Children's storybook cartoon illustration, kid-safe, bright and joyful.",
      "Same protagonist identity in every chapter: same fur color, same eye color, same outfit, same art style.",
      "Soft lighting, rounded shapes, expressive faces, clean background composition.",
      "No horror, no violence, no realistic style.",
      `Character consistency seed: ${characterSeed}.`,
      basePrompt.slice(0, 240),
    ].join(" ");

    let imageUrl: string | null = null;
    let imageError: string | null = null;

    const useSample = payload.use_sample_images ?? (IMAGE_MODE === "sample");
    if (useSample) {
      imageUrl = getSampleImageUrl(i);
    } else {
      try {
        if (i > 0) {
          await sleep(IMAGE_GEN_DELAY_MS);
        }

        const chapterSeed = characterSeed + i;
        const imageBytes = await generateImageHuggingFace(imagePrompt, HUGGINGFACE_API_KEY!, chapterSeed);
        if (!imageBytes) {
          imageError = "No image returned by HuggingFace.";
        } else {
          const objectPath = `${userId}/story-${Date.now()}/chapter-${i + 1}.png`;

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
