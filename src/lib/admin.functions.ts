import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [orders, users, reviews, bundles, paidOrders, keys, pendingWs, pendingApps, recent] = await Promise.all([
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("reviews").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("bundles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("orders").select("id, total_ghs, status, created_at, order_items(network, size_label)").in("status", ["paid", "delivered"]),
      supabaseAdmin.from("api_keys").select("id", { count: "exact", head: true }).eq("active", true),
      supabaseAdmin.from("withdrawals").select("id, amount_ghs").eq("status", "pending"),
      supabaseAdmin.from("agent_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("orders").select("id, reference, total_ghs, status, source, created_at, order_items(network, size_label, recipient_phone)").order("created_at", { ascending: false }).limit(10),
    ]);

    const paidList = paidOrders.data ?? [];
    const totalRevenue = paidList.reduce((s: number, r: any) => s + Number(r.total_ghs || 0), 0);

    const pendingWithdrawalCount = pendingWs.data?.length ?? 0;
    const pendingWithdrawalGhs = (pendingWs.data ?? []).reduce((s: number, w: any) => s + Number(w.amount_ghs || 0), 0);

    // Compute sales breakdown by network
    const networkBreakdown = { mtn: 0, telecel: 0, airteltigo: 0 };
    for (const o of paidList) {
      const item = (o.order_items && o.order_items[0]) || {};
      const netLower = (item.network || "").toLowerCase();
      const val = Number(o.total_ghs || 0);
      if (netLower.includes("telecel") || netLower.includes("vodafone")) {
        networkBreakdown.telecel += val;
      } else if (netLower.includes("airtel") || netLower.includes("ishare") || netLower.includes("bigtime")) {
        networkBreakdown.airteltigo += val;
      } else {
        networkBreakdown.mtn += val;
      }
    }

    return {
      orders: orders.count ?? 0,
      users: users.count ?? 0,
      reviews: reviews.count ?? 0,
      bundles: bundles.count ?? 0,
      apiKeys: keys.count ?? 0,
      revenue: Number(totalRevenue.toFixed(2)),
      pendingWithdrawalsCount: pendingWithdrawalCount,
      pendingWithdrawalsGhs: Number(pendingWithdrawalGhs.toFixed(2)),
      pendingAgentAppsCount: pendingApps.count ?? 0,
      networkBreakdown: {
        mtn: Number(networkBreakdown.mtn.toFixed(2)),
        telecel: Number(networkBreakdown.telecel.toFixed(2)),
        airteltigo: Number(networkBreakdown.airteltigo.toFixed(2)),
      },
      recentOrders: recent.data ?? [],
    };
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => {
    if (!["pending","processing","delivered","failed","refunded"].includes(d.status)) throw new Error("Bad status");
    return { id: String(d.id), status: d.status };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    return (profiles ?? []).map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role) }));
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin"|"agent"|"user"; grant: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    }
    return { ok: true };
  });

export const adminListBundles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("bundles").select("*").order("network").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      network: data.network, size_label: data.size_label, size_mb: Number(data.size_mb),
      price_ghs: Number(data.price_ghs), validity: data.validity || "90 days",
      popular: !!data.popular, active: data.active !== false, sort_order: Number(data.sort_order ?? 100),
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("bundles").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("bundles").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("bundles").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("reviews").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("reviews").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminListApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("api_keys").select("id,user_id,label,key_prefix,active,last_used_at,created_at").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListAgentApps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("agent_applications").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminDecideAgentApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; approve: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: app, error } = await supabaseAdmin.from("agent_applications").select("user_id").eq("id", data.id).maybeSingle();
    if (error || !app) throw new Error(error?.message || "Not found");
    await supabaseAdmin.from("agent_applications").update({ status: data.approve ? "approved" : "rejected" }).eq("id", data.id);
    if (data.approve) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: app.user_id, role: "agent" }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", app.user_id).eq("role", "agent");
    }
    return { ok: true };
  });
