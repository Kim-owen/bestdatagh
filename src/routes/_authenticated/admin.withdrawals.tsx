import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

  async function update(id: string, status: Row["status"], admin_note?: string) {
    setBusy(id);
    try {
      await adminUpdateWithdrawal({ data: { id, status, admin_note } });
      await load();
    } finally { setBusy(null); }
  }

  const filtered = filter === "all" ? rows : rows.filter(r => r.status === filter);
  const totals = {
    pending: rows.filter(r => r.status === "pending").reduce((s,r)=>s+Number(r.amount_ghs),0),
    paid: rows.filter(r => r.status === "paid").reduce((s,r)=>s+Number(r.amount_ghs),0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><BanknoteIcon className="h-6 w-6 text-primary" /> Withdrawals</h1>
          <p className="text-sm text-muted-foreground">Agent payout requests — approve, mark paid, or reject.</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-lg border border-border bg-card px-3 py-2">Pending: <b>GH₵ {totals.pending.toFixed(2)}</b></span>
          <span className="rounded-lg border border-border bg-card px-3 py-2">Paid: <b>GH₵ {totals.paid.toFixed(2)}</b></span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all","pending","approved","paid","rejected"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No requests.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Agent</th>
                  <th className="text-left px-4 py-3">Method</th>
                  <th className="text-left px-4 py-3">Destination</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const isOpen = expanded === r.id;
                  return (
                  <>
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      <button onClick={() => setExpanded(isOpen ? null : r.id)} className="inline-flex items-center gap-1 hover:text-foreground">
                        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {new Date(r.created_at).toLocaleString()}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.profiles?.display_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.profiles?.email ?? r.user_id.slice(0,8)}</div>
                    </td>
                    <td className="px-4 py-3">{r.method}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.destination}</td>
                    <td className="px-4 py-3 text-right font-bold">GH₵ {Number(r.amount_ghs).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                        r.status === "paid" ? "bg-emerald-500/15 text-emerald-500" :
                        r.status === "approved" ? "bg-blue-500/15 text-blue-500" :
                        r.status === "rejected" ? "bg-destructive/15 text-destructive" :
                        "bg-amber-500/15 text-amber-500"
                      }`}>{r.status}</span>
                      {r.admin_note && <div className="text-xs text-muted-foreground mt-1 max-w-[200px]">{r.admin_note}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {r.status !== "approved" && r.status !== "paid" && (
                          <button disabled={busy===r.id} onClick={() => update(r.id, "approved")} className="rounded-md bg-blue-500/15 text-blue-500 px-2 py-1 text-xs font-semibold hover:bg-blue-500/25 disabled:opacity-50">Approve</button>
                        )}
                        {r.status !== "paid" && (
                          <button disabled={busy===r.id} onClick={() => update(r.id, "paid")} className="rounded-md bg-emerald-500/15 text-emerald-500 px-2 py-1 text-xs font-semibold hover:bg-emerald-500/25 disabled:opacity-50">Mark paid</button>
                        )}
                        {r.status !== "rejected" && (
                          <button disabled={busy===r.id} onClick={() => {
                            const note = prompt("Reason for rejecting?") || undefined;
                            update(r.id, "rejected", note);
                          }} className="rounded-md bg-destructive/15 text-destructive px-2 py-1 text-xs font-semibold hover:bg-destructive/25 disabled:opacity-50">Reject</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={r.id + "-log"} className="bg-muted/20 border-t border-border">
                      <td colSpan={7}><WithdrawalAuditLog withdrawalId={r.id} /></td>
                    </tr>
                  )}
                  </>
                );})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
