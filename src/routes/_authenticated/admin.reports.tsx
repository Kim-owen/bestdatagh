import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminGetReportData } from "@/lib/admin.functions";
import { Download, FileSpreadsheet, Calendar, Table, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const getReports = useServerFn(adminGetReportData);
  const { data: report, isLoading } = useQuery({
    queryKey: ["adminReportData"],
    queryFn: () => getReports(),
  });

  const downloadCsv = (filename: string, rows: any[]) => {
    if (!rows || rows.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = Object.keys(rows[0]).join(",");
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-border/50 pb-4">
        <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-primary" /> One-Click CSV Accounting & Financial Reports
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Export full database audits for tax preparation, revenue reconciliation, and inventory tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Export Orders CSV */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm font-display">Sales & Orders Ledger</h3>
              <span className="font-mono text-xs font-bold text-primary">{report?.orders?.length || 0} Records</span>
            </div>
            <p className="text-xs text-muted-foreground">Export all order references, phone numbers, networks, amounts paid, and dispatch timestamps.</p>
          </div>
          <button
            onClick={() => downloadCsv("BestData_Orders_Report", report?.orders || [])}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl gold-gradient py-3 text-xs font-black text-primary-foreground shadow-md hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Download className="h-4 w-4" /> Download Orders CSV
          </button>
        </div>

        {/* Export Agent Applications CSV */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm font-display">Reseller Agent Roster</h3>
              <span className="font-mono text-xs font-bold text-emerald-400">{report?.agents?.length || 0} Agents</span>
            </div>
            <p className="text-xs text-muted-foreground">Export verified reseller agents, contact phones, regions, monthly volume estimates, and approval status.</p>
          </div>
          <button
            onClick={() => downloadCsv("BestData_Agents_Roster", report?.agents || [])}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-xs font-bold hover:bg-muted transition-all"
          >
            <Download className="h-4 w-4" /> Download Agents CSV
          </button>
        </div>

        {/* Export API Keys CSV */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm font-display">Developer API Keys Audit</h3>
              <span className="font-mono text-xs font-bold text-amber-400">{report?.apiKeys?.length || 0} Keys</span>
            </div>
            <p className="text-xs text-muted-foreground">Export reseller developer key prefixes, creation dates, user IDs, and active status.</p>
          </div>
          <button
            onClick={() => downloadCsv("BestData_APIKeys_Audit", report?.apiKeys || [])}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-xs font-bold hover:bg-muted transition-all"
          >
            <Download className="h-4 w-4" /> Download API Keys CSV
          </button>
        </div>
      </div>
    </div>
  );
}
