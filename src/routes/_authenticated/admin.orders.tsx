import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListOrders, adminUpdateOrderStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/orders")({ component: OrdersPage });

const STATUSES = ["pending","processing","delivered","failed","refunded"] as const;

function OrdersPage() {
  const list = useServerFn(adminListOrders);
  const upd = useServerFn(adminUpdateOrderStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["adminOrders"], queryFn: () => list() });
  const m = useMutation({
    mutationFn: (v: { id: string; status: string }) => upd({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminOrders"] }),
  });
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">Update status to reflect delivery.</p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>
            <th className="p-3">Reference</th><th className="p-3">Total</th><th className="p-3">Source</th><th className="p-3">Items</th><th className="p-3">Status</th><th className="p-3">Created</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td className="p-4" colSpan={6}>Loading…</td></tr>}
            {(data ?? []).map((o: any) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{o.reference}</td>
                <td className="p-3 font-semibold">₵{Number(o.total_ghs).toFixed(2)}</td>
                <td className="p-3"><span className="rounded bg-muted px-2 py-0.5 text-xs">{o.source}</span></td>
                <td className="p-3">{o.order_items?.length ?? 0}</td>
                <td className="p-3">
                  <select value={o.status} disabled={m.isPending} onChange={(e) => m.mutate({ id: o.id, status: e.target.value })} className="rounded border border-border bg-background px-2 py-1 text-xs">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
