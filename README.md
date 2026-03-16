# Kathakalpana 📖✨

Kathakalpana is a Supabase-powered AI storytelling app for kids with auth, story generation, image generation, narration, library, and pet progression.

## Stack

- Frontend: React + Vite
- Auth/DB/Storage/Functions: Supabase
- AI text: Groq
- AI images: Gemini (Nano Banana)

## Supabase Functions

- `generate-story`
- `save-story`
- `my-stories`
- `complete-reading`
- `pet-status`
- `request-access`

## Frontend Env

Create `frontend/.env`:

```env
VITE_SUPABASE_FUNCTIONS_URL=https://<project-ref>.supabase.co/functions/v1
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## Vercel Deploy

Set the same three frontend env vars in Vercel Project Settings > Environment Variables for each environment you deploy to.

- `VITE_SUPABASE_FUNCTIONS_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Vercel does not expose browser env vars unless they are prefixed with `VITE_`, and changing them requires a redeploy.

## Supabase Secrets (Edge Functions)

Set in Supabase project secrets:

- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `STORY_IMAGES_BUCKET` (optional, default: `story-images`)

Optional access-request notifications:

- `ADMIN_EMAIL` (owner email auto-approved)
- `RESEND_API_KEY`
- `ACCESS_REQUEST_TO_EMAIL` (your inbox)
- `ACCESS_REQUEST_FROM_EMAIL` (verified sender in Resend)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `ACCESS_REQUEST_SMS_TO` (your phone)

## Local Run

```bash
cd frontend
npm install
npm run dev
```

## Storage

Create private bucket `story-images` and run SQL in [supabase/storage_policies.sql](supabase/storage_policies.sql).
For tables/RPC/RLS alignment with the current app code, run [supabase/schema_patch.sql](supabase/schema_patch.sql) in Supabase SQL Editor.