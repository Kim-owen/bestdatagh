import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const listActiveBundles = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://vtdccqchhsbujknbpqku.supabase.co";
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_E4XDyGIYN5c0P3njR1Bqyg_1xif7qHN";

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
  const { data, error } = await supa.from("bundles").select("id,network,size_label,size_mb,price_ghs,validity,popular,sort_order").eq("active", true).order("network").order("sort_order");
  if (error) return [];
  return data ?? [];
});
