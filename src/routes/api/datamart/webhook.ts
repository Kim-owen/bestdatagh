import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createUserNotification } from "@/lib/agent.functions";
import { sendOrderDeliveredSms } from "@/lib/otp.functions";
import { formatDataMartRef } from "@/lib/datamart";

export const Route = createFileRoute("/api/datamart/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const sig = request.headers.get("x-datamart-signature");
          const secret = process.env.DATAMART_WEBHOOK_SECRET || "4272be57f2310c050aee1119b11fdecc893ca6b61029830d1d96511f74c6ea40";

          // Verify HMAC-SHA256 Signature if secret is configured
          if (secret && sig) {
            const crypto = await import("crypto");
            const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
            if (sig !== expected) {
              return new Response(JSON.stringify({ error: "Invalid HMAC signature" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
              });
            }
          }

          const payload = JSON.parse(rawBody);
          const event = payload.event || request.headers.get("x-datamart-event") || "";
          const eventData = payload.data || {};
          const rawReference = eventData.orderReference || eventData.ref || eventData.reference || "";

          if (!rawReference) {
            return new Response(JSON.stringify({ received: true, note: "No reference found in webhook payload" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Clean reference (strip prefix if configured or match directly)
          const prefix = process.env.DATAMART_REF_PREFIX || "";
          const cleanReference = prefix && rawReference.startsWith(prefix) ? rawReference.slice(prefix.length) : rawReference;

          // Fetch matching order from Supabase
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id, reference, user_id, status, order_items(network, size_label, recipient_phone)")
            .or(`reference.eq.${rawReference},reference.eq.${cleanReference}`)
            .maybeSingle();

          if (!order) {
            console.warn(`[DataMart Webhook]: Order not found for reference ${rawReference}`);
            return new Response(JSON.stringify({ received: true, warning: "Order not found" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          const firstItem = (order.order_items && order.order_items[0]) as any;

          // Process Event Statuses
          if (event === "order.completed" || eventData.status === "completed") {
            await supabaseAdmin.from("orders").update({ status: "delivered" }).eq("id", order.id);
            await supabaseAdmin.from("order_items").update({ status: "delivered" }).eq("order_id", order.id);

            if (firstItem) {
              await sendOrderDeliveredSms(firstItem.recipient_phone, order.reference, firstItem.size_label, firstItem.network).catch(() => {});
            }

            if (order.user_id && firstItem) {
              await createUserNotification({
                userId: order.user_id,
                type: "order_delivered",
                title: "Data Bundle Delivered 🚀",
                body: `Your ${firstItem.network} ${firstItem.size_label} bundle has been delivered to ${firstItem.recipient_phone}. Ref: ${order.reference}`,
                link: `/track-order?ref=${order.reference}`,
              }).catch(() => {});
            }

            console.log(`[DataMart Webhook]: Order ${order.reference} updated to DELIVERED.`);
          } else if (event === "order.failed" || event === "order.refunded" || eventData.status === "failed") {
            await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
            await supabaseAdmin.from("order_items").update({ status: "failed" }).eq("order_id", order.id);

            if (order.user_id) {
              await createUserNotification({
                userId: order.user_id,
                type: "order_failed",
                title: "Order Fulfillment Failed ⚠️",
                body: `Order #${order.reference} could not be delivered. Please contact support.`,
                link: `/track-order?ref=${order.reference}`,
              }).catch(() => {});
            }

            console.log(`[DataMart Webhook]: Order ${order.reference} updated to FAILED.`);
          }

          return new Response(JSON.stringify({ received: true, event, reference: order.reference }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("[DataMart Webhook Error]:", err.message);
          return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
