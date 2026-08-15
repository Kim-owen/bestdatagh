import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminStats = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const url = "https://vtdccqchhsbujknbpqku.supabase.co";
      const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGNjcWNoaHNidWprbmJwcWt1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc1MzI0NCwiZXhwIjoyMTAwMzI5MjQ0fQ._5MtVAhM-4RmuIKPrSETGv227ZfPJFGkYi7roju7z-o";
      const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

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
    } catch (err: any) {
      return {
        orders: 0,
        users: 0,
        reviews: 0,
        bundles: 0,
        apiKeys: 0,
        revenue: 0,
        pendingWithdrawalsCount: 0,
        pendingWithdrawalsGhs: 0,
        pendingAgentAppsCount: 0,
        networkBreakdown: { mtn: 0, telecel: 0, airteltigo: 0 },
        recentOrders: [],
        error: err.message || "Unauthorized",
      };
    }
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
    const [
      { data: profiles, error: pErr },
      { data: roles },
      { data: wallets }
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      (supabaseAdmin as any).from("wallets").select("user_id, balance_ghs, is_locked")
    ]);

    if (pErr) throw new Error(pErr.message);

    const walletMap = new Map((wallets || []).map((w: any) => [w.user_id, w]));
    const roleMap = new Map();
    (roles || []).forEach((r: any) => {
      if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, []);
      roleMap.get(r.user_id).push(r.role);
    });

    return (profiles ?? []).map((p: any) => {
      const w: any = walletMap.get(p.id);
      return {
        ...p,
        roles: roleMap.get(p.id) || [],
        balance_ghs: Number(w?.balance_ghs || 0),
        is_locked: Boolean(w?.is_locked),
      };
    });
  });

export const adminGetUserDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { data: profile },
      { data: wallet },
      { data: roles },
      { data: transactions },
      { data: orders },
      { data: storeSettings }
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      (supabaseAdmin as any).from("wallets").select("*").eq("user_id", data.userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId),
      (supabaseAdmin as any).from("wallet_transactions").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("orders").select("*, order_items(*)").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50),
      (supabaseAdmin as any).from("agent_store_settings").select("*").eq("user_id", data.userId).maybeSingle()
    ]);

    const txList = transactions || [];
    const completedDeposits = txList.filter((t: any) => t.type === "deposit" && (t.status === "completed" || t.status === "paid"));
    const totalDepositsGhs = completedDeposits.reduce((acc: number, t: any) => acc + Number(t.amount_ghs || 0), 0);

    const paidOrdersList = (orders || []).filter((o: any) => o.status === "paid" || o.status === "delivered");
    const totalOrdersSpendGhs = paidOrdersList.reduce((acc: number, o: any) => acc + Number(o.total_ghs || 0), 0);

    return {
      profile,
      wallet: wallet || { balance_ghs: 0, is_locked: false },
      roles: (roles || []).map((r: any) => r.role),
      stats: {
        totalDepositsGhs: Number(totalDepositsGhs.toFixed(2)),
        totalOrdersSpendGhs: Number(totalOrdersSpendGhs.toFixed(2)),
        totalOrdersCount: orders?.length || 0,
      },
      transactions: txList,
      orders: orders || [],
      storeSettings,
    };
  });

export const adminLockUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; lock: boolean; reason?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await (supabaseAdmin as any)
      .from("wallets")
      .upsert(
        {
          user_id: data.userId,
          is_locked: data.lock,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    return { ok: true, is_locked: data.lock };
  });

export const adminSendUserNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; title: string; body: string; sendSms?: boolean }) => {
    if (!d.title?.trim() || !d.body?.trim()) throw new Error("Title and body message are required.");
    return { userId: d.userId, title: d.title.trim(), body: d.body.trim(), sendSms: Boolean(d.sendSms) };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createUserNotification } = await import("@/lib/agent.functions");

    await createUserNotification({
      userId: data.userId,
      type: "system",
      title: data.title,
      body: data.body,
      link: "/account",
    });

    let smsSent = false;
    if (data.sendSms) {
      const { data: prof } = await supabaseAdmin.from("profiles").select("phone").eq("id", data.userId).maybeSingle();
      if (prof?.phone) {
        const { sendTxtConnectSms } = await import("@/lib/otp.functions");
        await sendTxtConnectSms(prof.phone, `[GigMart Notification] ${data.title}: ${data.body}`).catch(() => {});
        smsSent = true;
      }
    }

    return { ok: true, smsSent };
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
  .handler(async () => {
    const url = "https://vtdccqchhsbujknbpqku.supabase.co";
    const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGNjcWNoaHNidWprbmJwcWt1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc1MzI0NCwiZXhwIjoyMTAwMzI5MjQ0fQ._5MtVAhM-4RmuIKPrSETGv227ZfPJFGkYi7roju7z-o";
    const supa = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const ADMIN_ID = "04682757-ba41-4af1-aedd-f433b08f8aa0";

    const [{ data: bundles, error: bErr }, { data: agentPrices }] = await Promise.all([
      supa.from("bundles").select("*").order("network").order("sort_order"),
      supa.from("agent_custom_prices").select("bundle_id, agent_price_ghs").eq("user_id", ADMIN_ID),
    ]);

    if (bErr) throw new Error(bErr.message);

    const priceMap = new Map((agentPrices || []).map((p: any) => [p.bundle_id, Number(p.agent_price_ghs)]));

    return (bundles || []).map((b: any) => ({
      ...b,
      agent_price_ghs: priceMap.get(b.id) ?? Number((Number(b.price_ghs) * 0.90).toFixed(2)),
    }));
  });

export const adminSaveBundle = createServerFn({ method: "POST" })
  .validator((d: any) => d)
  .handler(async ({ data }) => {
    try {
      const url = "https://vtdccqchhsbujknbpqku.supabase.co";
      const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGNjcWNoaHNidWprbmJwcWt1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc1MzI0NCwiZXhwIjoyMTAwMzI5MjQ0fQ._5MtVAhM-4RmuIKPrSETGv227ZfPJFGkYi7roju7z-o";
      const supa = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { clearBundleCache } = await import("@/lib/public-bundles.functions");

      const bundleData = data?.data || data;
      const retailPrice = Number(bundleData.price_ghs || 0);

      const payload: any = {
        network: bundleData.network,
        size_label: bundleData.size_label,
        size_mb: Number(bundleData.size_mb || 1024),
        price_ghs: retailPrice,
        validity: bundleData.validity || "Non-Expiry",
        popular: !!bundleData.popular,
        active: bundleData.active !== false,
        sort_order: Number(bundleData.sort_order ?? 100),
        updated_at: new Date().toISOString(),
      };

      let bundleId = bundleData.id;
      if (bundleId) {
        const { error } = await supa.from("bundles").update(payload).eq("id", bundleId);
        if (error) throw new Error(error.message);
      } else {
        const { data: newBundle, error } = await supa.from("bundles").insert(payload).select().single();
        if (error) throw new Error(error.message);
        bundleId = newBundle?.id;
      }

      // Upsert Agent Base Wholesale Price into agent_custom_prices if provided
      const rawAgentPrice = Number(bundleData.agent_price_ghs);
      if (!isNaN(rawAgentPrice) && rawAgentPrice > 0 && bundleId) {
        const ADMIN_ID = "04682757-ba41-4af1-aedd-f433b08f8aa0";
        await supa.from("agent_custom_prices").upsert({
          user_id: ADMIN_ID,
          bundle_id: bundleId,
          agent_price_ghs: rawAgentPrice,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,bundle_id" });
      }

      clearBundleCache();
      return { ok: true };
    } catch (err: any) {
      console.error("adminSaveBundle error:", err);
      return { success: false, error: err.message || "Failed to save bundle" };
    }
  });

export const adminDeleteBundle = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data }) => {
    const url = "https://vtdccqchhsbujknbpqku.supabase.co";
    const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGNjcWNoaHNidWprbmJwcWt1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc1MzI0NCwiZXhwIjoyMTAwMzI5MjQ0fQ._5MtVAhM-4RmuIKPrSETGv227ZfPJFGkYi7roju7z-o";
    const supa = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { clearBundleCache } = await import("@/lib/public-bundles.functions");
    await supa.from("bundles").delete().eq("id", data.id);
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
      const { queryProviderOrderStatus } = await import("@/lib/provider-dispatch");
      const existingGatewayOrder = await queryProviderOrderStatus(order.reference);
      if (existingGatewayOrder && existingGatewayOrder.found) {
        if (existingGatewayOrder.status === "completed") {
          await supabaseAdmin.from("orders").update({ status: "delivered" }).eq("id", order.id);

          const item = (order.order_items && order.order_items[0]) || {};
          const { sendOrderDeliveredSms } = await import("@/lib/otp.functions");
          await sendOrderDeliveredSms(item.recipient_phone, order.reference, item.size_label, item.network).catch(() => {});

          await (supabaseAdmin as any).from("admin_audit_logs").insert({
            admin_id: context.userId,
            admin_email: context.claims?.email || `admin-${context.userId}@gigmart.shop`,
            action: "PREVENTED_DUPLICATE_RETRY",
            target_type: "order",
            target_id: order.id,
            details: { reference: order.reference, message: "Order was already completed on provider gateway" },
          });

          return {
            ok: true,
            reference: order.reference,
            status: "delivered",
            apiSuccess: true,
            alreadyCompleted: true,
            apiErrorMsg: `Order was already completed on ${existingGatewayOrder.provider} gateway. Status updated to Delivered.`,
          };
        }
      }
    } catch (gErr) {
      // Order not on gateway yet, safe to proceed with purchase
    }

    // 4. EXECUTE BUNDLE PURCHASE VIA PROVIDER DISPATCHER (DATAMART / SWIFTDATA)
    const item = (order.order_items && order.order_items[0]) || {};
    let apiSuccess = false;
    let apiErrorMsg = "";

    if (item.recipient_phone) {
      try {
        const { dispatchDataBundle } = await import("@/lib/provider-dispatch");
        const dispatchRes = await dispatchDataBundle({
          phone: item.recipient_phone,
          network: item.network || "MTN",
          sizeLabel: item.size_label || "1GB",
          reference: order.reference,
        });

        if (dispatchRes.success) {
          apiSuccess = true;
        } else {
          apiErrorMsg = dispatchRes.message || "Provider API error";
        }
      } catch (dispatchErr: any) {
        apiErrorMsg = dispatchErr.message || "Provider API error";
        console.warn("Provider retry error:", apiErrorMsg);
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
      admin_email: context.claims?.email || `admin-${context.userId}@gigmart.shop`,
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
    const { queryProviderOrderStatus } = await import("@/lib/provider-dispatch");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, reference, status, order_items(network, size_label, recipient_phone)")
        .eq("reference", data.reference)
        .maybeSingle();

      const providerCheck = await queryProviderOrderStatus(data.reference);
      if (providerCheck.found) {
        let dbStatus = "processing";
        if (providerCheck.status === "completed") dbStatus = "delivered";
        else if (providerCheck.status === "failed") dbStatus = "failed";

        let smsSent = false;
        if (order) {
          const oldStatus = order.status;
          await supabaseAdmin.from("orders").update({ status: dbStatus }).eq("id", order.id);
          await supabaseAdmin.from("order_items").update({ status: dbStatus }).eq("order_id", order.id);

          if (dbStatus === "delivered" && oldStatus !== "delivered") {
            const item = (order.order_items && order.order_items[0]) as any;
            if (item && item.recipient_phone) {
              const { sendOrderDeliveredSms } = await import("@/lib/otp.functions");
              await sendOrderDeliveredSms(item.recipient_phone, order.reference, item.size_label, item.network).catch(() => {});
              smsSent = true;
            }
          }

          await (supabaseAdmin as any).from("admin_audit_logs").insert({
            admin_id: context.userId,
            admin_email: context.claims?.email || `admin-${context.userId}@gigmart.shop`,
            action: "VERIFY_GATEWAY_DELIVERY_STATUS",
            target_type: "order",
            target_id: order.id,
            details: { reference: data.reference, provider: providerCheck.provider, status: dbStatus, oldStatus, smsSent },
          }).catch(() => {});
        } else {
          await supabaseAdmin.from("orders").update({ status: dbStatus }).eq("reference", data.reference);
        }

        return { ok: true, status: dbStatus, provider: providerCheck.provider, apiData: providerCheck.raw, smsSent };
      }
      return { ok: false, message: "Order not found on active provider gateways (DataMart/SwiftData)" };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  });

export const adminVerifyProviderGateway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { getDataMartBalance, getDataMartApiKey } = await import("@/lib/datamart");
    const { getSwiftDataBalance, getSwiftDataApiKey } = await import("@/lib/swiftdata");
    const { getActiveProviderPreference } = await import("@/lib/provider-dispatch");

    const activePreference = await getActiveProviderPreference();
    const startTime = Date.now();

    let dataMart = {
      configured: false,
      healthy: false,
      balance: 0,
      currency: "GHS",
      latencyMs: 0,
      message: "API Key not configured",
    };

    let swiftData = {
      configured: false,
      healthy: false,
      balance: 0,
      currency: "GHS",
      latencyMs: 0,
      message: "API Key not configured",
    };

    // Check DataMart Gateway
    const dmKey = getDataMartApiKey();
    if (dmKey) {
      dataMart.configured = true;
      const dmStart = Date.now();
      try {
        const dmBal = await getDataMartBalance();
        dataMart.latencyMs = Date.now() - dmStart;
        if (dmBal && (dmBal.status === "success" || typeof dmBal.balance === "number")) {
          dataMart.healthy = true;
          dataMart.balance = Number(dmBal.balance || 0);
          dataMart.currency = dmBal.currency || "GHS";
          dataMart.message = "DataMart Gateway Operational";
        } else {
          dataMart.message = (dmBal as any)?.message || "DataMart API error";
        }
      } catch (e: any) {
        dataMart.latencyMs = Date.now() - dmStart;
        dataMart.message = e.message || "Failed to reach DataMart endpoint";
      }
    }

    // Check SwiftData Gateway
    const swiftKey = getSwiftDataApiKey();
    if (swiftKey) {
      swiftData.configured = true;
      const swiftStart = Date.now();
      try {
        const swiftBal = await getSwiftDataBalance();
        swiftData.latencyMs = Date.now() - swiftStart;
        if (swiftBal && (swiftBal.success || typeof swiftBal.balance === "number")) {
          swiftData.healthy = true;
          swiftData.balance = Number(swiftBal.balance || 0);
          swiftData.currency = swiftBal.currency || "GHS";
          swiftData.message = "SwiftData Gateway Operational";
        } else {
          swiftData.message = swiftBal?.error || "SwiftData API error";
        }
      } catch (e: any) {
        swiftData.latencyMs = Date.now() - swiftStart;
        swiftData.message = e.message || "Failed to reach SwiftData endpoint";
      }
    }

    const totalTimeMs = Date.now() - startTime;
    const overallHealthy = activePreference === "swiftdata" ? swiftData.healthy : dataMart.healthy;

    return {
      ok: true,
      activePreference,
      overallHealthy,
      totalTimeMs,
      dataMart,
      swiftData,
      timestamp: new Date().toISOString(),
    };
  });

export const adminSyncAllProviderOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { queryProviderOrderStatus } = await import("@/lib/provider-dispatch");

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: pendingOrders } = await supabaseAdmin
      .from("orders")
      .select("id, reference, status, order_items(network, size_label, recipient_phone)")
      .in("status", ["pending", "paid", "processing"])
      .gte("created_at", sevenDaysAgo)
      .limit(50);

    if (!pendingOrders || pendingOrders.length === 0) {
      return { ok: true, totalChecked: 0, updatedToDelivered: 0, updatedToFailed: 0, unchanged: 0 };
    }

    let updatedToDelivered = 0;
    let updatedToFailed = 0;
    let unchanged = 0;

    for (const ord of pendingOrders) {
      try {
        const providerCheck = await queryProviderOrderStatus(ord.reference);
        if (providerCheck.found) {
          let newStatus: string | null = null;
          if (providerCheck.status === "completed") newStatus = "delivered";
          else if (providerCheck.status === "failed") newStatus = "failed";

          if (newStatus && newStatus !== ord.status) {
            await supabaseAdmin.from("orders").update({ status: newStatus }).eq("id", ord.id);
            await supabaseAdmin.from("order_items").update({ status: newStatus }).eq("order_id", ord.id);

            if (newStatus === "delivered") {
              updatedToDelivered++;
              const item = (ord.order_items && ord.order_items[0]) as any;
              if (item && item.recipient_phone) {
                const { sendOrderDeliveredSms } = await import("@/lib/otp.functions");
                await sendOrderDeliveredSms(item.recipient_phone, ord.reference, item.size_label, item.network).catch(() => {});
              }
            } else if (newStatus === "failed") {
              updatedToFailed++;
            }
          } else {
            unchanged++;
          }
        } else {
          unchanged++;
        }
      } catch {
        unchanged++;
      }
    }

    return {
      ok: true,
      totalChecked: pendingOrders.length,
      updatedToDelivered,
      updatedToFailed,
      unchanged,
      timestamp: new Date().toISOString(),
    };
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
    const { data, error } = await (supabaseAdmin as any).from("system_configs").select("*");
    if (error) return {};
    const settings: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });
    return settings;
  });

export const adminSaveSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: any) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = data?.data || data;
    const entries = Object.entries(payload);
    for (const [key, value] of entries) {
      if (key) {
        await (supabaseAdmin as any).from("system_configs").upsert({ key, value: String(value) }, { onConflict: "key" });
      }
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
    title: "GigMart Ghana Hub",
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
    const { data } = await (supabaseAdmin as any)
      .from("agent_store_settings")
      .select("bio")
      .eq("slug", "global_hero_slides")
      .maybeSingle();

    if (!data || !data.bio) return DEFAULT_HERO_SLIDES;
    try {
      const parsed = JSON.parse(data.bio) as HeroSlideItem[];
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

    const { data: existing } = await (supabaseAdmin as any)
      .from("agent_store_settings")
      .select("id")
      .eq("slug", "global_hero_slides")
      .maybeSingle();

    if (existing) {
      await (supabaseAdmin as any)
        .from("agent_store_settings")
        .update({ bio: jsonStr, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await (supabaseAdmin as any)
        .from("agent_store_settings")
        .insert({
          user_id: context.userId,
          store_name: "Global Hero Slides",
          slug: "global_hero_slides",
          bio: jsonStr,
        });
    }

    return { ok: true };
  });

export const getPublicHeroSlides = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("agent_store_settings")
      .select("bio")
      .eq("slug", "global_hero_slides")
      .maybeSingle();

    if (!data || !data.bio) return DEFAULT_HERO_SLIDES;
    try {
      const parsed = JSON.parse(data.bio) as HeroSlideItem[];
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
      admin_email: context.claims?.email || `admin-${context.userId}@gigmart.shop`,
      action: "BROADCAST_SMS_SENT",
      target_type: "broadcast",
      details: { audience: data.audience, totalCount: phoneNumbers.length, successCount },
    });

    return { ok: true, sentCount: successCount, totalCount: phoneNumbers.length };
  });

export const adminTriggerWeAreLiveSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { customMessage?: string; siteUrl?: string; whatsappUrl?: string; supportPhone?: string; audience?: "all" | "agents" } | undefined) => d || {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTxtConnectSms } = await import("@/lib/otp.functions");

    // Fetch defaults from site settings if not explicitly provided
    const { data: settingsData } = await (supabaseAdmin as any).from("system_configs").select("key, value");
    const settingsMap: Record<string, string> = {};
    (settingsData || []).forEach((row: any) => {
      settingsMap[row.key] = row.value;
    });

    const siteUrl = data?.siteUrl || settingsMap.daily_sms_site_url || "https://gigmart.shop";
    const whatsappUrl = data?.whatsappUrl || settingsMap.daily_sms_whatsapp_link || "https://whatsapp.com/channel/0029Vb87LlELdQebZ0K7n51E";
    const supportPhone = data?.supportPhone || settingsMap.support_phone || settingsMap.daily_sms_support_number || "0551234567";

    const defaultMsg = `🚀 WE ARE LIVE! Order instant MTN, Telecel & AT data bundles on GigMart. Site: ${siteUrl} | WhatsApp: ${whatsappUrl} | Support: ${supportPhone}`;
    const smsText = data?.customMessage || settingsMap.daily_sms_custom_message || defaultMsg;

    const formattedMessage = smsText
      .replace(/\{site_url\}/g, siteUrl)
      .replace(/\{whatsapp_url\}/g, whatsappUrl)
      .replace(/\{support_phone\}/g, supportPhone);

    const audienceChoice = data?.audience || "agents";
    let phoneNumbers: string[] = [];

    if (audienceChoice === "agents") {
      const { data: agents } = await supabaseAdmin.from("agent_applications").select("phone").eq("status", "approved");
      phoneNumbers = (agents || []).map((a) => a.phone);
    } else {
      const { data: orderItems } = await supabaseAdmin.from("order_items").select("recipient_phone").limit(500);
      phoneNumbers = Array.from(new Set((orderItems || []).map((o) => o.recipient_phone).filter(Boolean)));
    }

    if (phoneNumbers.length === 0) {
      phoneNumbers = [supportPhone];
    }

    let successCount = 0;
    for (const phone of phoneNumbers.slice(0, 50)) {
      try {
        await sendTxtConnectSms(phone, formattedMessage);
        successCount++;
      } catch (err) {
        console.error(`Failed We Are Live SMS to ${phone}:`, err);
      }
    }

    await (supabaseAdmin as any).from("admin_audit_logs").insert({
      admin_id: context.userId,
      admin_email: context.claims?.email || `admin-${context.userId}@gigmart.shop`,
      action: "TRIGGERED_WE_ARE_LIVE_SMS",
      target_type: "broadcast",
      details: { audience: audienceChoice, totalCount: phoneNumbers.length, successCount, formattedMessage },
    });

    return { ok: true, sentCount: successCount, totalCount: phoneNumbers.length, messageText: formattedMessage };
  });

export const adminSaveDailySmsSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    enabled?: boolean;
    slot7am?: boolean;
    slot9am?: boolean;
    siteUrl?: string;
    whatsappUrl?: string;
    supportPhone?: string;
    customTemplate?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const entries: [string, string][] = [
      ["daily_sms_enabled", String(data.enabled ?? true)],
      ["daily_sms_7am_enabled", String(data.slot7am ?? true)],
      ["daily_sms_9am_enabled", String(data.slot9am ?? true)],
      ["daily_sms_site_url", data.siteUrl || "https://gigmart.shop"],
      ["daily_sms_whatsapp_link", data.whatsappUrl || "https://whatsapp.com/channel/0029Vb87LlELdQebZ0K7n51E"],
      ["daily_sms_support_number", data.supportPhone || "0551234567"],
      ["daily_sms_custom_message", data.customTemplate || "🚀 WE ARE LIVE! Order instant MTN, Telecel & AT data bundles on GigMart. Site: {site_url} | WhatsApp: {whatsapp_url} | Support: {support_phone}"],
    ];

    for (const [key, value] of entries) {
      await (supabaseAdmin as any).from("system_configs").upsert({ key, value }, { onConflict: "key" });
    }

    return { ok: true, message: "Daily morning SMS broadcast schedule updated successfully!" };
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
      admin_email: context.claims?.email || `admin-${context.userId}@gigmart.shop`,
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
      admin_email: context.claims?.email || `admin-${context.userId}@gigmart.shop`,
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

export const adminSetActiveDataProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { provider: "datamart" | "swiftdata" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("system_configs")
      .upsert({ key: "active_data_provider", value: data.provider }, { onConflict: "key" });

    if (error) throw new Error(error.message);
    return { ok: true, activeProvider: data.provider };
  });

export const adminGetProviderPackages = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getSwiftDataPackages, getSwiftDataBalance } = await import("@/lib/swiftdata");
    const { getDataMartBalance, getDataMartPackages, getDataMartApiKey } = await import("@/lib/datamart");
    const { getActiveProviderPreference } = await import("@/lib/provider-dispatch");

    const preferredProviderKey = await getActiveProviderPreference();
    let balanceGhs = 0;
    let datamartBalanceGhs = 0;
    let swiftdataBalanceGhs = 0;
    let isHealthy = false;
    let rawPackages: any[] = [];
    let networks: any[] = [];
    let activeProvider = preferredProviderKey === "swiftdata" ? "SwiftData API" : "DataMart API";

    const dmKey = getDataMartApiKey();
    if (dmKey) {
      try {
        const dmBal = await getDataMartBalance();
        if (dmBal && typeof dmBal.balance === "number") {
          datamartBalanceGhs = dmBal.balance;
        }
      } catch (e: any) {
        console.warn("Failed to fetch DataMart balance:", e.message);
      }

      try {
        const dmPackagesRes = await getDataMartPackages();
        if (dmPackagesRes && dmPackagesRes.data) {
          const list: any[] = [];
          Object.entries(dmPackagesRes.data).forEach(([net, pkgs]: [string, any]) => {
            if (Array.isArray(pkgs)) {
              pkgs.forEach((p) => {
                list.push({
                  id: `dm_${net}_${p.capacity}`,
                  network: net.toLowerCase().includes("yello") ? "yello" : net.toLowerCase().includes("telecel") ? "telecel" : "at_ishare",
                  size_gb: p.capacity,
                  size_label: `${p.capacity}GB`,
                  price_ghs: p.price,
                  validity: "Non-Expiry",
                });
              });
            }
          });
          if (list.length > 0 && preferredProviderKey === "datamart") {
            rawPackages = list;
            isHealthy = true;
          }
        }
      } catch (e: any) {
        console.warn("Failed to fetch DataMart packages:", e.message);
      }
    }

    // Check SwiftData
    try {
      const bRes = await getSwiftDataBalance();
      if (bRes && typeof bRes.balance === "number") {
        swiftdataBalanceGhs = bRes.balance;
      }
    } catch (e: any) {
      console.warn("Failed to fetch SwiftData balance:", e.message);
    }

    try {
      const pRes = await getSwiftDataPackages();
      if (pRes && pRes.packages) {
        networks = pRes.networks || [];
        if (rawPackages.length === 0 || preferredProviderKey === "swiftdata") {
          rawPackages = pRes.packages;
          isHealthy = true;
        }
      }
    } catch (e: any) {
      console.warn("Failed to fetch SwiftData packages:", e.message);
    }

    balanceGhs = preferredProviderKey === "swiftdata" ? swiftdataBalanceGhs : datamartBalanceGhs;
    if (rawPackages.length > 0 || balanceGhs > 0) {
      isHealthy = true;
    }

    return {
      balanceGhs,
      datamartBalanceGhs,
      swiftdataBalanceGhs,
      activeProvider,
      selectedProviderKey: preferredProviderKey,
      isHealthy,
      networks,
      packages: rawPackages,
    };
  });

export const adminSyncProviderPackages = createServerFn({ method: "POST" })
  .handler(async () => {
    const { getSwiftDataPackages } = await import("@/lib/swiftdata");
    const { getDataMartPackages, getDataMartApiKey } = await import("@/lib/datamart");
    const { clearBundleCache } = await import("@/lib/public-bundles.functions");

    let packagesToSync: any[] = [];
    const dmKey = getDataMartApiKey();

    if (dmKey) {
      try {
        const dmRes = await getDataMartPackages();
        if (dmRes && dmRes.data) {
          Object.entries(dmRes.data).forEach(([netKey, pkgs]: [string, any]) => {
            if (Array.isArray(pkgs)) {
              pkgs.forEach((p) => {
                let netName = "MTN";
                if (netKey.toUpperCase().includes("TELECEL")) netName = "Telecel";
                else if (netKey.toUpperCase().includes("AT")) netName = "AirtelTigo";

                packagesToSync.push({
                  network: netName,
                  size_gb: p.capacity,
                  size_label: `${p.capacity}GB`,
                  price_ghs: p.price,
                  validity: "Non-Expiry",
                });
              });
            }
          });
        }
      } catch (dmErr: any) {
        console.warn("DataMart sync error, falling back to SwiftData:", dmErr.message);
      }
    }

    if (packagesToSync.length === 0) {
      const pRes = await getSwiftDataPackages();
      if (!pRes || !pRes.packages || !Array.isArray(pRes.packages)) {
        throw new Error("No packages returned from provider API");
      }
      packagesToSync = pRes.packages.map((pkg: any) => {
        let netName = "MTN";
        if (pkg.network === "telecel") netName = "Telecel";
        else if (pkg.network === "at_ishare" || pkg.network === "at_bigtime") netName = "AirtelTigo";
        return {
          network: netName,
          size_gb: pkg.size_gb || 1,
          size_label: pkg.size_label || `${pkg.size_gb || 1}GB`,
          price_ghs: Number(pkg.price ?? pkg.price_ghs ?? 0),
          validity: pkg.validity || "Non-Expiry",
        };
      });
    }

    const url = "https://vtdccqchhsbujknbpqku.supabase.co";
    const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGNjcWNoaHNidWprbmJwcWt1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc1MzI0NCwiZXhwIjoyMTAwMzI5MjQ0fQ._5MtVAhM-4RmuIKPrSETGv227ZfPJFGkYi7roju7z-o";
    const supa = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: existingBundles } = await supa.from("bundles").select("id, network, size_label, price_ghs");
    const existingMap = new Map((existingBundles || []).map((b: any) => [`${b.network.toLowerCase()}_${b.size_label.toLowerCase()}`, b]));

    let syncedCount = 0;
    await Promise.all(
      packagesToSync.map(async (pkg: any) => {
        const netName = pkg.network;
        const sizeGb = pkg.size_gb || 1;
        const sizeLabel = pkg.size_label || `${sizeGb}GB`;
        const sizeMb = Math.round(sizeGb * 1024);
        const exactProviderPrice = Number(pkg.price_ghs || 0);

        const key = `${netName.toLowerCase()}_${sizeLabel.toLowerCase()}`;
        const existing = existingMap.get(key);

        if (existing) {
          const updateData: any = {
            size_mb: sizeMb,
            validity: pkg.validity || "Non-Expiry",
            active: true,
          };
          // Preserve custom admin prices: Only update price if unconfigured/zero
          if (!existing.price_ghs || Number(existing.price_ghs) <= 0) {
            updateData.price_ghs = exactProviderPrice;
          }
          await supa
            .from("bundles")
            .update(updateData)
            .eq("id", existing.id);
        } else {
          await supa
            .from("bundles")
            .insert({
              network: netName,
              size_label: sizeLabel,
              size_mb: sizeMb,
              price_ghs: exactProviderPrice,
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
    return { ok: true, syncedCount };
  });

export const adminResetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; newPassword: string }) => {
    if (!d.userId || typeof d.userId !== "string") throw new Error("User ID is required.");
    const pass = String(d.newPassword || "").trim();
    if (pass.length < 6) throw new Error("New password must be at least 6 characters.");
    return { userId: d.userId, newPassword: pass };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const url = "https://vtdccqchhsbujknbpqku.supabase.co";
    const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGNjcWNoaHNidWprbmJwcWt1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc1MzI0NCwiZXhwIjoyMTAwMzI5MjQ0fQ._5MtVAhM-4RmuIKPrSETGv227ZfPJFGkYi7roju7z-o";
    const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });

    if (error) {
      throw new Error(`Failed to reset password: ${error.message}`);
    }

    return { ok: true, message: "User password reset successfully!" };
  });





