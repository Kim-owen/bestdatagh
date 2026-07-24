import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { initializePaystackTransaction } from "@/lib/paystack";

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Global Paystack Reconciler: Auto-import & link all successful Paystack deposits for this user
    try {
      const { listRecentPaystackTransactions } = await import("@/lib/paystack");
      const psRes = await listRecentPaystackTransactions({ status: "success" });
      const psTxList = (psRes?.data || []) as any[];

      const depTxs = psTxList.filter((pt: any) => {
        const ref = String(pt.reference || "");
        const isDep = ref.startsWith("DEP-") || pt.metadata?.type === "wallet_deposit";
        return isDep && pt.status === "success";
      });

      for (const pt of depTxs) {
        const paidGhs = (pt.amount || 0) / 100;
        const ref = pt.reference;
        const baseRef = ref.split("-R")[0].split("-F")[0];

        const { data: existing } = await (supabaseAdmin as any)
          .from("wallet_transactions")
          .select("id, status, user_id")
          .or(`reference.eq.${ref},reference.eq.${baseRef},reference.ilike.${baseRef}%`)
          .maybeSingle();

        if (!existing) {
          await (supabaseAdmin as any).from("wallet_transactions").insert({
            user_id: context.userId,
            amount_ghs: paidGhs,
            type: "deposit",
            reference: ref,
            status: "completed",
            description: `Paystack Deposit (GH₵ ${paidGhs.toFixed(2)})`,
          });
        } else if (existing.status !== "completed" || !existing.user_id) {
          await (supabaseAdmin as any)
            .from("wallet_transactions")
            .update({ status: "completed", amount_ghs: paidGhs, user_id: context.userId })
            .eq("id", existing.id);
        }
      }
    } catch (importErr) {
      console.warn("Global Paystack deposit import notice:", importErr);
    }

    // 2. Auto-reconcile any remaining pending deposits for this user
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
        const { verifyPaystackTransaction, checkPaystackChargeStatus } = await import("@/lib/paystack");
        for (const tx of pendingTxs) {
          const baseRef = (tx.reference || "").split("-R")[0].split("-F")[0];
          const refsToTry = Array.from(new Set([tx.reference, baseRef].filter(Boolean)));
          for (const ref of refsToTry) {
            try {
              let pStatus = "";
              let paidGhs = Number(tx.amount_ghs);

              try {
                const chk = await checkPaystackChargeStatus(ref);
                pStatus = (chk?.data?.status || "").toLowerCase();
                if (chk?.data?.amount) paidGhs = chk.data.amount / 100;
              } catch {}

              if (pStatus !== "success" && pStatus !== "paid" && pStatus !== "completed") {
                const ver = await verifyPaystackTransaction(ref);
                pStatus = (ver?.data?.status || "").toLowerCase();
                if (ver?.data?.amount) paidGhs = ver.data.amount / 100;
              }

              if (pStatus === "success" || pStatus === "paid" || pStatus === "completed") {
                await (supabaseAdmin as any)
                  .from("wallet_transactions")
                  .update({ status: "completed", amount_ghs: paidGhs, user_id: context.userId })
                  .eq("id", tx.id);
                break;
              }
            } catch {}
          }
        }
      }
    } catch (reconcileErr) {
      console.warn("Wallet getMyWallet auto-reconciliation warning:", reconcileErr);
    }

    // 3. Fetch all user transactions & recalculate exact balance
    const { data: transactions } = await (supabaseAdmin as any)
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);

    const allTxs = transactions || [];
    const completedTxs = allTxs.filter((t: any) => t.status === "completed" || t.status === "paid" || t.status === "delivered");
    const calculatedBal = completedTxs.reduce((acc: number, t: any) => acc + Number(t.amount_ghs || 0), 0);

    // Sync balance with wallets table
    await (supabaseAdmin as any)
      .from("wallets")
      .upsert({ user_id: context.userId, balance_ghs: calculatedBal, updated_at: new Date().toISOString() });

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

    // Save pending deposit transaction in database
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
  .inputValidator((d: { reference: string }) => d)
  .handler(async ({ data, context }) => {
    const { verifyPaystackTransaction } = await import("@/lib/paystack");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Check if already credited
    const { data: existingTx } = await (supabaseAdmin as any)
      .from("wallet_transactions")
      .select("id, amount_ghs")
      .eq("reference", data.reference)
      .maybeSingle();

    if (existingTx) {
      const { data: curWallet } = await (supabaseAdmin as any)
        .from("wallets")
        .select("balance_ghs")
        .eq("user_id", context.userId)
        .maybeSingle();

      return { ok: true, balanceGhs: Number(curWallet?.balance_ghs || 0), alreadyVerified: true };
    }

    // 2. Verify with Paystack API
    const paystackRes = await verifyPaystackTransaction(data.reference);
    if (paystackRes.data.status !== "success") {
      throw new Error(`Deposit status is ${paystackRes.data.status}`);
    }

    const paidGhs = paystackRes.data.amount / 100;

    // 3. Fetch & credit wallet
    const { data: curWallet } = await (supabaseAdmin as any)
      .from("wallets")
      .select("balance_ghs")
      .eq("user_id", context.userId)
      .maybeSingle();

    const newBal = Number(curWallet?.balance_ghs || 0) + paidGhs;

    await (supabaseAdmin as any)
      .from("wallets")
      .upsert({ user_id: context.userId, balance_ghs: newBal, updated_at: new Date().toISOString() });

    await (supabaseAdmin as any).from("wallet_transactions").insert({
      user_id: context.userId,
      amount_ghs: paidGhs,
      type: "deposit",
      reference: data.reference,
      status: "completed",
      description: `Paystack Deposit (${data.reference})`,
    });

    return { ok: true, balanceGhs: newBal, alreadyVerified: false };
  });
