import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const AGENT_DISCOUNT_PCT = 10;

export const getAgentActivationFee = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("system_configs")
      .select("value")
      .eq("key", "agent_activation_fee_ghs")
      .maybeSingle();

    const fee = Number(data?.value || 50.00);
    return { feeGhs: fee };
  });

export const updateAgentActivationFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { feeGhs: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Assert admin
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Unauthorized: Admin access required.");

    const feeVal = Math.max(0, Number(data.feeGhs || 50.00)).toFixed(2);

    await (supabaseAdmin as any)
      .from("system_configs")
      .upsert({ key: "agent_activation_fee_ghs", value: feeVal, updated_at: new Date().toISOString() });

    return { ok: true, feeGhs: Number(feeVal) };
  });

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
  .inputValidator(
    (d: {
      full_name: string;
      phone: string;
      business_name?: string;
      region: string;
      sales_channel?: string;
      monthly_volume?: string;
      is_mentor_requested?: boolean;
      note?: string;
      payWithWallet?: boolean;
    }) => ({
      full_name: d.full_name.trim().slice(0, 80),
      phone: d.phone.trim().slice(0, 20),
      business_name: (d.business_name ?? "").trim().slice(0, 100) || null,
      region: d.region.trim().slice(0, 60),
      sales_channel: (d.sales_channel ?? "WhatsApp / Social Media").trim().slice(0, 80),
      monthly_volume: (d.monthly_volume ?? "").toString().trim().slice(0, 40) || null,
      is_mentor_requested: Boolean(d.is_mentor_requested),
      note: (d.note ?? "").toString().trim().slice(0, 500) || null,
      payWithWallet: Boolean(d.payWithWallet),
    })
  )
  .handler(async ({ data, context }) => {
    if (!data.full_name || !data.phone || !data.region) throw new Error("Missing required fields");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch current activation fee
    const { data: feeConfig } = await (supabaseAdmin as any)
      .from("system_configs")
      .select("value")
      .eq("key", "agent_activation_fee_ghs")
      .maybeSingle();

    const activationFee = Number(feeConfig?.value || 50.00);

    let feePaid = false;
    let paymentRef = null;

    if (data.payWithWallet) {
      const { data: wallet } = await (supabaseAdmin as any)
        .from("wallets")
        .select("balance_ghs")
        .eq("user_id", context.userId)
        .maybeSingle();

      const bal = Number(wallet?.balance_ghs || 0);
      if (bal < activationFee) {
        throw new Error(`Insufficient wallet balance. Activation fee is GH₵ ${activationFee.toFixed(2)}, but your wallet has GH₵ ${bal.toFixed(2)}.`);
      }

      // Deduct fee from wallet
      const newBal = bal - activationFee;
      paymentRef = `AGNT-ACT-${Date.now()}`;

      await (supabaseAdmin as any)
        .from("wallets")
        .update({ balance_ghs: newBal, updated_at: new Date().toISOString() })
        .eq("user_id", context.userId);

      await (supabaseAdmin as any).from("wallet_transactions").insert({
        user_id: context.userId,
        amount_ghs: activationFee,
        type: "debit",
        reference: paymentRef,
        status: "completed",
        description: `Agent Activation Fee Payment (${paymentRef})`,
      });

      feePaid = true;
    }

    const appStatus = feePaid ? "approved" : "pending";

    const { error } = await (supabaseAdmin as any).from("agent_applications").upsert(
      {
        user_id: context.userId,
        full_name: data.full_name,
        phone: data.phone,
        business_name: data.business_name,
        region: data.region,
        sales_channel: data.sales_channel,
        monthly_volume: data.monthly_volume,
        is_mentor_requested: data.is_mentor_requested,
        note: data.note,
        status: appStatus,
        activation_fee_paid: feePaid,
        fee_amount_ghs: activationFee,
        fee_payment_ref: paymentRef,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) throw new Error(error.message);

    if (feePaid) {
      // Auto assign agent role
      await (supabaseAdmin as any).from("user_roles").upsert({ user_id: context.userId, role: "agent" }, { onConflict: "user_id,role" });

      // Auto provision agent store
      const storeName = data.business_name || `${data.full_name}'s Data Hub`;
      const baseSlug = storeName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
      const slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

      await (supabaseAdmin as any).from("agent_store_settings").upsert(
        {
          user_id: context.userId,
          store_name: storeName,
          slug,
          whatsapp_phone: data.phone,
          is_listed_in_directory: data.is_mentor_requested,
          city_region: data.region,
        },
        { onConflict: "user_id" }
      );
    }

    return { ok: true, feePaid, activationFee, status: appStatus };
  });
