import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash, randomBytes } from "crypto";

function hashKey(k: string) { return createHash("sha256").update(k).digest("hex"); }

export const listMyApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("api_keys")
      .select("id,label,key_prefix,last_used_at,active,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createMyApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { label: string }) => {
    if (!d?.label || d.label.length < 2 || d.label.length > 60) throw new Error("Label 2-60 chars");
    return { label: d.label.trim() };
  })
  .handler(async ({ data, context }) => {
    const raw = "bd_live_" + randomBytes(24).toString("base64url");
    const prefix = raw.slice(0, 14);
    const key_hash = hashKey(raw);
    const { data: row, error } = await context.supabase
      .from("api_keys")
      .insert({ user_id: context.userId, label: data.label, key_prefix: prefix, key_hash })
      .select("id,label,key_prefix,active,created_at").single();
    if (error) throw new Error(error.message);
    return { ...row, key: raw };
  });

export const revokeMyApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("api_keys").update({ active: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
