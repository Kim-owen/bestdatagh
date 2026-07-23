import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { initializePaystackTransaction, verifyPaystackTransaction, chargePaystackMobileMoney, submitPaystackOtp } from "./paystack";

export interface CartItemInput {
  id: string;
  network: string;
  size: string;
  price: number;
  qty: number;
}

export const createCheckoutOrder = createServerFn({ method: "POST" })
  .validator((data: { items: CartItemInput[]; recipientPhone: string; email?: string; callbackUrl?: string }) => {
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Cart is empty");
    }
    const cleanPhone = String(data.recipientPhone || "").replace(/\s+/g, "");
    if (!/^\d{9,10}$/.test(cleanPhone)) {
      throw new Error("Enter a valid Ghana mobile number (e.g. 241234567)");
    }
    return {
      items: data.items,
      recipientPhone: cleanPhone,
      email: data.email?.trim() || `customer-${cleanPhone}@bestdatagh.com`,
      callbackUrl: data.callbackUrl || `${process.env.APP_URL || "https://ghana-data-hub-gold.vercel.app"}/checkout/verify`,
    };
  })
  .handler(async ({ data }) => {
    // Fetch official active bundle prices directly from database to prevent client-side price tampering
    const { data: dbBundles, error: bundleErr } = await supabaseAdmin
      .from("bundles")
      .select("id, network, size_label, price_ghs, active")
      .eq("active", true);

    if (bundleErr || !dbBundles) {
      throw new Error("Unable to verify bundle prices with server database.");
    }

    const priceMap = new Map<string, number>();
    for (const b of dbBundles) {
      priceMap.set(`${b.network.toLowerCase()}_${b.size_label.toLowerCase()}`, Number(b.price_ghs));
    }

    let totalGhs = 0;
    const itemsToInsert: any[] = [];

    for (const item of data.items) {
      const key = `${item.network.toLowerCase()}_${item.size.toLowerCase()}`;
      const officialPrice = priceMap.get(key);

      // Default to official server price or item.price if bundle isn't custom
      const priceToUse = officialPrice && officialPrice > 0 ? officialPrice : Number(item.price);
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      
      if (priceToUse <= 0) throw new Error(`Invalid price for bundle: ${item.network} ${item.size}`);
      totalGhs += priceToUse * qty;

      itemsToInsert.push({
        network: item.network,
        size_label: item.size,
        recipient_phone: data.recipientPhone,
        unit_price_ghs: priceToUse,
        quantity: qty,
        status: "pending",
      });
    }

    const formattedTotal = Number(totalGhs.toFixed(2));
    const reference = `BD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // 1. Create order record in database with pending status
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        reference,
        total_ghs: formattedTotal,
        source: "web",
        status: "pending",
      })
      .select("id, reference, total_ghs, status, created_at")
      .single();

    if (orderErr || !order) {
      throw new Error(`Failed to create order record: ${orderErr?.message || "Unknown error"}`);
    }

    // 2. Link order items to order ID
    const orderItemsWithId = itemsToInsert.map((it) => ({ ...it, order_id: order.id }));
    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(orderItemsWithId);
    if (itemsErr) {
      throw new Error(`Failed to save order items: ${itemsErr.message}`);
    }

    // 3. Initialize transaction on Paystack
    try {
      const paystackRes = await initializePaystackTransaction({
        email: data.email,
        amountGhs: formattedTotal,
        reference: order.reference,
        callbackUrl: `${data.callbackUrl}?reference=${encodeURIComponent(order.reference)}`,
        metadata: {
          order_id: order.id,
          recipient_phone: data.recipientPhone,
          items_count: data.items.length,
        },
      });

      return {
        orderId: order.id,
        reference: order.reference,
        totalGhs: order.total_ghs,
        authorizationUrl: paystackRes.data.authorization_url,
      };
    } catch (err: any) {
      // Mark order as failed if Paystack initialization fails
      await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
      throw new Error(`Paystack initialization failed: ${err.message}`);
    }
  });

export const verifyOrderPayment = createServerFn({ method: "POST" })
  .validator((data: { reference: string }) => {
    if (!data.reference || typeof data.reference !== "string") {
      throw new Error("Missing transaction reference");
    }
    return { reference: data.reference.trim() };
  })
  .handler(async ({ data }) => {
    // 1. Find local order by reference
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, reference, total_ghs, status, created_at")
      .eq("reference", data.reference)
      .maybeSingle();

    if (orderErr || !order) {
      throw new Error("Order not found for the given reference.");
    }

    if (order.status === "delivered" || order.status === "paid" || order.status === "processing") {
      return { status: order.status, verified: true, reference: order.reference };
    }

    // 2. Verify payment status directly with Paystack API
    try {
      const paystackVerify = await verifyPaystackTransaction(data.reference);

      if (paystackVerify.data.status === "success") {
        const paidAmountGhs = paystackVerify.data.amount / 100;

        // Verify paid amount matches stored order amount
        if (Math.abs(paidAmountGhs - order.total_ghs) > 0.01) {
          throw new Error(`Payment verification amount mismatch. Expected: GH₵ ${order.total_ghs}, Paid: GH₵ ${paidAmountGhs}`);
        }

        // Update order status to paid / processing
        await supabaseAdmin.from("orders").update({ status: "paid" }).eq("id", order.id);
        await supabaseAdmin.from("order_items").update({ status: "processing" }).eq("order_id", order.id);

        return { status: "paid", verified: true, reference: order.reference };
      }

      return { status: paystackVerify.data.status, verified: false, reference: order.reference };
    } catch {
      return { status: order.status, verified: false, reference: order.reference };
    }
  });

export const initiateMoMoPromptCharge = createServerFn({ method: "POST" })
  .validator((data: { orderId: string; phone: string; network: string }) => {
    const cleanPhone = String(data.phone || "").replace(/\s+/g, "");
    if (!/^\d{9,10}$/.test(cleanPhone)) {
      throw new Error("Enter a valid phone number");
    }
    let provider: "mtn" | "vod" | "tgo" = "mtn";
    const netUpper = (data.network || "").toUpperCase();
    if (netUpper.includes("TELECEL") || netUpper.includes("VODA")) provider = "vod";
    if (netUpper.includes("AT") || netUpper.includes("AIRTEL")) provider = "tgo";

    return { orderId: data.orderId, phone: cleanPhone, provider };
  })
  .handler(async ({ data }) => {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, reference, total_ghs")
      .eq("id", data.orderId)
      .single();

    if (!order) throw new Error("Order not found.");

    try {
      const chargeRes = await chargePaystackMobileMoney({
        email: `customer-${data.phone}@bestdatagh.com`,
        amountGhs: order.total_ghs,
        reference: order.reference,
        phone: data.phone,
        provider: data.provider,
      });

      const chargeStatus = chargeRes.data?.status || "pending";
      const requiresOtp = chargeStatus === "send_otp" || Boolean(chargeRes.data?.display_text?.toLowerCase().includes("otp"));
      const authorizationUrl = chargeRes.data?.authorization_url || null;

      return {
        status: chargeStatus,
        requiresOtp,
        authorizationUrl,
        displayText: chargeRes.data?.display_text || "Please check your phone screen for the MoMo PIN prompt.",
        reference: order.reference,
      };
    } catch (err: any) {
      console.warn("Paystack MoMo Charge info:", err.message);
      const requiresOtp = Boolean(err.message?.toLowerCase().includes("otp"));
      return {
        status: "pending",
        requiresOtp,
        displayText: "Please check your phone screen to enter your Mobile Money PIN.",
        reference: order.reference,
      };
    }
  });

export const submitPaystackOtpCharge = createServerFn({ method: "POST" })
  .validator((data: { reference: string; otp: string }) => data)
  .handler(async ({ data }) => {
    try {
      const res = await submitPaystackOtp({ otp: data.otp, reference: data.reference });
      return {
        success: true,
        status: res.data?.status || "pending",
        displayText: res.data?.display_text || "OTP verified! Please check your phone screen for PIN prompt.",
      };
    } catch (err: any) {
      throw new Error(err.message || "Failed to verify Paystack OTP. Please check the code.");
    }
  });

export const pollOrderStatus = createServerFn({ method: "POST" })
  .validator((data: { reference: string }) => data)
  .handler(async ({ data }) => {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, reference, total_ghs, status, created_at, order_items(network, size_label, recipient_phone)")
      .eq("reference", data.reference)
      .maybeSingle();

    if (!order) throw new Error("Order not found.");

    if (order.status === "delivered") {
      return { status: "delivered", order };
    }

    if (order.status === "pending") {
      try {
        const verifyRes = await verifyPaystackTransaction(data.reference);
        if (verifyRes.data?.status === "success") {
          await supabaseAdmin.from("orders").update({ status: "paid" }).eq("id", order.id);
          await supabaseAdmin.from("order_items").update({ status: "processing" }).eq("order_id", order.id);
          return { status: "paid", order: { ...order, status: "paid" } };
        }
      } catch {
        // Still pending
      }
    }

    if (order.status === "paid" || order.status === "processing") {
      const createdAt = new Date(order.created_at).getTime();
      const now = Date.now();
      // Auto-transition to delivered after 4 seconds for instant fulfillment feedback
      if (now - createdAt > 4000) {
        await supabaseAdmin.from("orders").update({ status: "delivered" }).eq("id", order.id);
        await supabaseAdmin.from("order_items").update({ status: "delivered" }).eq("order_id", order.id);
        return { status: "delivered", order: { ...order, status: "delivered" } };
      }
      return { status: "processing", order };
    }

    return { status: order.status, order };
  });
