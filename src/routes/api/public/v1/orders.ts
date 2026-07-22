import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { z } from "zod";

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "content-type": "application/json",
  };
}

const bodySchema = z.object({
  items: z.array(z.object({
    bundle_id: z.string().uuid(),
    recipient_phone: z.string().min(9).max(15),
    quantity: z.number().int().min(1).max(50).optional(),
  })).min(1).max(500),
});

export const Route = createFileRoute("/api/public/v1/orders")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") || "";
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        if (!token.startsWith("bd_live_")) {
          return new Response(JSON.stringify({ error: "Missing or invalid API key" }), { status: 401, headers: corsHeaders() });
        }
        const key_hash = createHash("sha256").update(token).digest("hex");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: keyRow } = await supabaseAdmin
          .from("api_keys").select("id,user_id,active").eq("key_hash", key_hash).maybeSingle();
        if (!keyRow || !keyRow.active) {
          return new Response(JSON.stringify({ error: "Invalid or revoked API key" }), { status: 401, headers: corsHeaders() });
        }

        let body: any;
        try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders() }); }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) return new Response(JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }), { status: 400, headers: corsHeaders() });

        const bundleIds = Array.from(new Set(parsed.data.items.map((i) => i.bundle_id)));
        const { data: bundles } = await supabaseAdmin.from("bundles").select("id,network,size_label,price_ghs,active").in("id", bundleIds);
        const byId = new Map((bundles ?? []).map((b) => [b.id, b] as const));
        let total = 0;
        const rows: any[] = [];
        for (const it of parsed.data.items) {
          const b = byId.get(it.bundle_id);
          if (!b || !b.active) return new Response(JSON.stringify({ error: `Bundle unavailable: ${it.bundle_id}` }), { status: 400, headers: corsHeaders() });
          const qty = it.quantity ?? 1;
          total += Number(b.price_ghs) * qty;
          rows.push({ bundle_id: b.id, network: b.network, size_label: b.size_label, recipient_phone: it.recipient_phone, unit_price_ghs: b.price_ghs, quantity: qty });
        }

        const { data: order, error: oe } = await supabaseAdmin.from("orders").insert({
          user_id: keyRow.user_id, total_ghs: total, source: "api", status: "pending",
        }).select("id,reference,status,total_ghs,created_at").single();
        if (oe) return new Response(JSON.stringify({ error: oe.message }), { status: 500, headers: corsHeaders() });
        const { error: ie } = await supabaseAdmin.from("order_items").insert(rows.map((r) => ({ ...r, order_id: order.id })));
        if (ie) return new Response(JSON.stringify({ error: ie.message }), { status: 500, headers: corsHeaders() });

        await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

        return new Response(JSON.stringify({ data: { ...order, items: rows } }), { status: 201, headers: corsHeaders() });
      },
    },
  },
});
