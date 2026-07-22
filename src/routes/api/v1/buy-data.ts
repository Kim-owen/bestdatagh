import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateApiKey } from "./balance";

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "content-type": "application/json",
  };
}

const buyDataSchema = z.object({
  phone: z.string().min(9).max(15),
  network: z.enum(["yello", "at_ishare", "at_bigtime", "telecel"]),
  size_gb: z.number().positive(),
  reference: z.string().optional(),
});

const NETWORK_LABELS: Record<string, string> = {
  yello: "Yello",
  at_ishare: "AirtelTigo iShare",
  at_bigtime: "AirtelTigo Bigtime",
  telecel: "Telecel",
};

const PRICE_PER_GB: Record<string, number> = {
  yello: 4.50,
  at_ishare: 3.75,
  at_bigtime: 3.50,
  telecel: 4.20,
};

export const Route = createFileRoute("/api/v1/buy-data")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        const authResult = await authenticateApiKey(request);
        if ("error" in authResult) {
          return new Response(JSON.stringify({ success: false, error: authResult.error }), {
            status: authResult.status,
            headers: corsHeaders(),
          });
        }

        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ success: false, error: "Invalid JSON payload" }), {
            status: 400,
            headers: corsHeaders(),
          });
        }

        const parsed = buyDataSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Invalid request parameters. Required: phone, network, size_gb",
              details: parsed.error.flatten(),
            }),
            { status: 400, headers: corsHeaders() }
          );
        }

        const { phone, network, size_gb, reference: userRef } = parsed.data;
        const cleanPhone = phone.replace(/\s+/g, "");

        const pricePerGb = PRICE_PER_GB[network] || 4.50;
        const totalAmount = Number((pricePerGb * size_gb).toFixed(2));
        const reference = userRef || `ORD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        // Create order in database
        const { data: orderRow, error: orderErr } = await supabaseAdmin
          .from("orders")
          .insert({
            user_id: authResult.keyRow.user_id,
            reference,
            total_ghs: totalAmount,
            source: "api",
            status: "delivered", // Reseller instant fulfillment
          })
          .select("id, reference, status, total_ghs, created_at")
          .single();

        if (orderErr) {
          return new Response(
            JSON.stringify({ success: false, error: `Database order error: ${orderErr.message}` }),
            { status: 500, headers: corsHeaders() }
          );
        }

        // Insert order item record
        await supabaseAdmin.from("order_items").insert({
          order_id: orderRow.id,
          network: NETWORK_LABELS[network] || network,
          size_label: `${size_gb}GB`,
          recipient_phone: cleanPhone,
          unit_price_ghs: totalAmount,
          quantity: 1,
          status: "delivered",
        });

        // Update API key last_used_at timestamp
        await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", authResult.keyRow.id);

        return new Response(
          JSON.stringify({
            success: true,
            order: {
              reference: orderRow.reference,
              phone: cleanPhone,
              network,
              network_label: NETWORK_LABELS[network] || network,
              size_gb,
              amount: totalAmount,
              status: "completed",
            },
          }),
          { status: 200, headers: corsHeaders() }
        );
      },
    },
  },
});
