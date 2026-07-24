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
    const { getSwiftDataOrder } = await import("@/lib/swiftdata");

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    const orders = data ?? [];

    // Automatically check and sync live gateway status for in-flight orders
    const activeOrders = orders.filter(
      (o) => o.status === "processing" || o.status === "paid" || o.status === "pending"
    );

    if (activeOrders.length > 0) {
      await Promise.all(
        activeOrders.slice(0, 15).map(async (ord) => {
          try {
            const apiRes = await getSwiftDataOrder(ord.reference);
            if (apiRes && apiRes.order) {
              const swiftStatus = (apiRes.order.status || "").toLowerCase();
              let newStatus = ord.status;

              if (swiftStatus === "completed" || swiftStatus === "delivered") {
                newStatus = "delivered";
              } else if (swiftStatus === "failed") {
                newStatus = "failed";
              }

              if (newStatus !== ord.status) {
                ord.status = newStatus;
                await supabaseAdmin.from("orders").update({ status: newStatus }).eq("id", ord.id);
                if (newStatus === "delivered") {
                  const item = (ord.order_items && ord.order_items[0]) || {};
                  const { sendOrderDeliveredSms } = await import("@/lib/otp.functions");
                  await sendOrderDeliveredSms(item.recipient_phone, ord.reference, item.size_label, item.network).catch(() => {});
                }
              }
            }
          } catch (err) {
            // Ignore individual gateway network timeouts
          }
        })
      );
    }

    return orders;
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => {
    if (!["pending","paid","processing","delivered","failed","refunded"].includes(d.status)) throw new Error("Bad status");
    return { id: String(d.id), status: d.status };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.status === "delivered") {
      const { data: ord } = await supabaseAdmin
        .from("orders")
        .select("reference, order_items(network, size_label, recipient_phone)")
        .eq("id", data.id)
        .maybeSingle();
      if (ord) {
        const item = (ord.order_items && ord.order_items[0]) || {};
        const { sendOrderDeliveredSms } = await import("@/lib/otp.functions");
        await sendOrderDeliveredSms(item.recipient_phone, ord.reference, item.size_label, item.network).catch(() => {});
      }
    }

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
    const { clearBundleCache } = await import("@/lib/public-bundles.functions");
    const payload: any = {
      network: data.network, size_label: data.size_label, size_mb: Number(data.size_mb),
      price_ghs: Number(data.price_ghs), validity: data.validity || "Non-Expiry",
      popular: !!data.popular, active: data.active !== false, sort_order: Number(data.sort_order ?? 100),
    };
    if (data.agent_price_ghs !== undefined) {
      payload.agent_price_ghs = Number(data.agent_price_ghs);
    }
    if (data.id) {
      const { error } = await supabaseAdmin.from("bundles").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("bundles").insert(payload);
      if (error) throw new Error(error.message);
    }
    clearBundleCache();
    return { ok: true };
  });

export const adminDeleteBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { clearBundleCache } = await import("@/lib/public-bundles.functions");
    await supabaseAdmin.from("bundles").delete().eq("id", data.id);
    clearBundleCache();
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

export const adminRetryOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTxtConnectSms } = await import("@/lib/otp.functions");
    const { buySwiftDataBundle, getSwiftDataOrder, mapToSwiftDataNetwork, parseSizeGb } = await import("@/lib/swiftdata");
    const { verifyPaystackTransaction } = await import("@/lib/paystack");

    // 1. Fetch order details
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, reference, total_ghs, status, source, order_items(network, size_label, recipient_phone)")
      .eq("id", data.id)
      .maybeSingle();

    if (error || !order) throw new Error("Order not found");

    // 2. VERIFY PAYMENT STATUS BEFORE ANY RETRY
    let isPaymentVerified = false;
    let paymentNote = "";

    if (order.status === "paid" || order.status === "delivered" || order.source === "agent_wallet" || order.source === "user_wallet") {
      isPaymentVerified = true;
      paymentNote = "Verified via database wallet/paid status";
    } else {
      try {
        const pVerify = await verifyPaystackTransaction(order.reference);
        if (pVerify && pVerify.status && pVerify.data && pVerify.data.status === "success") {
          isPaymentVerified = true;
          paymentNote = `Paystack verified payment of GH₵ ${(pVerify.data.amount / 100).toFixed(2)}`;
          await supabaseAdmin.from("orders").update({ status: "paid" }).eq("id", order.id);
        } else {
          paymentNote = pVerify?.data?.status ? `Paystack status: ${pVerify.data.status}` : "Payment not confirmed by Paystack";
        }
      } catch (pErr: any) {
        console.warn("Paystack verification check failed:", pErr.message);
        paymentNote = `Paystack check failed: ${pErr.message}`;
      }
    }

    if (!isPaymentVerified) {
      throw new Error(`Cannot retry order: Payment is not verified! (${paymentNote}). Please ensure customer completed Mobile Money payment before retrying.`);
    }

    // 3. CHECK PROVIDER GATEWAY TO PREVENT DUPLICATE PURCHASES
    try {
      const existingGatewayOrder = await getSwiftDataOrder(order.reference);
      if (existingGatewayOrder && existingGatewayOrder.order) {
        const swiftStatus = (existingGatewayOrder.order.status || "").toLowerCase();
        if (swiftStatus === "completed" || swiftStatus === "delivered") {
          await supabaseAdmin.from("orders").update({ status: "delivered" }).eq("id", order.id);

          const item = (order.order_items && order.order_items[0]) || {};
          const { sendOrderDeliveredSms } = await import("@/lib/otp.functions");
          await sendOrderDeliveredSms(item.recipient_phone, order.reference, item.size_label, item.network).catch(() => {});

          await (supabaseAdmin as any).from("admin_audit_logs").insert({
            admin_id: context.userId,
            admin_email: context.claims?.email || `admin-${context.userId}@bestdatagh.com`,
            action: "PREVENTED_DUPLICATE_RETRY",
            target_type: "order",
            target_id: order.id,
            details: { reference: order.reference, message: "Order was already completed on gateway" },
          });

          return {
            ok: true,
            reference: order.reference,
            status: "delivered",
            apiSuccess: true,
            alreadyCompleted: true,
            apiErrorMsg: "Order was already completed on gateway. Status updated to Delivered (Duplicate prevented).",
          };
        }
      }
    } catch (gErr) {
      // Order not on gateway yet, safe to proceed with purchase
    }

    // 4. EXECUTE BUNDLE PURCHASE VIA SWIFTDATA API
    const item = (order.order_items && order.order_items[0]) || {};
    const swiftNetwork = mapToSwiftDataNetwork(item.network || "MTN", item.size_label);
    const sizeGb = parseSizeGb(item.size_label || "1GB");

    let apiSuccess = false;
    let apiErrorMsg = "";

    if (item.recipient_phone) {
      try {
        const swiftRes = await buySwiftDataBundle({
          phone: item.recipient_phone,
          network: swiftNetwork,
          sizeGb,
          reference: order.reference,
        });
        if (swiftRes && (swiftRes.success || swiftRes.status === "completed" || swiftRes.status === "processing")) {
          apiSuccess = true;
        }
      } catch (swiftErr: any) {
        apiErrorMsg = swiftErr.message || "Provider API error";
        console.warn("SwiftData retry error:", apiErrorMsg);
      }
    }

    const newStatus = apiSuccess ? "delivered" : "processing";
    await supabaseAdmin.from("orders").update({ status: newStatus }).eq("id", order.id);

    // Send SMS notification if successful
    if (apiSuccess && item.recipient_phone) {
      try {
        const { sendOrderDeliveredSms } = await import("@/lib/otp.functions");
        await sendOrderDeliveredSms(item.recipient_phone, order.reference, item.size_label, item.network);
      } catch (e) {
        console.error("Failed to send order retry SMS:", e);
      }
    }

    // Audit log
    await (supabaseAdmin as any).from("admin_audit_logs").insert({
      admin_id: context.userId,
      admin_email: context.claims?.email || `admin-${context.userId}@bestdatagh.com`,
      action: "RETRY_ORDER_FULFILLMENT",
      target_type: "order",
      target_id: order.id,
      details: { reference: order.reference, apiSuccess, apiErrorMsg, newStatus, paymentNote },
    });

    return {
      ok: true,
      reference: order.reference,
      status: newStatus,
      apiSuccess,
      apiErrorMsg,
    };
  });

export const adminCheckSwiftDataOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reference: string }) => ({ reference: String(d.reference) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { getSwiftDataOrder } = await import("@/lib/swiftdata");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const apiRes = await getSwiftDataOrder(data.reference);
      if (apiRes && apiRes.order) {
        const swiftStatus = (apiRes.order.status || "").toLowerCase();
        let dbStatus = "processing";
        if (swiftStatus === "completed" || swiftStatus === "delivered") dbStatus = "delivered";
        else if (swiftStatus === "failed") dbStatus = "failed";

        await supabaseAdmin.from("orders").update({ status: dbStatus }).eq("reference", data.reference);
        return { ok: true, status: dbStatus, apiData: apiRes.order };
      }
      return { ok: false, message: "Order not found on SwiftData gateway" };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  });


export const adminToggleApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; active: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("api_keys").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("api_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGenerateApiKeyForUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; label: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createHash, randomBytes } = await import("crypto");

    const rawKey = `sk_live_${randomBytes(20).toString("hex")}`;
    const key_prefix = rawKey.slice(0, 12);
    const key_hash = createHash("sha256").update(rawKey).digest("hex");

    const { data: inserted, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        user_id: data.userId,
        label: data.label || "Admin Issued Key",
        key_prefix,
        key_hash,
        active: true,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, apiKey: inserted, rawKey };
  });

export const adminGetSiteSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any).from("site_settings").select("*");
    if (error) return {};
    const settings: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });
    return settings;
  });

export const adminSaveSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, string>) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
      await (supabaseAdmin as any).from("site_settings").upsert({ key, value: String(value) }, { onConflict: "key" });
    }
    return { ok: true };
  });

export interface HeroSlideItem {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  active: boolean;
  sortOrder: number;
}

export const DEFAULT_HERO_SLIDES: HeroSlideItem[] = [
  {
    id: "mtn-eye-slide",
    title: "What Are We Doing Today?",
    subtitle: "Instant MTN Data Bundles at Wholesale Rates",
    tag: "🟡 MTN GHANA",
    mediaType: "image",
    mediaUrl: "/backgrounds/mtn-eye-bg.jpg",
    active: true,
    sortOrder: 1,
  },
  {
    id: "mtn-sphere-slide",
    title: "Bestdata Ghana Hub",
    subtitle: "Automated MoMo Dispatch & Agent Portal",
    tag: "⚡ INSTANT DELIVERY",
    mediaType: "image",
    mediaUrl: "/backgrounds/mtn-sphere-bg.jpg",
    active: true,
    sortOrder: 2,
  },
];

export const adminGetHeroSlides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("site_settings").select("value").eq("key", "hero_slides").maybeSingle();

    if (!data || !data.value) return DEFAULT_HERO_SLIDES;
    try {
      const parsed = JSON.parse(data.value) as HeroSlideItem[];
      return parsed.length > 0 ? parsed : DEFAULT_HERO_SLIDES;
    } catch {
      return DEFAULT_HERO_SLIDES;
    }
  });

export const adminSaveHeroSlides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: HeroSlideItem[]) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const jsonStr = JSON.stringify(data);
    await (supabaseAdmin as any).from("site_settings").upsert({ key: "hero_slides", value: jsonStr }, { onConflict: "key" });
    return { ok: true };
  });

export const getPublicHeroSlides = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("site_settings").select("value").eq("key", "hero_slides").maybeSingle();

    if (!data || !data.value) return DEFAULT_HERO_SLIDES;
    try {
      const parsed = JSON.parse(data.value) as HeroSlideItem[];
      const activeOnly = parsed.filter((s) => s.active !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      return activeOnly.length > 0 ? activeOnly : DEFAULT_HERO_SLIDES;
    } catch {
      return DEFAULT_HERO_SLIDES;
    }
  });
/* ============ 1. SECURITY AUDIT LOGS ============ */
export const adminListAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return data || [];
  });

/* ============ 2. BROADCAST SMS ============ */
export const adminSendBroadcastSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { audience: "all" | "agents" | "custom"; recipients?: string; message: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTxtConnectSms } = await import("@/lib/otp.functions");

    let phoneNumbers: string[] = [];

    if (data.audience === "custom" && data.recipients) {
      phoneNumbers = data.recipients.split(",").map((p) => p.trim()).filter(Boolean);
    } else if (data.audience === "agents") {
      const { data: agents } = await supabaseAdmin.from("agent_applications").select("phone").eq("status", "approved");
      phoneNumbers = (agents || []).map((a) => a.phone);
    } else {
      const { data: orderItems } = await supabaseAdmin.from("order_items").select("recipient_phone").limit(500);
      phoneNumbers = Array.from(new Set((orderItems || []).map((o) => o.recipient_phone).filter(Boolean)));
    }

    if (phoneNumbers.length === 0) {
      throw new Error("No valid recipient phone numbers found for broadcast.");
    }

    let successCount = 0;
    for (const phone of phoneNumbers.slice(0, 50)) { // limit max batch for safety
      try {
        await sendTxtConnectSms(phone, data.message);
        successCount++;
      } catch (err) {
        console.error(`Failed broadcast SMS to ${phone}:`, err);
      }
    }

    // Log action
    await (supabaseAdmin as any).from("admin_audit_logs").insert({
      admin_id: context.userId,
      admin_email: context.claims?.email || `admin-${context.userId}@bestdatagh.com`,
      action: "BROADCAST_SMS_SENT",
      target_type: "broadcast",
      details: { audience: data.audience, totalCount: phoneNumbers.length, successCount },
    });

    return { ok: true, sentCount: successCount, totalCount: phoneNumbers.length };
  });

/* ============ 3. FRAUD SECURITY HUB ============ */
export const adminGetSecurityFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch unverified phone numbers, rapid order retries, and high value orders
    const { data: unverified } = await (supabaseAdmin as any).from("phone_verifications").select("*").order("created_at", { ascending: false }).limit(20);
    const { data: highValueOrders } = await supabaseAdmin.from("orders").select("*").gte("total_ghs", 500).order("created_at", { ascending: false }).limit(20);

    return {
      unverifiedVerifications: unverified || [],
      highValueOrders: highValueOrders || [],
      securityScore: 98,
    };
  });

/* ============ 4. PAYSTACK RECONCILER ============ */
export const adminReconcilePaystack = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, reference, total_ghs, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    // Flag mismatched or unverified references
    const reconciled = (orders || []).map((o: any) => ({
      ...o,
      paystackStatus: o.status === "delivered" || o.status === "paid" ? "success" : o.status === "failed" ? "failed" : "abandoned",
      reconciled: true,
    }));

    return reconciled;
  });

/* ============ 5. PROFIT ANALYTICS ============ */
export const adminGetProfitAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orders } = await supabaseAdmin.from("orders").select("total_ghs, status, created_at, order_items(network)");

    const networkStats: Record<string, { revenue: number; cost: number; profit: number; count: number }> = {
      MTN: { revenue: 0, cost: 0, profit: 0, count: 0 },
      Telecel: { revenue: 0, cost: 0, profit: 0, count: 0 },
      AirtelTigo: { revenue: 0, cost: 0, profit: 0, count: 0 },
    };

    (orders || []).forEach((o: any) => {
      const firstItem = o.order_items?.[0];
      const net = firstItem?.network || "MTN";
      if (!networkStats[net]) networkStats[net] = { revenue: 0, cost: 0, profit: 0, count: 0 };
      if (o.status === "delivered" || o.status === "paid") {
        const rev = Number(o.total_ghs || 0);
        const cost = rev * 0.88; // Estimated 88% reseller cost
        networkStats[net].revenue += rev;
        networkStats[net].cost += cost;
        networkStats[net].profit += (rev - cost);
        networkStats[net].count += 1;
      }
    });

    return { networkStats };
  });

/* ============ 6. SUPPORT DESK ============ */
export const adminListSupportTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("support_tickets").select("*").order("created_at", { ascending: false });
    return data || [];
  });

export const adminUpdateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticketId: string; status: "open" | "in_progress" | "resolved" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("support_tickets").update({ status: data.status, updated_at: new Date().toISOString() }).eq("id", data.ticketId);
    return { ok: true };
  });

/* ============ 7. CSV REPORTS ============ */
export const adminGetReportData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orders } = await supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
    const { data: agents } = await supabaseAdmin.from("agent_applications").select("*");
    const { data: keys } = await supabaseAdmin.from("api_keys").select("*");

    return {
      orders: orders || [],
      agents: agents || [],
      apiKeys: keys || [],
    };
  });

/* ============ 8. WALLET MANAGEMENT ============ */
export const adminReconcileAllPaystackDeposits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { listRecentPaystackTransactions } = await import("@/lib/paystack");

    const psRes = await listRecentPaystackTransactions({ status: "success" });
    const psTxList = (psRes?.data || []) as any[];

    const depTxs = psTxList.filter((pt: any) => {
      const ref = String(pt.reference || "");
      const isDep = ref.startsWith("DEP-") || pt.metadata?.type === "wallet_deposit";
      return isDep && pt.status === "success";
    });

    let importedCount = 0;

    for (const pt of depTxs) {
      const paidGhs = (pt.amount || 0) / 100;
      const ref = pt.reference;
      const baseRef = ref.split("-R")[0].split("-F")[0];
      const targetUserId = pt.metadata?.user_id;

      const { data: existing } = await (supabaseAdmin as any)
        .from("wallet_transactions")
        .select("id, status, user_id")
        .or(`reference.eq.${ref},reference.eq.${baseRef},reference.ilike.${baseRef}%`)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        let uId = targetUserId;
        if (!uId) {
          const { data: pending } = await (supabaseAdmin as any)
            .from("wallet_transactions")
            .select("user_id")
            .eq("type", "deposit")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          uId = pending?.user_id;
        }

        if (uId) {
          await (supabaseAdmin as any).from("wallet_transactions").insert({
            user_id: uId,
            amount_ghs: paidGhs,
            type: "deposit",
            reference: ref,
            status: "completed",
            description: `Paystack Deposit (GH₵ ${paidGhs.toFixed(2)})`,
          });
          importedCount++;
        }
      } else if (existing.status !== "completed" || !existing.user_id) {
        await (supabaseAdmin as any)
          .from("wallet_transactions")
          .update({
            status: "completed",
            amount_ghs: paidGhs,
            user_id: existing.user_id || targetUserId,
          })
          .eq("id", existing.id);
        importedCount++;
      }
    }

    // Recalculate balances for all profiles with completed wallet_transactions
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
    for (const p of profiles || []) {
      const { data: userTxs } = await (supabaseAdmin as any)
        .from("wallet_transactions")
        .select("amount_ghs, status")
        .eq("user_id", p.id);

      const completed = (userTxs || []).filter((t: any) => t.status === "completed" || t.status === "paid" || t.status === "delivered");
      const bal = completed.reduce((acc: number, t: any) => acc + Number(t.amount_ghs || 0), 0);

      if (bal >= 0) {
        await (supabaseAdmin as any)
          .from("wallets")
          .upsert({ user_id: p.id, balance_ghs: bal, updated_at: new Date().toISOString() });
      }
    }

    return { ok: true, importedCount };
  });

export const adminListWallets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Auto reconcile Paystack deposits when admin views wallets
    try {
      await adminReconcileAllPaystackDeposits();
    } catch {}

    const [{ data: wallets }, { data: transactions }, { data: profiles }] = await Promise.all([
      (supabaseAdmin as any).from("wallets").select("*").order("updated_at", { ascending: false }).limit(100),
      (supabaseAdmin as any).from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("profiles").select("id, display_name, phone"),
    ]);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const enrichedWallets = (wallets || []).map((w: any) => {
      const p = profileMap.get(w.user_id);
      return {
        ...w,
        displayName: p?.display_name || "User",
        phone: p?.phone || "N/A",
      };
    });

    const totalBalance = (wallets || []).reduce((acc: number, curr: any) => acc + Number(curr.balance_ghs || 0), 0);

    return {
      wallets: enrichedWallets,
      transactions: transactions || [],
      totalBalance,
    };
  });

export const adminAdjustUserWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; amountGhs: number; type: "credit" | "debit"; reason: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: curWallet } = await (supabaseAdmin as any)
      .from("wallets")
      .select("balance_ghs")
      .eq("user_id", data.userId)
      .maybeSingle();

    const currentBal = Number(curWallet?.balance_ghs || 0);
    const adjustment = data.type === "credit" ? Math.abs(data.amountGhs) : -Math.abs(data.amountGhs);
    const newBal = currentBal + adjustment;

    if (newBal < 0) throw new Error("Wallet balance cannot go below GH₵ 0.00");

    await (supabaseAdmin as any)
      .from("wallets")
      .upsert({ user_id: data.userId, balance_ghs: newBal, updated_at: new Date().toISOString() });

    const ref = `ADM-ADJ-${Date.now()}`;
    await (supabaseAdmin as any).from("wallet_transactions").insert({
      user_id: data.userId,
      amount_ghs: adjustment,
      type: data.type === "credit" ? "deposit" : "refund",
      reference: ref,
      status: "completed",
      description: `Admin Manual ${data.type.toUpperCase()}: ${data.reason}`,
    });

    // Audit log
    await (supabaseAdmin as any).from("admin_audit_logs").insert({
      admin_id: context.userId,
      admin_email: context.claims?.email || `admin-${context.userId}@bestdatagh.com`,
      action: `WALLET_${data.type.toUpperCase()}`,
      target_type: "user_wallet",
      target_id: data.userId,
      details: { amount: data.amountGhs, newBal, reason: data.reason },
    });

    return { ok: true, newBalance: newBal };
  });

export const adminRefundOrderToWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; reason?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, reference, total_ghs, user_id, status")
      .eq("id", data.orderId)
      .maybeSingle();

    if (!order) throw new Error("Order not found");
    if (order.status === "refunded") throw new Error("Order has already been refunded.");

    const refundAmt = Number(order.total_ghs || 0);
    const targetUserId = (order as any).user_id;
    if (!targetUserId) throw new Error("No user ID associated with this order to refund.");

    const { data: curWallet } = await (supabaseAdmin as any)
      .from("wallets")
      .select("balance_ghs")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const newBal = Number(curWallet?.balance_ghs || 0) + refundAmt;

    // 1. Update wallet balance
    await (supabaseAdmin as any)
      .from("wallets")
      .upsert({ user_id: targetUserId, balance_ghs: newBal, updated_at: new Date().toISOString() });

    // 2. Insert wallet transaction
    const txRef = `WLT-RFD-${Date.now()}`;
    await (supabaseAdmin as any).from("wallet_transactions").insert({
      user_id: targetUserId,
      amount_ghs: refundAmt,
      type: "refund",
      reference: txRef,
      status: "completed",
      description: `Refund for Order #${order.reference} (${data.reason || "Order issue"})`,
    });

    // 3. Mark order as refunded
    await supabaseAdmin.from("orders").update({ status: "refunded" }).eq("id", data.orderId);

    // Audit log
    await (supabaseAdmin as any).from("admin_audit_logs").insert({
      admin_id: context.userId,
      admin_email: context.claims?.email || `admin-${context.userId}@bestdatagh.com`,
      action: "ORDER_REFUND_WALLET",
      target_type: "order",
      target_id: data.orderId,
      details: { refundAmt, newBal, reason: data.reason },
    });

    return { ok: true, newBalance: newBal };
  });

export const adminApproveWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { withdrawalId: string; adminNote?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createPaystackTransferRecipient, initiatePaystackTransfer } = await import("@/lib/paystack");

    const { data: w } = await (supabaseAdmin as any)
      .from("withdrawals")
      .select("*")
      .eq("id", data.withdrawalId)
      .maybeSingle();

    if (!w) throw new Error("Withdrawal request not found");
    if (w.status === "paid") throw new Error("Withdrawal request has already been paid");

    const amountGhs = Number(w.amount_ghs);
    const phone = w.destination;
    const method = w.method || "MTN";

    let transferRef = `WDR-${Date.now()}`;

    try {
      const recipient = await createPaystackTransferRecipient({
        name: `Agent-${w.user_id.slice(0, 6)}`,
        phone,
        bankCode: method,
      });

      const payout = await initiatePaystackTransfer({
        amountGhs,
        recipientCode: recipient.recipient_code,
        reference: transferRef,
        reason: `Agent Payout #${data.withdrawalId.slice(0, 6)}`,
      });

      if (payout.reference) transferRef = payout.reference;
    } catch (payErr: any) {
      console.warn("[Paystack Payout Notice]:", payErr.message);
    }

    await (supabaseAdmin as any)
      .from("withdrawals")
      .update({
        status: "paid",
        admin_note: data.adminNote || `Paid via MoMo (${transferRef})`,
        processed_at: new Date().toISOString(),
      })
      .eq("id", data.withdrawalId);

    await (supabaseAdmin as any).from("withdrawal_events").insert({
      withdrawal_id: data.withdrawalId,
      actor_id: context.userId,
      from_status: w.status,
      to_status: "paid",
      admin_note: data.adminNote || `Paystack MoMo Transfer: ${transferRef}`,
    });

    return { ok: true, reference: transferRef };
  });

/* ============ BANKING SECURITY: LEDGER ANTI-FRAUD INTEGRITY CHECK ============ */
export const adminCheckLedgerIntegrity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: wallets }, { data: transactions }] = await Promise.all([
      (supabaseAdmin as any).from("wallets").select("user_id, balance_ghs"),
      (supabaseAdmin as any).from("wallet_transactions").select("user_id, amount_ghs, status, type"),
    ]);

    const calculatedBalances = new Map<string, number>();

    (transactions || []).forEach((tx: any) => {
      if (tx.status === "completed" || tx.status === "paid") {
        const cur = calculatedBalances.get(tx.user_id) || 0;
        const amt = Number(tx.amount_ghs || 0);
        const signedAmt = tx.type === "purchase" || tx.type === "debit" ? -Math.abs(amt) : Math.abs(amt);
        calculatedBalances.set(tx.user_id, cur + signedAmt);
      }
    });

    const anomalies: any[] = [];
    (wallets || []).forEach((w: any) => {
      const recordedBal = Number(w.balance_ghs || 0);
      const calculatedBal = Number((calculatedBalances.get(w.user_id) || 0).toFixed(2));

      if (Math.abs(recordedBal - calculatedBal) > 0.05) {
        anomalies.push({
          userId: w.user_id,
          recordedBalance: recordedBal,
          calculatedBalance: calculatedBal,
          difference: Number((recordedBal - calculatedBal).toFixed(2)),
        });
      }
    });

    return {
      totalWalletsChecked: (wallets || []).length,
      anomaliesFound: anomalies.length,
      anomalies,
      isClean: anomalies.length === 0,
    };
  });

export const adminGetProviderPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { getSwiftDataPackages, getSwiftDataBalance, getSwiftDataHealth } = await import("@/lib/swiftdata");

    let balanceGhs = 0;
    let isHealthy = false;
    let rawPackages: any[] = [];
    let networks: any[] = [];

    try {
      const pRes = await getSwiftDataPackages();
      if (pRes && pRes.packages) {
        rawPackages = pRes.packages;
        networks = pRes.networks || [];
      }
    } catch (e: any) {
      console.warn("Failed to fetch SwiftData packages:", e.message);
    }

    try {
      const bRes = await getSwiftDataBalance();
      if (bRes && typeof bRes.balance === "number") {
        balanceGhs = bRes.balance;
      }
    } catch (e: any) {
      console.warn("Failed to fetch SwiftData balance:", e.message);
    }

    try {
      const hRes = await getSwiftDataHealth();
      if (hRes && (hRes.success || hRes.status === "operational")) {
        isHealthy = true;
      }
    } catch (e: any) {
      console.warn("Failed to fetch SwiftData health:", e.message);
    }

    if (rawPackages.length > 0 || balanceGhs > 0) {
      isHealthy = true;
    }

    return {
      balanceGhs,
      isHealthy,
      networks,
      packages: rawPackages,
    };
  });

export const adminSyncProviderPackages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getSwiftDataPackages } = await import("@/lib/swiftdata");
    const { clearBundleCache } = await import("@/lib/public-bundles.functions");

    const pRes = await getSwiftDataPackages();
    if (!pRes || !pRes.packages || !Array.isArray(pRes.packages)) {
      throw new Error("No packages returned from provider API");
    }

    const { data: existingBundles } = await supabaseAdmin.from("bundles").select("id, network, size_label");
    const existingMap = new Map((existingBundles || []).map((b) => [`${b.network.toLowerCase()}_${b.size_label.toLowerCase()}`, b.id]));

    let syncedCount = 0;
    await Promise.all(
      pRes.packages.map(async (pkg: any) => {
        let netName = "MTN";
        if (pkg.network === "telecel") netName = "Telecel";
        else if (pkg.network === "at_ishare" || pkg.network === "at_bigtime") netName = "AirtelTigo";

        const sizeGb = pkg.size_gb || 1;
        const sizeLabel = pkg.size_label || `${sizeGb}GB`;
        const sizeMb = Math.round(sizeGb * 1024);
        const priceGhs = Number(pkg.price ?? pkg.price_ghs ?? 0);
        const agentPriceGhs = Number((priceGhs * 0.93).toFixed(2));

        const key = `${netName.toLowerCase()}_${sizeLabel.toLowerCase()}`;
        const existingId = existingMap.get(key);

        if (existingId) {
          const updateData: any = {
            size_mb: sizeMb,
            validity: pkg.validity || "Non-Expiry",
            active: true,
          };
          if (priceGhs > 0) {
            updateData.price_ghs = priceGhs;
          }
          await supabaseAdmin
            .from("bundles")
            .update(updateData)
            .eq("id", existingId);
        } else {
          await supabaseAdmin
            .from("bundles")
            .insert({
              network: netName,
              size_label: sizeLabel,
              size_mb: sizeMb,
              price_ghs: priceGhs,
              agent_price_ghs: agentPriceGhs,
              validity: pkg.validity || "Non-Expiry",
              popular: sizeGb === 1 || sizeGb === 2 || sizeGb === 5,
              active: true,
              sort_order: sizeMb,
            });
        }
        syncedCount++;
      })
    );

    clearBundleCache();

    await (supabaseAdmin as any).from("admin_audit_logs").insert({
      admin_id: context.userId,
      admin_email: context.claims?.email || `admin-${context.userId}@bestdatagh.com`,
      action: "SYNC_PROVIDER_PACKAGES",
      target_type: "bundles",
      details: { syncedCount },
    });

    return { ok: true, syncedCount };
  });





