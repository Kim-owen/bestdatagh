import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminGetProfitAnalytics } from "@/lib/admin.functions";
import { TrendingUp, PieChart, DollarSign, Percent, ArrowUpRight } from "lucide-react";
import { NetworkLogo } from "@/components/site/NetworkLogos";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const getAnalytics = useServerFn(adminGetProfitAnalytics);
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["adminProfitAnalytics"],
    queryFn: () => getAnalytics(),
  });

  const stats = analytics?.networkStats || {
    MTN: { revenue: 0, cost: 0, profit: 0, count: 0 },
    Telecel: { revenue: 0, cost: 0, profit: 0, count: 0 },
    AirtelTigo: { revenue: 0, cost: 0, profit: 0, count: 0 },
  };

  const totalRevenue = Object.values(stats).reduce((acc, curr) => acc + curr.revenue, 0);
  const totalProfit = Object.values(stats).reduce((acc, curr) => acc + curr.profit, 0);

  return (
    <div className="space-y-8">
      <div className="border-b border-border/50 pb-4">
        <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" /> Advanced Profit Analytics & Net Margins
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Real-time profit vs cost breakdown per Ghana network (MTN, Telecel, AirtelTigo).
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Total Gross Sales</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-foreground font-display">
            GH₵ {totalRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5" /> Gross customer receipts
          </div>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Estimated Net Profit (12% Margin)</span>
            <Percent className="h-4 w-4 text-[hsl(48_100%_60%)]" />
          </div>
          <div className="text-3xl font-black text-[hsl(48_100%_60%)] font-display">
            GH₵ {totalProfit.toFixed(2)}
          </div>
          <div className="text-[11px] text-[hsl(48_100%_60%)]/80 font-bold">
            Net profit after wholesale cost
          </div>
        </div>
      </div>

      {/* Network Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(["MTN", "Telecel", "AirtelTigo"] as const).map((net) => {
          const item = stats[net] || { revenue: 0, cost: 0, profit: 0, count: 0 };
          return (
            <div key={net} className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/50 pb-3">
                <NetworkLogo network={net} className="h-7 w-7" />
                <div>
                  <h3 className="font-extrabold text-sm font-display">{net} Network</h3>
                  <div className="text-[10px] text-muted-foreground font-bold">{item.count} Orders Completed</div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Sales:</span>
                  <span className="font-extrabold">GH₵ {item.revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wholesale Cost:</span>
                  <span className="font-mono text-muted-foreground">GH₵ {item.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-2">
                  <span className="font-bold text-foreground">Net Profit:</span>
                  <span className="font-black text-emerald-400 font-display">GH₵ {item.profit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
