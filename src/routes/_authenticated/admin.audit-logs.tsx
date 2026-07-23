import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListAuditLogs } from "@/lib/admin.functions";
import { ShieldCheck, Search, Calendar, UserCheck, Activity } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/audit-logs")({
  component: AdminAuditLogsPage,
});

function AdminAuditLogsPage() {
  const getLogs = useServerFn(adminListAuditLogs);
  const { data: logs, isLoading } = useQuery({
    queryKey: ["adminAuditLogs"],
    queryFn: () => getLogs(),
  });

  const [search, setSearch] = useState("");

  const filtered = (logs || []).filter(
    (l: any) =>
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.admin_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.target_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Security & Admin Audit Logs
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Immutable records of all administrative operations, setting changes, and financial actions.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search action or admin email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card pl-9 pr-4 py-2 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Admin Operator</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Target Type</th>
                <th className="px-6 py-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Loading security audit logs…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No audit logs found.</td>
                </tr>
              ) : (
                filtered.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground">
                      {log.admin_email || "System Admin"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-black text-primary font-mono uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground uppercase text-[11px]">
                      {log.target_type || "GLOBAL"}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-muted-foreground max-w-xs truncate">
                      {JSON.stringify(log.details || {})}
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
