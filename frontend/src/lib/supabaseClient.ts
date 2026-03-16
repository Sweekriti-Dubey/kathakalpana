import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const readPublicEnv = (value: string | undefined) => value?.trim() || undefined;

export const frontendEnv = {
  supabaseUrl: readPublicEnv(import.meta.env.VITE_SUPABASE_URL as string | undefined),
  supabaseAnonKey: readPublicEnv(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined),
  supabaseFunctionsUrl: readPublicEnv(import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined),
};

export const missingFrontendEnvVars = [
  !frontendEnv.supabaseUrl ? 'VITE_SUPABASE_URL' : null,
  !frontendEnv.supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
  !frontendEnv.supabaseFunctionsUrl ? 'VITE_SUPABASE_FUNCTIONS_URL' : null,
].filter((value): value is string => Boolean(value));

export const isFrontendConfigured = missingFrontendEnvVars.length === 0;

export const missingFrontendEnvMessage = isFrontendConfigured
  ? ''
  : `Missing required frontend env vars: ${missingFrontendEnvVars.join(', ')}. In Vercel, add them in Project Settings > Environment Variables and redeploy.`;

let client: SupabaseClient | null = null;

if (frontendEnv.supabaseUrl && frontendEnv.supabaseAnonKey) {
  client = createClient(frontendEnv.supabaseUrl, frontendEnv.supabaseAnonKey);
} else {
  console.warn(missingFrontendEnvMessage || 'Missing required frontend env vars.');
}

export const supabase = client;

export function requireSupabaseClient(): SupabaseClient {
  if (!client) {
    throw new Error(missingFrontendEnvMessage || 'Supabase client is not configured.');
  }

  return client;
}
