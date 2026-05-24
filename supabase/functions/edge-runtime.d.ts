declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

declare module "npm:@supabase/supabase-js@2";
declare module "npm:@google/generative-ai@0.21.0";
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
declare module "https://deno.land/std@0.177.0/encoding/base64.ts" {
  export function encode(data: Uint8Array): string;
  export function decode(data: string): Uint8Array;
}
declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(url: string, key: string, options?: any): any;
}
