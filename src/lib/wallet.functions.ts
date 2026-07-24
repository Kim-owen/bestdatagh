import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { initializePaystackTransaction } from "@/lib/paystack";

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: wallet }, { data: transactions }] = await Promise.all([
      (supabaseAdmin as any)
        .from("wallets")
        .select("balance_ghs")
        .eq("user_id", context.userId)
        .maybeSingle(),
      (supabaseAdmin as any)
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return {
      balanceGhs: Number(wallet?.balance_ghs || 0),
      transactions: transactions || [],
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
