import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyPaystackWebhookSignature, verifyPaystackTransaction } from "@/lib/paystack";
import { createUserNotification } from "@/lib/agent.functions";
import { getSwiftDataApiKey, buySwiftDataBundle, mapToSwiftDataNetwork, parseSizeGb } from "@/lib/swiftdata";
import { dispatchDataBundle } from "@/lib/provider-dispatch";
import { sendOrderDeliveredSms, sendDepositSuccessSms, sendOrderProcessingSms } from "@/lib/otp.functions";

export const Route = createFileRoute("/api/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const signature = request.headers.get("x-paystack-signature");

          // 1. Verify HMAC SHA512 signature
          const isValidSignature = verifyPaystackWebhookSignature(rawBody, signature);
          if (!isValidSignature) {
            console.warn("Paystack Webhook: Invalid HMAC SHA512 signature.");
            return new Response(JSON.stringify({ error: "Invalid signature" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const payload = JSON.parse(rawBody);
          const event = payload.event;
          const eventData = payload.data;

          console.log(`Paystack Webhook Received: ${event}`);

          // 2. Handle Payment Success Event
          if (event === "charge.success") {
            const reference = eventData.reference;
            if (reference) {
              // Perform server-side double verification call to Paystack
              const paystackVerify = await verifyPaystackTransaction(reference);

              if (paystackVerify.data.status === "success") {
                const paidGhs = paystackVerify.data.amount / 100;
                const metadata = paystackVerify.data.metadata || {};

                // A. Handle Wallet Deposit
                if (reference.startsWith("DEP-") || metadata.type === "wallet_deposit") {
                  // Standardize base reference if sub-reference was used
                  const baseRef = reference.split("-R")[0].split("-F")[0];
                  
                  const { data: existingTx } = await (supabaseAdmin as any)
                    .from("wallet_transactions")
                    .select("id, user_id, status")
                    .or(`reference.eq.${reference},reference.eq.${baseRef}`)
                    .maybeSingle();

                  const targetUserId = existingTx?.user_id || metadata.user_id;

                  if (existingTx && existingTx.status !== "completed") {
                    const netCreditGhs = Number(existingTx.amount_ghs || paidGhs);
                    // Atomically lock and update status from pending -> completed
                    const { data: updatedTx } = await (supabaseAdmin as any)
                      .from("wallet_transactions")
                      .update({ status: "completed", amount_ghs: netCreditGhs })
                      .eq("id", existingTx.id)
                      .eq("status", "pending")
                      .select()
                      .maybeSingle();

                    if (updatedTx && targetUserId) {
                      const { data: curWallet } = await (supabaseAdmin as any)
                        .from("wallets")
                        .select("balance_ghs")
                        .eq("user_id", targetUserId)
                        .maybeSingle();

                      const newBal = Number(curWallet?.balance_ghs || 0) + netCreditGhs;

                      await (supabaseAdmin as any)
                        .from("wallets")
                        .upsert({ user_id: targetUserId, balance_ghs: newBal, updated_at: new Date().toISOString() });

                      await createUserNotification({
                        userId: targetUserId,
                        type: "wallet_deposit",
                        title: "Wallet Deposit Confirmed 💳",
                        body: `GH₵ ${netCreditGhs.toFixed(2)} has been added to your wallet. Ref: ${reference}`,
                        link: "/account",
                      });

                      const { data: userProf } = await supabaseAdmin.from("profiles").select("phone").eq("id", targetUserId).maybeSingle();
                      if (userProf?.phone) {
                        await sendDepositSuccessSms(userProf.phone, netCreditGhs, reference, newBal).catch(() => {});
                      }

                      console.log(`Paystack Webhook: Wallet deposit ${reference} credited net GH₵ ${netCreditGhs} to user ${targetUserId}.`);
                    }
                  } else if (!existingTx && targetUserId) {
                    const netCreditGhs = Number((paidGhs / 1.03).toFixed(2));
                    const { data: curWallet } = await (supabaseAdmin as any)
                      .from("wallets")
                      .select("balance_ghs")
                      .eq("user_id", targetUserId)
                      .maybeSingle();

                    const newBal = Number(curWallet?.balance_ghs || 0) + netCreditGhs;

                    await (supabaseAdmin as any)
                      .from("wallets")
                      .upsert({ user_id: targetUserId, balance_ghs: newBal, updated_at: new Date().toISOString() });

                    await (supabaseAdmin as any).from("wallet_transactions").insert({
                      user_id: targetUserId,
                      amount_ghs: netCreditGhs,
                      type: "deposit",
                      reference,
                      status: "completed",
                      description: `Paystack Deposit (${reference})`,
                    });

                    await createUserNotification({
                      userId: targetUserId,
                      type: "wallet_deposit",
                      title: "Wallet Deposit Confirmed 💳",
                      body: `GH₵ ${netCreditGhs.toFixed(2)} has been added to your wallet. Ref: ${reference}`,
                      link: "/account",
                    });

                    const { data: userProf } = await supabaseAdmin.from("profiles").select("phone").eq("id", targetUserId).maybeSingle();
                    if (userProf?.phone) {
                      await sendDepositSuccessSms(userProf.phone, netCreditGhs, reference, newBal).catch(() => {});
                    }

                    console.log(`Paystack Webhook: New wallet deposit ${reference} created & credited net GH₵ ${netCreditGhs} to user ${targetUserId}.`);
                  }
                } else {
                  // B. Handle Standard Order Payment
                  const { data: order } = await supabaseAdmin
                    .from("orders")
                    .select("id, reference, total_ghs, status, user_id, order_items(network, size_label, recipient_phone)")
                    .eq("reference", reference)
                    .maybeSingle();

                  if (order && (order.status === "pending" || order.status === "failed")) {
                    if (Math.abs(paidGhs - Number(order.total_ghs)) <= 0.01) {
                      await supabaseAdmin
                        .from("orders")
                        .update({ status: "paid" })
                        .eq("id", order.id);

                      await supabaseAdmin
                        .from("order_items")
                        .update({ status: "processing" })
                        .eq("order_id", order.id);

                      if (order.user_id) {
                        await createUserNotification({
                          userId: order.user_id,
                          type: "order_paid",
                          title: "Payment Received 🛍️",
                          body: `Order #${order.reference} (GH₵ ${paidGhs.toFixed(2)}) is confirmed paid and being processed.`,
                          link: `/track-order?ref=${order.reference}`,
                        });
                      }

                      // Automated dispatch via Provider API (DataMart / SwiftData)
                      const firstItem = (order.order_items && order.order_items[0]) as any;
                      if (firstItem) {
                        // Send immediate processing SMS alert to payer/recipient
                        await sendOrderProcessingSms(firstItem.recipient_phone, order.reference, firstItem.size_label, firstItem.network).catch(() => {});

                        try {
                          const dispatchRes = await dispatchDataBundle({
                            phone: firstItem.recipient_phone,
                            network: firstItem.network,
                            sizeLabel: firstItem.size_label,
                            reference: order.reference,
                          });

                          if (dispatchRes.success && dispatchRes.status === "completed") {
                            await supabaseAdmin.from("orders").update({ status: "delivered" }).eq("id", order.id);
                            await supabaseAdmin.from("order_items").update({ status: "delivered" }).eq("order_id", order.id);
                            await sendOrderDeliveredSms(firstItem.recipient_phone, order.reference, firstItem.size_label, firstItem.network).catch(() => {});
                            
                            if (order.user_id) {
                              await createUserNotification({
                                userId: order.user_id,
                                type: "order_delivered",
                                title: "Data Bundle Delivered 🚀",
                                body: `Your ${firstItem.network} ${firstItem.size_label} bundle has been delivered to ${firstItem.recipient_phone}. Ref: ${order.reference}`,
                                link: `/track-order?ref=${order.reference}`,
                              });
                            }
                          }
                        } catch (dispatchErr) {
                          console.warn("[Provider Webhook Dispatch Warning]:", dispatchErr);
                        }
                      }

                      console.log(`Paystack Webhook: Order ${reference} updated to PAID.`);
                    } else {
                      console.error(`Paystack Webhook Mismatch: Order ${reference} expected ${order.total_ghs} GHS but received ${paidGhs} GHS.`);
                    }
                  }
                }
              }
            }
          }

          // 3. Handle Agent Payout / Transfer Events
          if (event === "transfer.success" || event === "transfer.failed") {
            const transferRef = eventData.reference;
            const isSuccess = event === "transfer.success";
            const newStatus = isSuccess ? "paid" : "rejected";

            if (transferRef) {
              // Find withdrawal record by ID or reference in notes/destination
              const { data: withdrawal } = await supabaseAdmin
                .from("withdrawals")
                .select("id, user_id, amount_ghs, status")
                .or(`id.eq.${transferRef},notes.ilike.%${transferRef}%`)
                .maybeSingle();

              if (withdrawal) {
                await supabaseAdmin
                  .from("withdrawals")
                  .update({
                    status: newStatus,
                    processed_at: new Date().toISOString(),
                    admin_note: `Paystack Transfer ${eventData.transfer_code || ""}: ${eventData.reason || event}`,
                  })
                  .eq("id", withdrawal.id);

                // Insert withdrawal audit event
                await (supabaseAdmin as any).from("withdrawal_events").insert({
                  withdrawal_id: withdrawal.id,
                  event_type: isSuccess ? "payout_completed" : "payout_failed",
                  actor_user_id: withdrawal.user_id,
                  notes: `Automated Paystack transfer ${eventData.transfer_code || ""} ${isSuccess ? "succeeded" : "failed"}.`,
                });

                console.log(`Paystack Webhook: Withdrawal ${withdrawal.id} marked as ${newStatus}.`);
              }
            }
          }

          // Return 200 OK to Paystack
          return new Response(JSON.stringify({ status: "success" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("Paystack Webhook Error:", err.message);
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
