import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminStats } from "@/lib/admin.functions";
import { ShoppingBag, Users, Star, Package, KeyRound, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const fn = useServerFn(adminStats);
  const { data, isLoading } = useQuery({ queryKey: ["adminStats"], queryFn: () => fn() });
  const stats = data ?? { orders: 0, users: 0, reviews: 0, bundles: 0, apiKeys: 0, revenue: 0 };
  const cards = [
    { label: "Revenue (GHS)", value: `₵${stats.revenue.toFixed(2)}`, icon: Wallet },
    { label: "Orders", value: stats.orders, icon: ShoppingBag },
    { label: "Users", value: stats.users, icon: Users },
    { label: "Bundles", value: stats.bundles, icon: Package },
    { label: "Reviews", value: stats.reviews, icon: Star },
    { label: "Active API Keys", value: stats.apiKeys, icon: KeyRound },
  ];
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">{isLoading ? "Loading…" : "Live metrics from your database."}</p>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</div>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-3xl font-extrabold">{c.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
