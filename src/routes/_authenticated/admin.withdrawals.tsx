import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, Fragment } from "react";
import { adminListWithdrawals, adminUpdateWithdrawal } from "@/lib/agent.functions";
import { BanknoteIcon, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { WithdrawalAuditLog } from "@/components/site/WithdrawalAuditLog";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  head: () => ({ meta: [{ title: "Withdrawals — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminWithdrawals,
});

type Row = {
  id: string; user_id: string; amount_ghs: number | string; method: string; destination: string;
  notes: string | null; status: "pending"|"approved"|"paid"|"rejected"; admin_note: string | null;
  processed_at: string | null; created_at: string;
  profiles?: { display_name: string | null; email: string | null } | null;
};

function AdminWithdrawals() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const d = await adminListWithdrawals();
    setRows(d as any);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function update(id: string, status: Row["status"], admin_note?: string, refundToWallet?: boolean) {
    setBusy(id);
    setNotice(null);
    try {
      await adminUpdateWithdrawal({ data: { id, status, admin_note, refundToWallet } });
      if (status === "approved" || status === "paid") {
        setNotice({ type: "success", text: `Automated Paystack transfer initiated and request updated to ${status}.` });
      } else if (refundToWallet) {
        setNotice({ type: "success", text: "Withdrawal rejected and funds successfully returned to the user's wallet balance!" });
      } else {
        setNotice({ type: "success", text: `Withdrawal request updated to ${status}.` });
      }
      await load();
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Failed to update withdrawal request" });
    } finally {
      setBusy(null);
    }
  }

  const filtered = filter === "all" ? rows : rows.filter(r => r.status === filter);
  const totals = {
    pending: rows.filter(r => r.status === "pending").reduce((s,r)=>s+Number(r.amount_ghs),0),
    paid: rows.filter(r => r.status === "paid" || r.status === "approved").reduce((s,r)=>s+Number(r.amount_ghs),0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><BanknoteIcon className="h-6 w-6 text-primary" /> Withdrawals & Payouts</h1>
          <p className="text-sm text-muted-foreground">Automated Paystack MoMo payouts & agent wallet refunds.</p>
        </div>
        <div className="flex gap-2 text-xs font-mono">
          <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 px-3.5 py-2 font-bold">Pending: GH₵ {totals.pending.toFixed(2)}</span>
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-3.5 py-2 font-bold">Paid Out: GH₵ {totals.paid.toFixed(2)}</span>
        </div>
      </div>

      {notice && (
        <div className={`rounded-2xl p-4 text-xs font-mono flex items-center justify-between animate-in fade-in ${
          notice.type === "success" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
        }`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {["all","pending","approved","paid","rejected"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-extrabold capitalize transition-all ${filter === s ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-10 grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No withdrawal requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-black tracking-wider border-b border-border/50">
                <tr>
                  <th className="px-4 py-3.5">Date & ID</th>
                  <th className="px-4 py-3.5">Agent Details</th>
                  <th className="px-4 py-3.5">Method</th>
                  <th className="px-4 py-3.5">Destination MoMo</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Paystack & Wallet Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-mono">
                {filtered.map(r => {
                  const isOpen = expanded === r.id;
                  const isBusy = busy === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr className="hover:bg-muted/30 transition-colors align-top">
                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                          <button onClick={() => setExpanded(isOpen ? null : r.id)} className="inline-flex items-center gap-1 hover:text-foreground font-bold">
                            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            {new Date(r.created_at).toLocaleDateString()}
                          </button>
                          <div className="text-[10px] opacity-60 font-mono">{r.id.slice(0, 8)}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-foreground font-sans">{r.profiles?.display_name ?? "Agent"}</div>
                          <div className="text-[11px] text-muted-foreground">{r.profiles?.email ?? r.user_id.slice(0,8)}</div>
                        </td>
                        <td className="px-4 py-3.5 font-bold uppercase">{r.method}</td>
                        <td className="px-4 py-3.5 font-bold text-amber-400">{r.destination}</td>
                        <td className="px-4 py-3.5 text-right font-black text-emerald-400 font-display">GH₵ {Number(r.amount_ghs).toFixed(2)}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            r.status === "paid" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                            r.status === "approved" ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" :
                            r.status === "rejected" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                            "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}>{r.status}</span>
                          {r.admin_note && <div className="text-[11px] text-muted-foreground mt-1 max-w-[220px] leading-tight">{r.admin_note}</div>}
                        </td>
                        <td className="px-4 py-3.5 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {r.status === "pending" && (
                              <>
                                <button
                                  disabled={isBusy}
                                  onClick={() => update(r.id, "approved")}
                                  className="rounded-xl gold-gradient px-3 py-1.5 text-xs font-black text-slate-950 shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1"
                                >
                                  {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : "⚡ Approve & Paystack Transfer"}
                                </button>

                                <button
                                  disabled={isBusy}
                                  onClick={() => {
                                    const note = prompt("Reason for returning to wallet?") || "Returned to wallet";
                                    update(r.id, "rejected", note, true);
                                  }}
                                  className="rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 px-3 py-1.5 text-xs font-bold disabled:opacity-50 transition-all"
                                >
                                  ↺ Send Back to Wallet
                                </button>

                                <button
                                  disabled={isBusy}
                                  onClick={() => {
                                    const note = prompt("Reason for rejecting?") || "Rejected";
                                    update(r.id, "rejected", note, false);
                                  }}
                                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-2.5 py-1.5 text-xs font-bold disabled:opacity-50 transition-all"
                                >
                                  ✕ Reject
                                </button>
                              </>
                            )}

                            {r.status === "approved" && (
                              <button
                                disabled={isBusy}
                                onClick={() => update(r.id, "paid")}
                                className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 text-xs font-bold hover:bg-emerald-500/30 disabled:opacity-50"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-muted/20 border-t border-border">
                          <td colSpan={7} className="p-4"><WithdrawalAuditLog withdrawalId={r.id} /></td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
