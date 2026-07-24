import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AGENT_DISCOUNT_PCT } from "./profile.functions";

async function assertAgent(context: any) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["agent", "admin"]);
  if (!data || data.length === 0) throw new Error("Not an agent");
}

export const getAgentDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgent(context);
    const { data: orders, error } = await context.supabase
      .from("orders")
      .select("id, reference, total_ghs, status, source, created_at, order_items(id, network, size_label, recipient_phone, unit_price_ghs, quantity, status)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const rate = AGENT_DISCOUNT_PCT / 100;
    const all = orders ?? [];
    const delivered = all.filter((o: any) => o.status === "delivered");
    const pending = all.filter((o: any) => ["pending", "processing"].includes(o.status));

    const revenue = delivered.reduce((s: number, o: any) => s + Number(o.total_ghs || 0), 0);
    const commissionEarned = revenue * rate;
    const commissionPending = pending.reduce((s: number, o: any) => s + Number(o.total_ghs || 0), 0) * rate;

    // Commission history from delivered orders
    const history = delivered.map((o: any) => ({
      id: o.id,
      reference: o.reference,
      created_at: o.created_at,
      total_ghs: Number(o.total_ghs || 0),
      commission_ghs: Number((Number(o.total_ghs || 0) * rate).toFixed(2)),
    }));

    // Monthly aggregation (last 6 months)
    const byMonth = new Map<string, { month: string; orders: number; revenue: number; commission: number }>();
    for (const o of delivered) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = byMonth.get(key) ?? { month: key, orders: 0, revenue: 0, commission: 0 };
      cur.orders += 1;
      cur.revenue += Number(o.total_ghs || 0);
      cur.commission += Number(o.total_ghs || 0) * rate;
      byMonth.set(key, cur);
    }
    const monthly = Array.from(byMonth.values()).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6);

    return {
      rate: AGENT_DISCOUNT_PCT,
      stats: {
        totalOrders: all.length,
        deliveredOrders: delivered.length,
        pendingOrders: pending.length,
        revenue: Number(revenue.toFixed(2)),
        commissionEarned: Number(commissionEarned.toFixed(2)),
        commissionPending: Number(commissionPending.toFixed(2)),
      },
      recentOrders: all.slice(0, 15),
      history: history.slice(0, 30),
      monthly,
    };
  });

// ============ WITHDRAWALS ============

export const listMyWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgent(context);
    const { data, error } = await context.supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount_ghs: number; method: string; destination: string; notes?: string }) => {
    const amount = Number(d.amount_ghs);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount");
    if (amount < 10) throw new Error("Minimum withdrawal is GH₵ 10");
    const method = String(d.method || "").trim();
    const destination = String(d.destination || "").replace(/\s+/g, "");
    if (!method) throw new Error("Choose a payout method");
    if (!/^\d{9,10}$/.test(destination)) throw new Error("Enter a valid mobile money number (e.g. 0241234567)");
    return { amount_ghs: Number(amount.toFixed(2)), method, destination, notes: (d.notes || "").slice(0, 500) };
  })
  .handler(async ({ data, context }) => {
    await assertAgent(context);
    // compute available commission (delivered) minus already-requested (pending/approved/paid)
    const { data: orders } = await context.supabase
      .from("orders").select("total_ghs, status").eq("user_id", context.userId).eq("status", "delivered");
    const rate = AGENT_DISCOUNT_PCT / 100;
    const earned = (orders ?? []).reduce((s: number, o: any) => s + Number(o.total_ghs || 0), 0) * rate;
    const { data: ws } = await context.supabase
      .from("withdrawals").select("amount_ghs, status").eq("user_id", context.userId).in("status", ["pending","approved","paid"]);
    const requested = (ws ?? []).reduce((s: number, w: any) => s + Number(w.amount_ghs || 0), 0);
    const available = earned - requested;
    if (data.amount_ghs > available + 0.001) throw new Error(`You can withdraw up to GH₵ ${available.toFixed(2)}`);

    let recipientCode = "";
    // Optionally create Paystack transfer recipient for Mobile Money
    if (process.env.PAYSTACK_SECRET_KEY) {
      try {
        const { createPaystackTransferRecipient } = await import("./paystack");
        const recipient = await createPaystackTransferRecipient({
          name: `Agent-${context.userId.slice(0, 8)}`,
          phone: data.destination,
          bankCode: data.method,
        });
        recipientCode = recipient.recipient_code;
      } catch (err: any) {
        console.warn("Paystack transfer recipient warning:", err.message);
      }
    }

    const notesCombined = [data.notes, recipientCode ? `RecipientCode:${recipientCode}` : ""].filter(Boolean).join(" | ");

    const { data: row, error } = await context.supabase
      .from("withdrawals")
      .insert({
        user_id: context.userId,
        amount_ghs: data.amount_ghs,
        method: data.method,
        destination: data.destination,
        notes: notesCombined || null,
      })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminListWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role","admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("withdrawals").select("*, profiles:profiles!withdrawals_user_id_fkey(display_name, email)").order("created_at", { ascending: false }).limit(200);
    if (error) {
      // fallback without join if FK name differs
      const { data: d2, error: e2 } = await supabaseAdmin.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(200);
      if (e2) throw new Error(e2.message);
      return d2 ?? [];
    }
    return data ?? [];
  });

export const adminUpdateWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "pending" | "approved" | "paid" | "rejected"; admin_note?: string; refundToWallet?: boolean }) => {
    if (!["pending", "approved", "paid", "rejected"].includes(d.status)) throw new Error("Bad status");
    return {
      id: String(d.id),
      status: d.status,
      admin_note: (d.admin_note || "").slice(0, 500),
      refundToWallet: !!d.refundToWallet,
    };
  })
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch withdrawal record
    const { data: withdrawal } = await supabaseAdmin.from("withdrawals").select("*").eq("id", data.id).single();
    if (!withdrawal) throw new Error("Withdrawal record not found");

    const patch: any = { status: data.status, admin_note: data.admin_note || null };
    if (data.status === "paid" || data.status === "rejected") patch.processed_at = new Date().toISOString();

    // 1. AUTOMATED PAYSTACK PAYOUT / TRANSFER ON APPROVAL
    if ((data.status === "approved" || data.status === "paid") && process.env.PAYSTACK_SECRET_KEY) {
      try {
        const { createPaystackTransferRecipient, initiatePaystackTransfer } = await import("./paystack");

        let recipientCode = "";
        const match = (withdrawal.notes || "").match(/RecipientCode:([A-Za-z0-9_]+)/);
        if (match) {
          recipientCode = match[1];
        } else if (withdrawal.destination) {
          // Dynamically create transfer recipient if not existing
          const rec = await createPaystackTransferRecipient({
            name: `Agent-${withdrawal.user_id.slice(0, 8)}`,
            phone: withdrawal.destination,
            bankCode: withdrawal.method || "MTN",
          });
          recipientCode = rec.recipient_code;
        }

        if (recipientCode) {
          const transferRes = await initiatePaystackTransfer({
            amountGhs: Number(withdrawal.amount_ghs),
            recipientCode,
            reference: `WD-${withdrawal.id.slice(0, 8)}-${Date.now().toString().slice(-4)}`,
            reason: `Agent Commission Payout - Bestdata`,
          });

          patch.status = "paid";
          patch.admin_note = [
            data.admin_note,
            `Automated Paystack Transfer: ${transferRes.transfer_code || "Queued"}`,
          ]
            .filter(Boolean)
            .join(" | ");

          // Send SMS Notification
          const { sendTxtConnectSms } = await import("./otp.functions");
          await sendTxtConnectSms(
            withdrawal.destination,
            `Bestdata Payout Alert: Your withdrawal of GH₵ ${Number(withdrawal.amount_ghs).toFixed(2)} has been approved & transferred to your ${withdrawal.method} MoMo line (${withdrawal.destination}). Thank you!`
          ).catch((e) => console.warn("Payout SMS notification warning:", e.message));
        }
      } catch (err: any) {
        console.error("Automated Paystack transfer failed:", err.message);
        patch.admin_note = [data.admin_note, `Paystack Payout Warning: ${err.message}`].filter(Boolean).join(" | ");
      }
    }

    // 2. REJECT & OPTIONAL REFUND TO AGENT WALLET
    if (data.status === "rejected" && data.refundToWallet) {
      const { data: wRecord } = await (supabaseAdmin as any)
        .from("wallets")
        .select("balance_ghs")
        .eq("user_id", withdrawal.user_id)
        .maybeSingle();

      const oldBal = Number(wRecord?.balance_ghs || 0);
      const refundAmt = Number(withdrawal.amount_ghs);
      const newBal = oldBal + refundAmt;

      await (supabaseAdmin as any).from("wallets").upsert({
        user_id: withdrawal.user_id,
        balance_ghs: newBal,
        updated_at: new Date().toISOString(),
      });

      await (supabaseAdmin as any).from("wallet_transactions").insert({
        user_id: withdrawal.user_id,
        amount_ghs: refundAmt,
        type: "refund",
        reference: `WLT-REF-${Date.now()}`,
        status: "completed",
        description: `Returned Withdrawal Request #${withdrawal.id.slice(0, 8)} to Wallet`,
      });

      patch.admin_note = [
        data.admin_note,
        `Returned GH₵ ${refundAmt.toFixed(2)} back to user wallet balance.`,
      ]
        .filter(Boolean)
        .join(" | ");

      // Send SMS Notification
      if (withdrawal.destination) {
        const { sendTxtConnectSms } = await import("./otp.functions");
        await sendTxtConnectSms(
          withdrawal.destination,
          `Bestdata Notice: Your withdrawal request of GH₵ ${refundAmt.toFixed(2)} was refunded back to your Bestdata Wallet balance.`
        ).catch((e) => console.warn("Refund SMS warning:", e.message));
      }
    }

    const { error } = await supabaseAdmin.from("withdrawals").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    // Record audit log event
    await (supabaseAdmin as any).from("withdrawal_events").insert({
      withdrawal_id: data.id,
      event_type: `admin_${data.status}`,
      actor_user_id: context.userId,
      notes: patch.admin_note || `Status set to ${data.status} by admin.`,
    });

    return { ok: true };
  });

// ============ EVENTS + NOTIFICATIONS ============

export const listWithdrawalEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { withdrawalId: string }) => ({ withdrawalId: String(d.withdrawalId) }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("withdrawal_events")
      .select("*")
      .eq("withdrawal_id", data.withdrawalId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminListAllWithdrawalEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role","admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("withdrawal_events")
      .select("*, withdrawals(reference:id, user_id, amount_ghs, method, destination)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications").select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; all?: boolean }) => ({ id: d.id ? String(d.id) : undefined, all: !!d.all }))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("notifications").update({ read: true }).eq("user_id", context.userId);
    if (!data.all && data.id) q = q.eq("id", data.id);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sweepCommissionToWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount_ghs: number }) => {
    const amount = Number(d.amount_ghs);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount");
    if (amount < 1) throw new Error("Minimum sweep amount is GH₵ 1.00");
    return { amount_ghs: Number(amount.toFixed(2)) };
  })
  .handler(async ({ data, context }) => {
    await assertAgent(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Calculate available commission
    const { data: orders } = await context.supabase
      .from("orders").select("total_ghs, status").eq("user_id", context.userId).eq("status", "delivered");
    const rate = AGENT_DISCOUNT_PCT / 100;
    const earned = (orders ?? []).reduce((s: number, o: any) => s + Number(o.total_ghs || 0), 0) * rate;

    const { data: ws } = await context.supabase
      .from("withdrawals").select("amount_ghs, status").eq("user_id", context.userId).in("status", ["pending","approved","paid"]);
    const requested = (ws ?? []).reduce((s: number, w: any) => s + Number(w.amount_ghs || 0), 0);
    const available = earned - requested;

    if (data.amount_ghs > available + 0.001) {
      throw new Error(`Insufficient commission balance. Available: GH₵ ${available.toFixed(2)}`);
    }

    // 2. Create paid withdrawal record with method 'Wallet Sweep'
    const { error: wErr } = await context.supabase
      .from("withdrawals")
      .insert({
        user_id: context.userId,
        amount_ghs: data.amount_ghs,
        method: "Wallet Sweep",
        destination: "Main Wallet",
        status: "paid",
        notes: "Instant 0-fee commission sweep to main purchasing wallet",
        processed_at: new Date().toISOString(),
      });
    if (wErr) throw new Error(wErr.message);

    // 3. Credit wallet balance
    const { data: wallet } = await (supabaseAdmin as any)
      .from("wallets")
      .select("balance_ghs")
      .eq("user_id", context.userId)
      .maybeSingle();

    const currentBal = Number(wallet?.balance_ghs || 0);
    const newBal = Number((currentBal + data.amount_ghs).toFixed(2));

    const { error: balErr } = await (supabaseAdmin as any)
      .from("wallets")
      .upsert({ user_id: context.userId, balance_ghs: newBal }, { onConflict: "user_id" });
    if (balErr) throw new Error(balErr.message);

    // 4. Record wallet transaction
    await (supabaseAdmin as any).from("wallet_transactions").insert({
      user_id: context.userId,
      amount_ghs: data.amount_ghs,
      type: "commission_sweep",
      status: "completed",
      reference: `SWEEP-${Date.now()}`,
      description: "Instant Commission Sweep to Main Wallet",
    });

    return { ok: true, amount_ghs: data.amount_ghs, newBalanceGhs: newBal };
  });

/* ============ STOREFRONT & CUSTOM RESELL PRICING ============ */
export const getAgentStorefront = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAgent(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: store }, { data: prices }, { data: bundles }] = await Promise.all([
      (supabaseAdmin as any)
        .from("agent_store_settings")
        .select("*")
        .eq("user_id", context.userId)
        .maybeSingle(),
      (supabaseAdmin as any)
        .from("agent_custom_prices")
        .select("*")
        .eq("user_id", context.userId),
      supabaseAdmin.from("bundles").select("*").eq("active", true).order("sort_order"),
    ]);

    return {
      store: store || null,
      customPrices: prices || [],
      bundles: bundles || [],
    };
  });

export const saveAgentStorefront = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { store_name: string; slug: string; whatsapp_phone?: string; notice_text?: string; prices?: Record<string, number> }) => d)
  .handler(async ({ data, context }) => {
    await assertAgent(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cleanSlug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50);
    if (!cleanSlug) throw new Error("Invalid store URL slug.");

    const { error: storeErr } = await (supabaseAdmin as any)
      .from("agent_store_settings")
      .upsert(
        {
          user_id: context.userId,
          store_name: data.store_name,
          slug: cleanSlug,
          whatsapp_phone: data.whatsapp_phone || null,
          notice_text: data.notice_text || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (storeErr) throw new Error(storeErr.message);

    if (data.prices) {
      for (const [bundleId, price] of Object.entries(data.prices)) {
        if (Number(price) > 0) {
          await (supabaseAdmin as any)
            .from("agent_custom_prices")
            .upsert(
              {
                user_id: context.userId,
                bundle_id: bundleId,
                agent_price_ghs: Number(price),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,bundle_id" }
            );
        }
      }
    }

    return { ok: true, slug: cleanSlug };
  });

export const getPublicStorefrontBySlug = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: store } = await (supabaseAdmin as any)
      .from("agent_store_settings")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!store) throw new Error("Storefront not found");

    const [{ data: prices }, { data: bundles }] = await Promise.all([
      (supabaseAdmin as any)
        .from("agent_custom_prices")
        .select("*")
        .eq("user_id", store.user_id),
      supabaseAdmin.from("bundles").select("*").eq("active", true).order("sort_order"),
    ]);

    const priceMap = new Map((prices || []).map((p: any) => [p.bundle_id, Number(p.agent_price_ghs)]));

    const agentBundles = (bundles || []).map((b: any) => ({
      ...b,
      display_price_ghs: priceMap.get(b.id) || Number(b.price_ghs),
    }));

    return {
      store,
      bundles: agentBundles,
    };
  });
