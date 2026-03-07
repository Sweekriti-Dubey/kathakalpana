declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

declare module "npm:@supabase/supabase-js@2";
declare module "npm:@google/generative-ai@0.21.0";
