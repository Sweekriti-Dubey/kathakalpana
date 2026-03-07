/// <reference types="vite/client" />

type ViteEnvString = string | undefined;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_FUNCTIONS_URL: ViteEnvString;
  readonly VITE_SUPABASE_URL: ViteEnvString;
  readonly VITE_SUPABASE_ANON_KEY: ViteEnvString;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
