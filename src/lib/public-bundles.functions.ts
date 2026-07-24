import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

let cachedBundles: any[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export function clearBundleCache() {
  cachedBundles = null;
  cacheTime = 0;
}

export const listActiveBundles = createServerFn({ method: "GET" }).handler(async () => {
  const now = Date.now();
  if (cachedBundles && now - cacheTime < CACHE_TTL_MS) {
    return cachedBundles;
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://vtdccqchhsbujknbpqku.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGNjcWNoaHNidWprbmJwcWt1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc1MzI0NCwiZXhwIjoyMTAwMzI5MjQ0fQ._5MtVAhM-4RmuIKPrSETGv227ZfPJFGkYi7roju7z-o";

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
  const { data, error } = await supa
    .from("bundles")
    .select("id,network,size_label,size_mb,price_ghs,agent_price_ghs,validity,popular,sort_order")
    .eq("active", true)
    .order("network")
    .order("sort_order");

  if (error) {
    return cachedBundles ?? [];
  }

  cachedBundles = data ?? [];
  cacheTime = Date.now();
  return cachedBundles;
});
