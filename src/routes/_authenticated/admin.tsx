import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminStats } from "@/lib/admin.functions";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  Star,
  KeyRound,
  ArrowLeft,
  Store,
  BanknoteIcon,
  ShieldCheck,
  Bell,
  Menu,
  X,
  ExternalLink,
  Activity,
  UserCheck,
  Settings,
  Film,
  ShieldAlert,
  MessageSquare,
  Banknote,
  TrendingUp,
  LifeBuoy,
  FileSpreadsheet,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminShell,
});

function AdminShell() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Query live admin stats for badges
  const fnStats = useServerFn(adminStats);
  const { data: statsData } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => fnStats(),
    enabled: ok,
    refetchInterval: 30000,
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        nav({ to: "/auth", search: { tab: "login", next: undefined } });
        return;
      }
      setUserEmail(u.user.email || "Admin");
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!data) {
        nav({ to: "/" });
        return;
      }
      setOk(true);
      setChecking(false);
    })();
  }, [nav]);

  if (checking) {
    return <PageLoader label="Authenticating Admin Portal…" />;
  }

  if (!ok) return null;

  const pendingApps = statsData?.pendingAgentAppsCount || 0;
  const pendingWs = statsData?.pendingWithdrawalsCount || 0;
  const stats = statsData;

  const navGroups = [
    {
      group: "Core Operations",
      items: [
        { to: "/admin", label: "Command Center", icon: LayoutDashboard },
        {
          to: "/admin/orders",
          label: "Live Orders & Retry",
          icon: ShoppingBag,
          badge: (stats as any)?.pendingOrders ? (stats as any).pendingOrders : undefined,
          badgeColor: "bg-destructive",
        },
        { to: "/admin/users", label: "Users & Roles", icon: Users },
        { to: "/admin/bundles", label: "Bundle Packages", icon: Package },
        {
          to: "/admin/agents",
          label: "Agent Applications",
          icon: Store,
          badge: pendingApps > 0 ? pendingApps : undefined,
        },
        {
          to: "/admin/withdrawals",
          label: "Payout Withdrawals",
          icon: BanknoteIcon,
          badge: pendingWs > 0 ? pendingWs : undefined,
          badgeColor: "bg-amber-500",
        },
      ],
    },
    {
      group: "Security & Audit",
      items: [
        { to: "/admin/audit-logs", label: "Security Audit Logs", icon: ShieldCheck },
        { to: "/admin/security", label: "Fraud Security Hub", icon: ShieldAlert },
      ],
    },
    {
      group: "Marketing & Support",
      items: [
        { to: "/admin/broadcast", label: "SMS Broadcast", icon: MessageSquare },
        { to: "/admin/support-tickets", label: "Support Desk", icon: LifeBuoy },
        { to: "/admin/slideshow", label: "Hero Slideshow", icon: Film },
        { to: "/admin/reviews", label: "Customer Reviews", icon: Star },
      ],
    },
    {
      group: "Finance & Reports",
      items: [
        { to: "/admin/wallets", label: "User Wallets & Deposits", icon: Wallet },
        { to: "/admin/reconcile", label: "Paystack Ledger", icon: Banknote },
        { to: "/admin/analytics", label: "Profit Analytics", icon: TrendingUp },
        { to: "/admin/reports", label: "CSV Export Reports", icon: FileSpreadsheet },
        { to: "/admin/api-keys", label: "Developer Keys", icon: KeyRound },
        { to: "/admin/settings", label: "Site Settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/60 backdrop-blur-xl shrink-0 p-5 justify-between min-h-screen sticky top-0">
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between pb-4 border-b border-border/50">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl gold-gradient grid place-items-center font-black text-primary-foreground text-sm shadow-md">
                BD
              </div>
              <div>
                <div className="text-sm font-black tracking-tight font-display">BestData Admin</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary">Pro Management</div>
              </div>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-6">
            {navGroups.map((g) => (
              <div key={g.group} className="space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2">
                  {g.group}
                </div>
                {g.items.map((it) => {
                  const Icon = it.icon;
                  const active = (it as any).exact ? path === it.to : path.startsWith(it.to);
                  return (
                    <Link
                      key={it.to}
                      to={it.to as any}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                        active
                          ? "gold-gradient text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4" />
                        <span>{it.label}</span>
                      </div>
                      {it.badge && (
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black rounded-full text-white ${
                            it.badgeColor || "bg-primary"
                          }`}
                        >
                          {it.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer & Back to Site */}
        <div className="pt-4 border-t border-border/50 space-y-3">
          <Link
            to="/"
            className="flex items-center justify-between rounded-xl border border-border bg-background p-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Main Website
            </span>
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </Link>

          <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <UserCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="truncate text-[11px] font-medium">{userEmail}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-border/60 bg-card/40 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden grid h-9 w-9 place-items-center rounded-xl border border-border text-foreground hover:bg-muted"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">System Status:</span>
              <span className="text-emerald-500 font-extrabold uppercase text-[10px] tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Operational
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground border-r border-border/60 pr-4">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Admin Privileges Active</span>
            </div>

            <Link
              to="/developers"
              className="text-xs font-extrabold text-primary hover:underline px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
            >
              API Portal
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-b border-border bg-card p-4 space-y-4 animate-in slide-in-from-top duration-200">
            {navGroups.map((g) => (
              <div key={g.group} className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2">
                  {g.group}
                </div>
                {g.items.map((it) => {
                  const Icon = it.icon;
                  const active = (it as any).exact ? path === it.to : path.startsWith(it.to);
                  return (
                    <Link
                      key={it.to}
                      to={it.to as any}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold ${
                        active ? "gold-gradient text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" /> {it.label}
                      </div>
                      {it.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-black bg-primary text-white rounded-full">
                          {it.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Route View */}
        <main className="p-4 sm:p-6 md:p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
