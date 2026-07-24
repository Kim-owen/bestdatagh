import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { initializePaystackTransaction } from "@/lib/paystack";

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyPaystackTransaction, checkPaystackChargeStatus, listRecentPaystackTransactions } = await import("@/lib/paystack");

    // 1. Fetch user's profile to get email & phone for bank-grade ledger cross-verification
    const { data: userProfile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("email, phone")
      .eq("id", context.userId)
      .maybeSingle();

    const userEmail = userProfile?.email?.toLowerCase();
    const userPhone = userProfile?.phone?.replace(/[^\d]/g, "");

    // 2. Auto-reconcile all pending local deposit records for THIS user
    try {
      const { data: pendingTxs } = await (supabaseAdmin as any)
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", context.userId)
        .eq("type", "deposit")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);

      if (pendingTxs && pendingTxs.length > 0) {
        for (const tx of pendingTxs) {
          try {
            let pStatus = "";
            let paidGhs = Number(tx.amount_ghs);

            try {
              const chk = await checkPaystackChargeStatus(tx.reference);
              pStatus = (chk?.data?.status || "").toLowerCase();
              if (chk?.data?.amount) paidGhs = chk.data.amount / 100;
            } catch {}

            if (pStatus !== "success" && pStatus !== "paid" && pStatus !== "completed") {
              const ver = await verifyPaystackTransaction(tx.reference);
              pStatus = (ver?.data?.status || "").toLowerCase();
              if (ver?.data?.amount) paidGhs = ver.data.amount / 100;
            }

            if (pStatus === "success" || pStatus === "paid" || pStatus === "completed") {
              await (supabaseAdmin as any)
                .from("wallet_transactions")
                .update({ status: "completed", amount_ghs: paidGhs, updated_at: new Date().toISOString() })
                .eq("id", tx.id)
                .eq("user_id", context.userId);
            }
          } catch (txErr) {
            console.warn("Pending deposit check notice:", txErr);
          }
        }
      }
    } catch (reconcileErr) {
      console.warn("Wallet pending deposit check warning:", reconcileErr);
    }

    // 3. Bank-Grade Paystack Live Account Sweep: Catch any deposits paid directly on Paystack
    try {
      if (userEmail || userPhone) {
        const recentRes = await listRecentPaystackTransactions({ status: "success" });
        const liveTxs = (recentRes?.data || []) as any[];

        for (const pTx of liveTxs) {
          const ref = pTx.reference || "";
          if (!ref.startsWith("DEP-")) continue;

          const pEmail = (pTx.customer?.email || "").toLowerCase();
          const pPhone = (pTx.authorization?.mobile_money_number || "").replace(/[^\d]/g, "");

          const isUserMatch = (userEmail && pEmail === userEmail) || (userPhone && pPhone.endsWith(userPhone.slice(-9)));
          if (!isUserMatch) continue;

          const paidGhs = Number(pTx.amount || 0) / 100;
          if (paidGhs <= 0) continue;

          // Upsert into wallet_transactions locked to context.userId
          await (supabaseAdmin as any)
            .from("wallet_transactions")
            .upsert(
              {
                user_id: context.userId,
                amount_ghs: paidGhs,
                type: "deposit",
                reference: ref,
                status: "completed",
                description: `Paystack Deposit (GH₵ ${paidGhs.toFixed(2)})`,
                created_at: pTx.paid_at || pTx.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "reference" }
            );
        }
      }
    } catch (paystackSweepErr) {
      console.warn("Paystack live account sweep warning:", paystackSweepErr);
    }

    // 4. Fetch all user transactions & calculate exact bank ledger balance
    const { data: transactions } = await (supabaseAdmin as any)
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);

    const allTxs = transactions || [];
    const completedTxs = allTxs.filter((t: any) => t.status === "completed" || t.status === "paid" || t.status === "delivered");
    const calculatedBal = completedTxs.reduce((acc: number, t: any) => acc + Number(t.amount_ghs || 0), 0);

    // Sync calculated balance with wallets table
    await (supabaseAdmin as any)
      .from("wallets")
      .upsert({ user_id: context.userId, balance_ghs: Math.max(0, calculatedBal), updated_at: new Date().toISOString() });

    return {
      balanceGhs: Math.max(0, calculatedBal),
      transactions: allTxs,
    };
  });

export const initializeWalletDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amountGhs: number; callbackUrl?: string }) => {
    const amt = Number(d.amountGhs);
    if (!amt || amt < 1) throw new Error("Minimum deposit amount is GH₵ 1.00");
    return { amountGhs: amt, callbackUrl: d.callbackUrl };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const reference = `DEP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Save pending deposit transaction locked to context.userId
    await (supabaseAdmin as any).from("wallet_transactions").insert({
      user_id: context.userId,
      amount_ghs: data.amountGhs,
      type: "deposit",
      reference,
      status: "pending",
      description: `Wallet Deposit (GH₵ ${data.amountGhs.toFixed(2)})`,
    });

    return {
      reference,
      amountGhs: data.amountGhs,
    };
  });

export const payOrderWithWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; amountGhs: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Check wallet balance
    const { data: wallet } = await (supabaseAdmin as any)
      .from("wallets")
      .select("balance_ghs")
      .eq("user_id", context.userId)
      .maybeSingle();

    const currentBalance = Number(wallet?.balance_ghs || 0);
    if (currentBalance < data.amountGhs) {
      throw new Error(`Insufficient wallet balance. You have GH₵ ${currentBalance.toFixed(2)}, but order total is GH₵ ${data.amountGhs.toFixed(2)}.`);
    }

    // 2. Deduct wallet
    const newBalance = currentBalance - data.amountGhs;
    await (supabaseAdmin as any)
      .from("wallets")
      .upsert({ user_id: context.userId, balance_ghs: newBalance, updated_at: new Date().toISOString() });

    // 3. Record transaction
    const txRef = `WLT-PAY-${Date.now()}`;
    await (supabaseAdmin as any).from("wallet_transactions").insert({
      user_id: context.userId,
      amount_ghs: -data.amountGhs,
      type: "purchase",
      reference: txRef,
      status: "completed",
      description: `Payment for Order #${data.orderId}`,
    });

    // 4. Mark order as paid
    await supabaseAdmin.from("orders").update({ status: "paid" }).eq("id", data.orderId);
    await supabaseAdmin.from("order_items").update({ status: "processing" }).eq("order_id", data.orderId);

    return { ok: true, newBalance };
  });

export const verifyWalletDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reference: string }) => ({
    reference: d.reference.trim(),
  }))
  .handler(async ({ data, context }) => {
    const { verifyPaystackTransaction } = await import("@/lib/paystack");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch pending transaction belonging STRICTLY to context.userId
    const { data: pendingTx } = await (supabaseAdmin as any)
      .from("wallet_transactions")
      .select("*")
      .eq("reference", data.reference)
      .maybeSingle();

    if (pendingTx && pendingTx.status === "completed") {
      if (pendingTx.user_id !== context.userId) {
        throw new Error("Unauthorized: Deposit reference belongs to another user.");
      }
      const { data: curWallet } = await (supabaseAdmin as any)
        .from("wallets")
        .select("balance_ghs")
        .eq("user_id", context.userId)
        .maybeSingle();

      return { ok: true, balanceGhs: Number(curWallet?.balance_ghs || 0), alreadyVerified: true };
    }

    if (pendingTx && pendingTx.user_id !== context.userId) {
      throw new Error("Unauthorized: You cannot claim another user's deposit reference.");
    }

    // 2. Verify with Paystack Live API
    const paystackRes = await verifyPaystackTransaction(data.reference);
    if (!paystackRes?.status || paystackRes?.data?.status !== "success") {
      throw new Error(`Deposit status is ${paystackRes?.data?.status || "unverified"}`);
    }

    const paidGhs = (paystackRes.data.amount || 0) / 100;
    if (paidGhs <= 0) throw new Error("Invalid payment amount from Paystack.");

    const psUserId = paystackRes.data.metadata?.user_id;
    if (psUserId && psUserId !== context.userId) {
      throw new Error("Unauthorized: Paystack metadata user mismatch.");
    }

    // 3. ATOMIC LOCK: Update status from 'pending' to 'completed'
    if (pendingTx) {
      const { data: updated, error: updateErr } = await (supabaseAdmin as any)
        .from("wallet_transactions")
        .update({
          status: "completed",
          amount_ghs: paidGhs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pendingTx.id)
        .eq("user_id", context.userId)
        .eq("status", "pending")
        .select("*")
        .maybeSingle();

      if (updateErr || !updated) {
        const { data: curWallet } = await (supabaseAdmin as any)
          .from("wallets")
          .select("balance_ghs")
          .eq("user_id", context.userId)
          .maybeSingle();
        return { ok: true, balanceGhs: Number(curWallet?.balance_ghs || 0), alreadyVerified: true };
      }
    } else {
      const { error: insertErr } = await (supabaseAdmin as any)
        .from("wallet_transactions")
        .insert({
          user_id: context.userId,
          amount_ghs: paidGhs,
          type: "deposit",
          reference: data.reference,
          status: "completed",
          description: `Paystack Deposit (GH₵ ${paidGhs.toFixed(2)})`,
        });

      if (insertErr) {
        const { data: curWallet } = await (supabaseAdmin as any)
          .from("wallets")
          .select("balance_ghs")
          .eq("user_id", context.userId)
          .maybeSingle();
        return { ok: true, balanceGhs: Number(curWallet?.balance_ghs || 0), alreadyVerified: true };
      }
    }

    // 4. Recalculate true wallet balance safely
    const { data: allUserTxs } = await (supabaseAdmin as any)
      .from("wallet_transactions")
      .select("amount_ghs, status")
      .eq("user_id", context.userId);

    const completedTxs = (allUserTxs || []).filter((t: any) => t.status === "completed" || t.status === "paid");
    const exactBal = completedTxs.reduce((acc: number, t: any) => acc + Number(t.amount_ghs || 0), 0);

    await (supabaseAdmin as any)
      .from("wallets")
      .upsert({ user_id: context.userId, balance_ghs: Math.max(0, exactBal), updated_at: new Date().toISOString() });

    return { ok: true, balanceGhs: Math.max(0, exactBal), alreadyVerified: false };
  });

/* ============ BANKING SECURITY: WALLET PIN & PROTECTION ============ */
function hashPin(pin: string): string {
  const crypto = require("node:crypto");
  return crypto.createHash("sha256").update(pin.trim()).digest("hex");
}

export const setWalletPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { pin: string }) => d)
  .handler(async ({ data, context }) => {
    const pin = data.pin.trim();
    if (!/^\d{4}$/.test(pin)) {
      throw new Error("Wallet PIN must be exactly 4 digits.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const pinHash = hashPin(pin);
    await (supabaseAdmin as any)
      .from("wallets")
      .upsert(
        { user_id: context.userId, pin_hash: pinHash, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    return { ok: true, message: "4-Digit Wallet PIN configured successfully!" };
  });

export const verifyWalletPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { pin: string }) => d)
  .handler(async ({ data, context }) => {
    const pin = data.pin.trim();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: wallet } = await (supabaseAdmin as any)
      .from("wallets")
      .select("pin_hash, is_locked")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (wallet?.is_locked) {
      throw new Error("Wallet account is locked for security reasons. Contact support.");
    }

    if (!wallet?.pin_hash) {
      return { verified: true, hasPin: false };
    }

    const inputHash = hashPin(pin);
    if (wallet.pin_hash !== inputHash) {
      throw new Error("Incorrect 4-digit Wallet PIN. Please try again.");
    }

    return { verified: true, hasPin: true };
  });
