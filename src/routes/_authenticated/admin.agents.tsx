import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListAgentApps, adminDecideAgentApp } from "@/lib/admin.functions";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/agents")({
  head: () => ({ meta: [{ title: "Agent applications — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminAgentApps,
});

function AdminAgentApps() {
  const qc = useQueryClient();
  const fetchList = useServerFn(adminListAgentApps);
  const decide = useServerFn(adminDecideAgentApp);
  const { data, isLoading } = useQuery({ queryKey: ["admin-agent-apps"], queryFn: () => fetchList() });
  const m = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) => decide({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-agent-apps"] }); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Agent applications</h1>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="p-3">Applicant</th><th className="p-3">Contact</th><th className="p-3">Region</th>
                <th className="p-3">Volume</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((a: any) => (
                <tr key={a.id} className="border-t border-border align-top">
                  <td className="p-3">
                    <div className="font-bold">{a.full_name}</div>
                    {a.note && <div className="mt-1 text-xs text-muted-foreground line-clamp-2 max-w-xs">{a.note}</div>}
                  </td>
                  <td className="p-3 text-xs">{a.phone}</td>
                  <td className="p-3 text-xs">{a.region}</td>
                  <td className="p-3 text-xs">{a.monthly_volume ?? "—"}</td>
                  <td className="p-3">
                    {a.status === "approved" ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Approved</span>
                      : a.status === "rejected" ? <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive"><XCircle className="h-3 w-3" /> Rejected</span>
                      : <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-600"><Clock className="h-3 w-3" /> Pending</span>}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-2">
                      <button disabled={m.isPending || a.status === "approved"} onClick={() => m.mutate({ id: a.id, approve: true })} className="rounded-md gold-gradient px-3 py-1 text-xs font-bold text-primary-foreground disabled:opacity-40">Approve</button>
                      <button disabled={m.isPending || a.status === "rejected"} onClick={() => m.mutate({ id: a.id, approve: false })} className="rounded-md border border-border px-3 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-40">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!data || data.length === 0) && <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">No applications yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
