import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Item = { bundle_id: string; recipient_phone: string; quantity?: number };

export const createBulkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { items: Item[]; source?: "web"|"bulk" }) => {
    if (!Array.isArray(d?.items) || d.items.length === 0) throw new Error("No items");
    if (d.items.length > 500) throw new Error("Max 500 items per bulk order");
    for (const it of d.items) {
      if (!it.bundle_id || !it.recipient_phone) throw new Error("Missing bundle_id or recipient_phone");
      if (!/^0?\d{9,12}$/.test(it.recipient_phone.replace(/\s+/g, ""))) throw new Error(`Invalid phone: ${it.recipient_phone}`);
    }
    return { items: d.items, source: d.source ?? "bulk" as const };
  })
  .handler(async ({ data, context }) => {
    const bundleIds = Array.from(new Set(data.items.map((i) => i.bundle_id)));
    const { data: bundles, error: be } = await context.supabase
      .from("bundles").select("id, network, size_label, price_ghs, active").in("id", bundleIds);
    if (be) throw new Error(be.message);
    const byId = new Map((bundles ?? []).map((b) => [b.id, b] as const));
    let total = 0;
    const rows = data.items.map((it) => {
      const b = byId.get(it.bundle_id);
      if (!b || !b.active) throw new Error(`Bundle unavailable: ${it.bundle_id}`);
      const qty = Math.max(1, it.quantity ?? 1);
      total += Number(b.price_ghs) * qty;
      return { bundle_id: b.id, network: b.network, size_label: b.size_label, recipient_phone: it.recipient_phone.trim(), unit_price_ghs: b.price_ghs, quantity: qty };
    });
    const { data: order, error: oe } = await context.supabase
      .from("orders").insert({ user_id: context.userId, total_ghs: total, source: data.source, status: "pending" })
      .select("id, reference").single();
    if (oe) throw new Error(oe.message);
    const { error: ie } = await context.supabase.from("order_items").insert(rows.map((r) => ({ ...r, order_id: order.id })));
    if (ie) throw new Error(ie.message);
    return { ok: true, order_id: order.id, reference: order.reference, total, count: rows.length };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
