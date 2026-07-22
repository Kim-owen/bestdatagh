import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const AGENT_DISCOUNT_PCT = 10;

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }, { data: app }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("agent_applications").select("*").eq("user_id", context.userId).maybeSingle(),
    ]);
    return {
      profile: profile ?? null,
      roles: (roles ?? []).map((r: any) => r.role),
      application: app ?? null,
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { display_name?: string; phone?: string }) => ({
    display_name: (d.display_name ?? "").toString().trim().slice(0, 80),
    phone: (d.phone ?? "").toString().trim().slice(0, 20),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.display_name || null, phone: data.phone || null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const applyForAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { full_name: string; phone: string; region: string; monthly_volume?: string; note?: string }) => ({
    full_name: d.full_name.trim().slice(0, 80),
    phone: d.phone.trim().slice(0, 20),
    region: d.region.trim().slice(0, 60),
    monthly_volume: (d.monthly_volume ?? "").toString().trim().slice(0, 40) || null,
    note: (d.note ?? "").toString().trim().slice(0, 500) || null,
  }))
  .handler(async ({ data, context }) => {
    if (!data.full_name || !data.phone || !data.region) throw new Error("Missing required fields");
    const { error } = await context.supabase
      .from("agent_applications")
      .upsert({ user_id: context.userId, ...data, status: "pending" }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
