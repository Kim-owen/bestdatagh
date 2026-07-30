import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createUserNotification } from "@/lib/agent.functions";
import { sendOrderDeliveredSms } from "@/lib/otp.functions";
import { sendTransactionalEmail } from "@/lib/email.functions";

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-api-key",
    "content-type": "application/json",
  };
}

export const Route = createFileRoute("/api/v1/orders/callback")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const reference = String(body.reference || body.orderId || body.order_id || "").trim();
          const rawStatus = String(body.status || body.delivery_status || "").toLowerCase().trim();
          const message = String(body.message || body.note || "").trim();

          if (!reference) {
            return new Response(JSON.stringify({ success: false, error: "Missing required parameter: reference" }), {
              status: 400,
              headers: corsHeaders(),
            });
          }

          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id, reference, status, user_id, customer_email, order_items(network, size_label, recipient_phone)")
            .eq("reference", reference)
            .maybeSingle();

          if (!order) {
            return new Response(JSON.stringify({ success: false, error: `Order not found for reference: ${reference}` }), {
              status: 404,
              headers: corsHeaders(),
            });
          }

          const firstItem = (order.order_items && order.order_items[0]) as any;

          if (rawStatus === "completed" || rawStatus === "delivered" || rawStatus === "success") {
            await supabaseAdmin.from("orders").update({ status: "delivered" }).eq("id", order.id);
            await supabaseAdmin.from("order_items").update({ status: "delivered" }).eq("order_id", order.id);

            if (firstItem) {
              await sendOrderDeliveredSms(firstItem.recipient_phone, order.reference, firstItem.size_label, firstItem.network).catch(() => {});
            }

            if (order.user_id) {
              await createUserNotification({
                userId: order.user_id,
                type: "order_delivered",
                title: "Data Bundle Delivered 🚀",
                body: firstItem
                  ? `Your ${firstItem.network} ${firstItem.size_label} bundle has been delivered to ${firstItem.recipient_phone}. Ref: ${order.reference}`
                  : `Your data bundle order #${order.reference} has been successfully delivered.`,
                link: `/track-order?ref=${order.reference}`,
              });
            }

            if ((order as any).customer_email) {
              await sendTransactionalEmail({
                to: (order as any).customer_email,
                subject: `Data Bundle Delivered 🚀 - Order #${order.reference}`,
                badge: "Delivered",
                title: "Your Data Has Been Delivered! 🚀",
                bodyText: firstItem
                  ? `Your ${firstItem.network} ${firstItem.size_label} bundle has been successfully credited to ${firstItem.recipient_phone}.`
                  : `Your data order #${order.reference} has been delivered.`,
                actionUrl: `https://ghana-data-hub-gold.vercel.app/track-order?ref=${order.reference}`,
                actionText: "View Order Receipt",
                details: firstItem
                  ? [
                      { label: "Reference", value: order.reference },
                      { label: "Recipient Phone", value: firstItem.recipient_phone },
                      { label: "Network", value: firstItem.network },
                      { label: "Package", value: firstItem.size_label },
                    ]
                  : [{ label: "Reference", value: order.reference }],
              }).catch(() => {});
            }

            return new Response(JSON.stringify({ success: true, status: "delivered", reference: order.reference }), {
              status: 200,
              headers: corsHeaders(),
            });
          } else if (rawStatus === "failed" || rawStatus === "rejected") {
            await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
            await supabaseAdmin.from("order_items").update({ status: "failed" }).eq("order_id", order.id);

            if (order.user_id) {
              await createUserNotification({
                userId: order.user_id,
                type: "order_failed",
                title: "Order Fulfillment Issue ⚠️",
                body: `Order #${order.reference} failed delivery${message ? `: ${message}` : ""}. Please contact support or check order tracking.`,
                link: `/track-order?ref=${order.reference}`,
              });
            }

            return new Response(JSON.stringify({ success: true, status: "failed", reference: order.reference }), {
              status: 200,
              headers: corsHeaders(),
            });
          } else {
            await supabaseAdmin.from("orders").update({ status: "processing" }).eq("id", order.id);
            await supabaseAdmin.from("order_items").update({ status: "processing" }).eq("order_id", order.id);

            return new Response(JSON.stringify({ success: true, status: "processing", reference: order.reference }), {
              status: 200,
              headers: corsHeaders(),
            });
          }
        } catch (err: any) {
          console.error("API Delivery Callback Error:", err.message);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: corsHeaders(),
          });
        }
      },
    },
  },
});
