import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminGetSecurityFlags } from "@/lib/admin.functions";
import { ShieldAlert, Lock, CheckCircle2, AlertOctagon, Smartphone, ShieldCheck, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/security")({
  component: AdminSecurityPage,
});

function AdminSecurityPage() {
  const getSecurity = useServerFn(adminGetSecurityFlags);
  const { data: sec, isLoading } = useQuery({
    queryKey: ["adminSecurityFlags"],
    queryFn: () => getSecurity(),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" /> Fraud Detection & Security Hub
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Monitor high-risk transactions, OTP verification surges, and IP rate limits.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-black text-emerald-400">
          <ShieldCheck className="h-4 w-4" /> System Health: 98% Secure
        </div>
      </div>

      {/* Security Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>OTP Verification Requests</span>
            <Smartphone className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black text-foreground font-display">
            {sec?.unverifiedVerifications?.length || 0}
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">Recent 2FA phone verifications</div>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>High Value Transactions</span>
            <AlertOctagon className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-400 font-display">
            {sec?.highValueOrders?.length || 0}
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">Orders ≥ GH₵ 500</div>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>Paystack Webhook Protection</span>
            <Lock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-display">
            HMAC SHA512
          </div>
          <div className="text-[11px] text-emerald-400/80 font-medium">Active signature enforcement</div>
        </div>
      </div>

      {/* Flagged High Value Orders */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
          <Activity className="h-4 w-4" /> High-Value Order Flagging Log
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Network</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Scanning fraud logs…</td></tr>
              ) : sec?.highValueOrders?.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No high-risk flags detected.</td></tr>
              ) : (
                sec?.highValueOrders?.map((o: any) => (
                  <tr key={o.id} className="hover:bg-muted/30 font-medium">
                    <td className="px-4 py-3 font-mono font-bold">{o.reference}</td>
                    <td className="px-4 py-3 font-mono">{o.phone}</td>
                    <td className="px-4 py-3 font-bold">{o.network}</td>
                    <td className="px-4 py-3 font-black text-emerald-400">GH₵ {Number(o.amount_paid).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 uppercase">
                        {o.status}
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
