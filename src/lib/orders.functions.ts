import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { initializePaystackTransaction, verifyPaystackTransaction } from "./paystack";

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
    let totalGhs = 0;
    const itemsToInsert: any[] = [];

    for (const item of data.items) {
      const price = Number(item.price);
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      if (price <= 0) throw new Error("Invalid item price");
      totalGhs += price * qty;

      itemsToInsert.push({
        network: item.network,
        size_label: item.size,
        recipient_phone: data.recipientPhone,
        unit_price_ghs: price,
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
    const paystackVerify = await verifyPaystackTransaction(data.reference);

    if (paystackVerify.data.status === "success") {
      const paidAmountGhs = paystackVerify.data.amount / 100;

      // Verify paid amount matches stored order amount
      if (Math.abs(paidAmountGhs - order.total_ghs) > 0.01) {
        throw new Error(`Payment verification amount mismatch. Expected: GH₵ ${order.total_ghs}, Paid: GH₵ ${paidAmountGhs}`);
      }

      // Update order status to paid / processing
      const { error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({ status: "paid" })
        .eq("id", order.id);

      if (updateErr) throw new Error(`Failed to update order status: ${updateErr.message}`);

      // Also update items status
      await supabaseAdmin.from("order_items").update({ status: "processing" }).eq("order_id", order.id);

      return { status: "paid", verified: true, reference: order.reference };
    }

    return { status: paystackVerify.data.status, verified: false, reference: order.reference };
  });
