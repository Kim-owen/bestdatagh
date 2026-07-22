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
  .inputValidator((d: { id: string; status: "pending"|"approved"|"paid"|"rejected"; admin_note?: string }) => {
    if (!["pending","approved","paid","rejected"].includes(d.status)) throw new Error("Bad status");
    return { id: String(d.id), status: d.status, admin_note: (d.admin_note || "").slice(0, 500) };
  })
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role","admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch withdrawal record
    const { data: withdrawal } = await supabaseAdmin.from("withdrawals").select("*").eq("id", data.id).single();
    if (!withdrawal) throw new Error("Withdrawal not found");

    const patch: any = { status: data.status, admin_note: data.admin_note || null };
    if (data.status === "paid" || data.status === "rejected") patch.processed_at = new Date().toISOString();

    // Trigger automated Paystack transfer if approving/paying out with valid secret key
    if ((data.status === "approved" || data.status === "paid") && process.env.PAYSTACK_SECRET_KEY) {
      const match = withdrawal.notes?.match(/RecipientCode:([A-Za-z0-9_]+)/);
      const recipientCode = match ? match[1] : "";

      if (recipientCode) {
        try {
          const { initiatePaystackTransfer } = await import("./paystack");
          const transferRes = await initiatePaystackTransfer({
            amountGhs: Number(withdrawal.amount_ghs),
            recipientCode,
            reference: withdrawal.id,
            reason: `Agent Commission Payout - ${withdrawal.id}`,
          });

          patch.admin_note = [data.admin_note, `Paystack Transfer Code: ${transferRes.transfer_code}`].filter(Boolean).join(" | ");
        } catch (err: any) {
          console.error("Automated Paystack transfer failed:", err.message);
          patch.admin_note = [data.admin_note, `Paystack Payout Warning: ${err.message}`].filter(Boolean).join(" | ");
        }
      }
    }

    const { error } = await supabaseAdmin.from("withdrawals").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    // Record audit log event
    await supabaseAdmin.from("withdrawal_events").insert({
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
