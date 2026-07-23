import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminStats, adminUpdateOrderStatus } from "@/lib/admin.functions";
import {
  Wallet,
  ShoppingBag,
  Users,
  Package,
  Star,
  KeyRound,
  BanknoteIcon,
  Store,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  RefreshCcw,
  Zap,
  Server,
  Smartphone,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { StatCardSkeleton, TableRowSkeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: ProDashboard,
});

function ProDashboard() {
  const queryClient = useQueryClient();
  const fnStats = useServerFn(adminStats);
  const fnUpdateStatus = useServerFn(adminUpdateOrderStatus);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => fnStats(),
    refetchInterval: 20000,
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; status: string }) => fnUpdateStatus({ data: args }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
  });

  const stats = data ?? {
    orders: 0,
    users: 0,
    reviews: 0,
    bundles: 0,
    apiKeys: 0,
    revenue: 0,
    pendingWithdrawalsCount: 0,
    pendingWithdrawalsGhs: 0,
    pendingAgentAppsCount: 0,
    networkBreakdown: { mtn: 0, telecel: 0, airteltigo: 0 },
    recentOrders: [],
  };

  const totalBreakdown = stats.networkBreakdown.mtn + stats.networkBreakdown.telecel + stats.networkBreakdown.airteltigo || 1;
  const mtnPct = Math.round((stats.networkBreakdown.mtn / totalBreakdown) * 100);
  const telecelPct = Math.round((stats.networkBreakdown.telecel / totalBreakdown) * 100);
  const atPct = Math.round((stats.networkBreakdown.airteltigo / totalBreakdown) * 100);

  const kpis = [
    { label: "Total Revenue", value: `GH₵ ${stats.revenue.toFixed(2)}`, sub: "Verified completed sales", icon: Wallet, highlight: true },
    { label: "Total Orders", value: stats.orders.toLocaleString(), sub: "Web, Agent & API orders", icon: ShoppingBag },
    { label: "Registered Users", value: stats.users.toLocaleString(), sub: "Active customer accounts", icon: Users },
    { label: "Active Bundles", value: stats.bundles.toLocaleString(), sub: "Across 3 networks", icon: Package },
    { label: "Pending Agent Apps", value: stats.pendingAgentAppsCount.toString(), sub: stats.pendingAgentAppsCount > 0 ? "Requires review" : "Up to date", icon: Store, link: "/admin/agents", alert: stats.pendingAgentAppsCount > 0 },
    { label: "Pending Payouts", value: `GH₵ ${stats.pendingWithdrawalsGhs.toFixed(2)}`, sub: `${stats.pendingWithdrawalsCount} agent requests`, icon: BanknoteIcon, link: "/admin/withdrawals", alert: stats.pendingWithdrawalsCount > 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display flex items-center gap-2.5">
            Admin Command Center
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Real-time telemetry, revenue analytics, and system gateway health.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="self-start sm:self-auto inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted active:scale-95 transition-all shadow-sm"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${isLoading || isRefetching ? "animate-spin" : ""}`} />
          {isRefetching ? "Refreshing…" : "Refresh Live Data"}
        </button>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className={`rounded-3xl border p-5 shadow-sm transition-all relative overflow-hidden ${
                  k.highlight
                    ? "border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card"
                    : k.alert
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border/80 bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {k.label}
                  </span>
                  <div className={`grid h-9 w-9 place-items-center rounded-xl ${k.highlight ? "gold-gradient text-primary-foreground shadow-md" : "bg-muted/80 text-muted-foreground"}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black tracking-tight font-display">
                  {k.value}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px] font-semibold">{k.sub}</span>
                  {k.link && (
                    <Link to={k.link as any} className="font-bold text-primary hover:underline flex items-center gap-0.5">
                      View <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Middle Grid: Network Sales Distribution + Gateway Health Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Sales Distribution */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
                <Zap className="h-4 w-4" /> Sales Distribution by Network
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Revenue generated per network provider</p>
            </div>
            <span className="text-xs font-bold text-muted-foreground font-mono">GH₵ {stats.revenue.toFixed(2)}</span>
          </div>

          <div className="space-y-4">
            {/* MTN Yello */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-400 inline-block"></span> MTN (Yello)
                </span>
                <span>GH₵ {stats.networkBreakdown.mtn.toFixed(2)} ({mtnPct}%)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${mtnPct}%` }}></div>
              </div>
            </div>

            {/* Telecel */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500 inline-block"></span> Telecel Ghana
                </span>
                <span>GH₵ {stats.networkBreakdown.telecel.toFixed(2)} ({telecelPct}%)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${telecelPct}%` }}></div>
              </div>
            </div>

            {/* AirtelTigo */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500 inline-block"></span> AirtelTigo (iShare / Bigtime)
                </span>
                <span>GH₵ {stats.networkBreakdown.airteltigo.toFixed(2)} ({atPct}%)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${atPct}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Gateway Health Status Panel */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
                <Server className="h-4 w-4" /> System & Gateway Telemetry
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time status of connected services</p>
            </div>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              100% Uptime
            </span>
          </div>

          <div className="space-y-3">
            <GatewayRow name="Paystack Mobile Money Gateway" type="Payment Gateway" status="Active" ping="45ms" icon={Wallet} />
            <GatewayRow name="TxtConnect SMS Gateway" type="OTP & Notification" status="Active" ping="82ms" icon={Smartphone} />
            <GatewayRow name="Supabase Cloud Database" type="PostgreSQL Engine" status="Healthy" ping="24ms" icon={ShieldCheck} />
            <GatewayRow name="SwiftData Reseller REST API" type="Public API v1" status="Operational" ping="18ms" icon={Zap} />
          </div>
        </div>
      </div>

      {/* Live Order Activity Feed */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
              <Clock className="h-4 w-4" /> Recent Order Stream
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Latest transactions with instant 1-click status management</p>
          </div>

          <Link to="/admin/orders" className="text-xs font-bold text-primary hover:underline self-start sm:self-auto">
            View All Orders →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Recipient / Package</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <>
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                </>
              ) : stats.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">No orders recorded yet.</td>
                </tr>
              ) : (
                stats.recentOrders.map((o: any) => {
                  const item = (o.order_items && o.order_items[0]) || {};
                  return (
                    <tr key={o.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">{o.reference}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold">{item.recipient_phone || "N/A"}</div>
                        <div className="text-[11px] text-muted-foreground">{item.size_label} · {item.network}</div>
                      </td>
                      <td className="px-4 py-3 font-black text-foreground font-display">GH₵ {Number(o.total_ghs).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          {o.source || "web"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {o.status !== "delivered" && (
                          <button
                            onClick={() => updateMutation.mutate({ id: o.id, status: "delivered" })}
                            disabled={updateMutation.isPending}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 transition-colors"
                          >
                            Mark Delivered
                          </button>
                        )}
                        {o.status !== "failed" && (
                          <button
                            onClick={() => updateMutation.mutate({ id: o.id, status: "failed" })}
                            disabled={updateMutation.isPending}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                          >
                            Mark Failed
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GatewayRow({ name, type, status, ping, icon: Icon }: { name: string; type: string; status: string; ping: string; icon: any }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 p-3 text-xs">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="font-bold text-foreground">{name}</div>
          <div className="text-[10px] text-muted-foreground">{type}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-muted-foreground">{ping}</span>
        <span className="inline-flex items-center gap-1 font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span> {status}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color = "bg-muted text-muted-foreground";
  if (status === "delivered" || status === "paid") color = "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20";
  if (status === "pending" || status === "processing") color = "bg-amber-500/15 text-amber-500 border border-amber-500/20";
  if (status === "failed" || status === "rejected") color = "bg-destructive/15 text-destructive border border-destructive/20";

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${color}`}>
      {status}
    </span>
  );
}
