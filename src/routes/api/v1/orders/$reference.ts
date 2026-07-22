import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateApiKey } from "../balance";

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "content-type": "application/json",
  };
}

export const Route = createFileRoute("/api/v1/orders/$reference")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ params, request }) => {
        const authResult = await authenticateApiKey(request);
        if ("error" in authResult) {
          return new Response(JSON.stringify({ success: false, error: authResult.error }), {
            status: authResult.status,
            headers: corsHeaders(),
          });
        }

        const reference = params.reference;
        if (!reference) {
          return new Response(JSON.stringify({ success: false, error: "Missing order reference parameter" }), {
            status: 400,
            headers: corsHeaders(),
          });
        }

        const { data: o, error } = await supabaseAdmin
          .from("orders")
          .select("id, reference, total_ghs, status, created_at, order_items(network, size_label, recipient_phone, unit_price_ghs)")
          .eq("reference", reference)
          .maybeSingle();

        if (error || !o) {
          return new Response(JSON.stringify({ success: false, error: "Order not found" }), {
            status: 404,
            headers: corsHeaders(),
          });
        }

        const item = (o.order_items && o.order_items[0]) || {};
        const sizeGb = Number((item.size_label || "").replace(/[^\d.]/g, "")) || 1;

        let netId = "yello";
        const netLower = (item.network || "").toLowerCase();
        if (netLower.includes("telecel") || netLower.includes("vodafone")) netId = "telecel";
        else if (netLower.includes("ishare") || netLower.includes("airteltigo")) netId = "at_ishare";
        else if (netLower.includes("bigtime")) netId = "at_bigtime";

        return new Response(
          JSON.stringify({
            success: true,
            order: {
              reference: o.reference,
              phone: item.recipient_phone || "N/A",
              network: netId,
              network_label: item.network || "Yello",
              size_gb: sizeGb,
              amount: Number(o.total_ghs),
              status: o.status === "paid" || o.status === "delivered" ? "completed" : o.status,
              created_at: o.created_at,
            },
          }),
          { status: 200, headers: corsHeaders() }
        );
      },
    },
  },
});
