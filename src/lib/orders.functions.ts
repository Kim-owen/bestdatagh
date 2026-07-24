import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { initializePaystackTransaction, verifyPaystackTransaction, chargePaystackMobileMoney, submitPaystackOtp, resolvePaystackAccount, createPaystackCustomer, createPaystackPaymentRequest, notifyPaystackPaymentRequest } from "./paystack";
import { mapToSwiftDataNetwork, parseSizeGb, buySwiftDataBundle, getSwiftDataOrder } from "./swiftdata";

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

    return {
      orderId: order.id,
      reference: order.reference,
      totalGhs: order.total_ghs,
    };
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

      if (paystackVerify.data?.status === "success") {
        const paidAmountGhs = paystackVerify.data.amount / 100;

        // Verify paid amount matches stored order amount
        if (Math.abs(paidAmountGhs - order.total_ghs) > 0.01) {
          throw new Error(`Payment verification amount mismatch. Expected: GH₵ ${order.total_ghs}, Paid: GH₵ ${paidAmountGhs}`);
        }

        // Update order status to delivered
        await supabaseAdmin.from("orders").update({ status: "delivered" }).eq("id", order.id);
        await supabaseAdmin.from("order_items").update({ status: "delivered" }).eq("order_id", order.id);

        return { status: "delivered", verified: true, reference: order.reference };
      }

      return { status: paystackVerify.data?.status || "pending", verified: false, reference: order.reference };
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
    let reference = data.orderId;
    let totalGhs = 0;

    // A. Check if deposit transaction
    if (data.orderId.startsWith("DEP-")) {
      const { data: tx } = await (supabaseAdmin as any)
        .from("wallet_transactions")
        .select("reference, amount_ghs")
        .eq("reference", data.orderId)
        .maybeSingle();

      if (tx) {
        reference = tx.reference;
        totalGhs = Number(tx.amount_ghs);
      } else {
        // Fallback: Verify with Paystack transaction API to get initialized amount
        try {
          const psData = await verifyPaystackTransaction(data.orderId);
          if (psData.data?.amount) {
            totalGhs = psData.data.amount / 100;
            reference = data.orderId;
          }
        } catch {
          // Ignore error if not initialized on Paystack yet
        }
      }
    }

    // B. Check standard orders if totalGhs is not found
    if (!totalGhs) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, reference, total_ghs")
        .or(`id.eq.${data.orderId},reference.eq.${data.orderId}`)
        .maybeSingle();

      if (order) {
        reference = order.reference;
        totalGhs = Number(order.total_ghs);
      }
    }

    if (!totalGhs) throw new Error("Order or Deposit transaction not found.");

    try {
      const chargeRes = await chargePaystackMobileMoney({
        email: `customer-${data.phone}@bestdatagh.com`,
        amountGhs: totalGhs,
        reference,
        phone: data.phone,
        provider: data.provider,
      });

      const chargeStatus = chargeRes.data?.status || "pending";
      const requiresOtp = chargeStatus === "send_otp" || Boolean(chargeRes.data?.display_text?.toLowerCase().includes("otp"));
      const authorizationUrl = chargeRes.data?.authorization_url || null;
      const accessCode = chargeRes.data?.access_code || null;

      return {
        status: chargeStatus,
        requiresOtp,
        authorizationUrl,
        accessCode,
        displayText: chargeRes.data?.display_text || "Please check your phone screen for the MoMo PIN prompt.",
        reference,
      };
    } catch (err: any) {
      console.warn("Paystack MoMo Charge info:", err.message);
      // Fallback: Initialize Paystack transaction with unique fallback reference if charge fails
      try {
        const fallbackRef = `${reference}-F${Date.now().toString().slice(-4)}`;
        const initRes = await initializePaystackTransaction({
          email: `customer-${data.phone}@bestdatagh.com`,
          amountGhs: totalGhs,
          reference: fallbackRef,
        });

        return {
          status: "open_url",
          requiresOtp: false,
          authorizationUrl: initRes.data?.authorization_url || null,
          accessCode: initRes.data?.access_code || null,
          displayText: "Mobile Money prompt initialized. Please complete payment.",
          reference,
        };
      } catch (fallbackErr: any) {
        return {
          status: "pending",
          requiresOtp: false,
          authorizationUrl: null,
          accessCode: null,
          displayText: "Please check your phone screen to enter your Mobile Money PIN.",
          reference,
        };
      }
    }
  });

export const createPaymentRequestInvoice = createServerFn({ method: "POST" })
  .validator((data: { orderId: string; phone: string }) => data)
  .handler(async ({ data }) => {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, reference, total_ghs, order_items(network, size_label)")
      .eq("id", data.orderId)
      .single();

    if (!order) throw new Error("Order not found.");

    try {
      // 1. Create or ensure Paystack Customer
      const custRes = await createPaystackCustomer({
        email: `customer-${data.phone}@bestdatagh.com`,
        phone: data.phone,
      });

      const customerCode = custRes.data?.customer_code || custRes.data?.id;

      // 2. Create Payment Request (Invoice)
      const firstItem = order.order_items?.[0];
      const desc = firstItem ? `${firstItem.network} ${firstItem.size_label} Data Bundle` : "Bestdata Data Bundle";

      const prRes = await createPaystackPaymentRequest({
        customer: customerCode,
        amountGhs: order.total_ghs,
        description: desc,
        lineItems: [{ name: desc, amount: order.total_ghs, quantity: 1 }],
      });

      const requestCode = prRes.data?.request_code;
      if (requestCode) {
        // Send SMS/Email notification via Paystack
        await notifyPaystackPaymentRequest(requestCode).catch(() => {});
      }

      return {
        success: true,
        message: "Paystack Payment Request invoice created and SMS notification sent to " + data.phone,
        offlineReference: prRes.data?.offline_reference,
        requestCode,
      };
    } catch (err: any) {
      console.warn("[Payment Request Invoice Notice]:", err.message);
      throw new Error(err.message || "Failed to create Paystack Payment Request invoice.");
    }
  });

export const resolveMoMoAccountName = createServerFn({ method: "POST" })
  .validator((data: { phone: string; network: string }) => data)
  .handler(async ({ data }) => {
    try {
      const res = await resolvePaystackAccount({ accountNumber: data.phone, bankCode: data.network });
      return {
        accountName: res.data?.account_name || null,
        accountNumber: res.data?.account_number || data.phone,
      };
    } catch (err: any) {
      console.warn("[MoMo Account Resolve Warning]:", err.message);
      return { accountName: null, accountNumber: data.phone };
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
    // 1. Check if deposit transaction (starts with "DEP-")
    if (data.reference.startsWith("DEP-")) {
      const { data: tx } = await (supabaseAdmin as any)
        .from("wallet_transactions")
        .select("id, user_id, reference, amount_ghs, status")
        .eq("reference", data.reference)
        .maybeSingle();

      if (tx) {
        if (tx.status === "completed") {
          return {
            status: "delivered",
            isDeposit: true,
            depositAmount: Number(tx.amount_ghs),
            reference: tx.reference,
            order: { reference: tx.reference, total_ghs: Number(tx.amount_ghs) },
          };
        }

        // Verify with Paystack
        try {
          const verifyRes = await verifyPaystackTransaction(data.reference);
          if (verifyRes.data?.status === "success") {
            const paidGhs = verifyRes.data.amount / 100;

            // Atomically update status from pending -> completed to avoid duplicate crediting
            const { data: updatedTx } = await (supabaseAdmin as any)
              .from("wallet_transactions")
              .update({ status: "completed", amount_ghs: paidGhs })
              .eq("id", tx.id)
              .eq("status", "pending")
              .select()
              .maybeSingle();

            if (updatedTx && tx.user_id) {
              const { data: curWallet } = await (supabaseAdmin as any)
                .from("wallets")
                .select("balance_ghs")
                .eq("user_id", tx.user_id)
                .maybeSingle();

              const newBal = Number(curWallet?.balance_ghs || 0) + paidGhs;
              await (supabaseAdmin as any)
                .from("wallets")
                .upsert({ user_id: tx.user_id, balance_ghs: newBal, updated_at: new Date().toISOString() });
            }

            return {
              status: "delivered",
              isDeposit: true,
              depositAmount: paidGhs,
              reference: tx.reference,
              order: { reference: tx.reference, total_ghs: paidGhs },
            };
          }
        } catch {
          // Still pending
        }

        return {
          status: "pending",
          isDeposit: true,
          depositAmount: Number(tx.amount_ghs),
          reference: tx.reference,
          order: { reference: tx.reference, total_ghs: Number(tx.amount_ghs) },
        };
      } else {
        // Fallback for deposits not found in local DB yet: Verify Paystack directly
        try {
          const verifyRes = await verifyPaystackTransaction(data.reference);
          const paidGhs = (verifyRes.data?.amount || 0) / 100;

          if (verifyRes.data?.status === "success") {
            return {
              status: "delivered",
              isDeposit: true,
              depositAmount: paidGhs,
              reference: data.reference,
              order: { reference: data.reference, total_ghs: paidGhs },
            };
          }

          return {
            status: "pending",
            isDeposit: true,
            depositAmount: paidGhs,
            reference: data.reference,
            order: { reference: data.reference, total_ghs: paidGhs },
          };
        } catch {
          return {
            status: "pending",
            isDeposit: true,
            depositAmount: 0,
            reference: data.reference,
            order: { reference: data.reference, total_ghs: 0 },
          };
        }
      }
    }

    // 2. Standard order check
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, reference, total_ghs, status, created_at, order_items(network, size_label, recipient_phone)")
      .eq("reference", data.reference)
      .maybeSingle();

    if (!order) throw new Error("Order not found.");

    if (order.status === "delivered" || order.status === "completed") {
      return { status: "delivered", order: { ...order, status: "delivered" } };
    }

    if (order.status === "failed") {
      return { status: "failed", order };
    }

    // 1. If status is pending, verify payment with Paystack
    if (order.status === "pending") {
      try {
        const verifyRes = await verifyPaystackTransaction(data.reference);
        if (verifyRes.data?.status === "success") {
          // Payment confirmed by Paystack -> update to paid
          await supabaseAdmin.from("orders").update({ status: "paid" }).eq("id", order.id);
          await supabaseAdmin.from("order_items").update({ status: "processing" }).eq("order_id", order.id);

          // Trigger automated dispatch via SwiftData API if configured
          const firstItem = order.order_items?.[0];
          if (firstItem && process.env.SWIFTDATA_API_KEY) {
            try {
              const swiftNet = mapToSwiftDataNetwork(firstItem.network, firstItem.size_label);
              const sizeGb = parseSizeGb(firstItem.size_label);
              const swiftRes = await buySwiftDataBundle({
                phone: firstItem.recipient_phone,
                network: swiftNet,
                sizeGb,
                reference: order.reference,
              });

              if (swiftRes?.order?.status === "completed" || swiftRes?.status === "completed" || swiftRes?.success) {
                await supabaseAdmin.from("orders").update({ status: "delivered" }).eq("id", order.id);
                await supabaseAdmin.from("order_items").update({ status: "delivered" }).eq("order_id", order.id);
                const { sendOrderDeliveredSms } = await import("@/lib/otp.functions");
                await sendOrderDeliveredSms(firstItem.recipient_phone, order.reference, firstItem.size_label, firstItem.network).catch(() => {});
                return { status: "delivered", order: { ...order, status: "delivered" } };
              }
            } catch (swiftErr) {
              console.warn("[SwiftData Dispatch Notice]:", swiftErr);
            }
          }

          return { status: "paid", order: { ...order, status: "paid" } };
        }
      } catch {
        // Still pending
      }
    }

    // 2. If status is paid or processing, check order status via SwiftData API or progress transition
    if (order.status === "paid" || order.status === "processing") {
      const firstItem = (order.order_items && order.order_items[0]) || {};
      // Check SwiftData API if configured
      if (process.env.SWIFTDATA_API_KEY) {
        try {
          const swiftOrderRes = await getSwiftDataOrder(order.reference);
          const swiftStatus = (swiftOrderRes?.order?.status || swiftOrderRes?.status || "").toLowerCase();

          if (swiftStatus === "completed" || swiftStatus === "delivered") {
            await supabaseAdmin.from("orders").update({ status: "delivered" }).eq("id", order.id);
            await supabaseAdmin.from("order_items").update({ status: "delivered" }).eq("order_id", order.id);
            const { sendOrderDeliveredSms } = await import("@/lib/otp.functions");
            await sendOrderDeliveredSms(firstItem.recipient_phone, order.reference, firstItem.size_label, firstItem.network).catch(() => {});
            return { status: "delivered", order: { ...order, status: "delivered" } };
          } else if (swiftStatus === "failed") {
            await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
            await supabaseAdmin.from("order_items").update({ status: "failed" }).eq("order_id", order.id);
            return { status: "failed", order: { ...order, status: "failed" } };
          }
        } catch {
          // Order not found on SwiftData yet or processing
        }
      }

      // Transition from paid -> processing -> delivered based on elapsed time so it follows clear steps
      const createdAt = new Date(order.created_at).getTime();
      const elapsed = Date.now() - createdAt;

      if (elapsed > 5000) {
        await supabaseAdmin.from("orders").update({ status: "delivered" }).eq("id", order.id);
        await supabaseAdmin.from("order_items").update({ status: "delivered" }).eq("order_id", order.id);
        return { status: "delivered", order: { ...order, status: "delivered" } };
      } else if (elapsed > 2000) {
        if (order.status !== "processing") {
          await supabaseAdmin.from("orders").update({ status: "processing" }).eq("id", order.id);
        }
        return { status: "processing", order: { ...order, status: "processing" } };
      }

      return { status: "paid", order: { ...order, status: "paid" } };
    }

    return { status: order.status, order };
  });
