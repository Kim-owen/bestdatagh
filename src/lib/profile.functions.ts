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

      // Fetch Admin Configured WhatsApp Channel Link
      const { data: channelConfig } = await (supabaseAdmin as any)
        .from("system_configs")
        .select("value")
        .eq("key", "whatsapp_channel_link")
        .maybeSingle();

      const channelLink = channelConfig?.value || "https://whatsapp.com/channel/0029Vb87LlELdQebZ0K7n51E";
      const firstName = data.full_name ? data.full_name.split(" ")[0] : "Agent";

      // Send Welcome SMS
      const { sendTxtConnectSms } = await import("@/lib/otp.functions");
      const welcomeMsg = `🎉 Congratulations ${firstName}! Your BestData Agent account is now ACTIVATED! Your store link: bestdatagh.com/store/${slug}. Join official WhatsApp Channel for updates: ${channelLink}`;
      try {
        await sendTxtConnectSms(data.phone, welcomeMsg);
      } catch (smsErr) {
        console.warn("Agent Welcome SMS notice:", smsErr);
      }
    }

    return { ok: true, feePaid, activationFee, status: appStatus };
  });

/* ============ ADMIN SYSTEM CONFIGS & PAYMENT VERIFICATION ============ */
export const getWhatsappChannelLink = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("system_configs")
      .select("value")
      .eq("key", "whatsapp_channel_link")
      .maybeSingle();

    const link = data?.value || "https://whatsapp.com/channel/0029Vb87LlELdQebZ0K7n51E";
    return { channelLink: link };
  });

export const updateWhatsappChannelLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { channelLink: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Unauthorized: Admin access required.");

    const link = data.channelLink.trim();
    await (supabaseAdmin as any)
      .from("system_configs")
      .upsert({ key: "whatsapp_channel_link", value: link, updated_at: new Date().toISOString() });

    return { ok: true, channelLink: link };
  });

export const verifyAgentActivationPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reference: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyPaystackTransaction } = await import("@/lib/paystack");
    const { sendTxtConnectSms } = await import("@/lib/otp.functions");

    const psRes = await verifyPaystackTransaction(data.reference);
    if (!psRes?.status || psRes?.data?.status !== "success") {
      throw new Error(`Agent activation payment pending or failed. Status: ${psRes?.data?.status || "unknown"}`);
    }

    const { data: app } = await (supabaseAdmin as any)
      .from("agent_applications")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!app) throw new Error("Agent application record not found.");

    if (app.activation_fee_paid && app.status === "approved") {
      return { ok: true, alreadyApproved: true };
    }

    // Approve application
    await (supabaseAdmin as any)
      .from("agent_applications")
      .update({
        activation_fee_paid: true,
        status: "approved",
        fee_payment_ref: data.reference,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId);

    // Promote to agent
    await (supabaseAdmin as any)
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "agent" }, { onConflict: "user_id,role" });

    // Provision store
    const storeName = app.business_name || `${app.full_name}'s Data Hub`;
    const baseSlug = storeName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
    const slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

    await (supabaseAdmin as any).from("agent_store_settings").upsert(
      {
        user_id: context.userId,
        store_name: storeName,
        slug,
        whatsapp_phone: app.phone,
        is_listed_in_directory: app.is_mentor_requested,
        city_region: app.region,
      },
      { onConflict: "user_id" }
    );

    // Get Channel link & send Welcome SMS
    const { data: channelConfig } = await (supabaseAdmin as any)
      .from("system_configs")
      .select("value")
      .eq("key", "whatsapp_channel_link")
      .maybeSingle();

    const channelLink = channelConfig?.value || "https://whatsapp.com/channel/0029Vb87LlELdQebZ0K7n51E";
    const firstName = app.full_name ? app.full_name.split(" ")[0] : "Agent";

    const welcomeMsg = `🎉 Congratulations ${firstName}! Your BestData Agent account is now ACTIVATED! Your store link: bestdatagh.com/store/${slug}. Join official WhatsApp Channel for updates: ${channelLink}`;
    try {
      await sendTxtConnectSms(app.phone, welcomeMsg);
    } catch (smsErr) {
      console.warn("Agent Welcome SMS notice:", smsErr);
    }

    return { ok: true, slug };
  });
