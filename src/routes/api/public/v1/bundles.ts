import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "content-type": "application/json",
  };
}

export const Route = createFileRoute("/api/public/v1/bundles")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async () => {
        const url = process.env.SUPABASE_URL!;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supa = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
              h.set("apikey", key);
              return fetch(input as any, { ...init, headers: h });
            },
          },
        });
        const { data, error } = await supa.from("bundles")
          .select("id,network,size_label,size_mb,price_ghs,validity")
          .eq("active", true).order("network").order("sort_order");
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders() });
        return new Response(JSON.stringify({ data }), { headers: corsHeaders() });
      },
    },
  },
});
