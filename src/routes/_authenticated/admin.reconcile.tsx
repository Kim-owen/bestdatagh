import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminReconcilePaystack } from "@/lib/admin.functions";
import { Banknote, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reconcile")({
  component: AdminReconcilePage,
});

function AdminReconcilePage() {
  const reconcile = useServerFn(adminReconcilePaystack);
  const { data: items, isLoading, refetch } = useQuery({
    queryKey: ["adminPaystackReconcile"],
    queryFn: () => reconcile(),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
            <Banknote className="h-6 w-6 text-primary" /> Paystack Reconciliation & Payout Ledger
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Verify real-time Paystack webhooks against order fulfillment status.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-xs font-bold hover:bg-muted transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Re-check Ledger
        </button>
      </div>

      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Amount Paid</th>
                <th className="px-6 py-4">Order Status</th>
                <th className="px-6 py-4">Paystack Ledger Status</th>
                <th className="px-6 py-4">Reconciliation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-medium">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Reconciling Paystack ledger…</td></tr>
              ) : !items || items.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No recent payment transactions found.</td></tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold">{item.reference}</td>
                    <td className="px-6 py-4 font-mono">{item.phone}</td>
                    <td className="px-6 py-4 font-black text-emerald-400">GH₵ {Number(item.amount_paid).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-black text-primary uppercase">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 uppercase">
                        {item.paystackStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                        <CheckCircle2 className="h-4 w-4" /> Reconciled
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
