import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, ShoppingBag, Users, Package, Star, KeyRound, ArrowLeft, Store, BanknoteIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminShell,
});

function AdminShell() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { nav({ to: "/auth", search: { tab: "login", next: undefined } }); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (!data) { nav({ to: "/" }); return; }
      setOk(true); setChecking(false);
    })();
  }, [nav]);

  if (checking) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading admin…</div>;
  if (!ok) return null;

    const items: { to: string; label: string; icon: any; exact?: boolean }[] = [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/bundles", label: "Bundles", icon: Package },
      { to: "/admin/reviews", label: "Reviews", icon: Star },
      { to: "/admin/agents", label: "Agent apps", icon: Store },
      { to: "/admin/withdrawals", label: "Withdrawals", icon: BanknoteIcon },
      { to: "/admin/api-keys", label: "API Keys", icon: KeyRound },
    ];

  return (
    <div className="min-h-screen bg-background text-foreground grid grid-cols-1 md:grid-cols-[240px_1fr]">
      <aside className="border-r border-border bg-card p-4 space-y-1">
        <Link to="/" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to site</Link>
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground px-2 pb-2">Admin</div>
        {items.map((it) => {
          const Icon = it.icon;
          const active = it.exact ? path === it.to : path.startsWith(it.to);
          return (
          <Link key={it.to} to={it.to as any} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted"}`}>
            <Icon className="h-4 w-4" /> {it.label}
          </Link>
          );
        })}
      </aside>
      <main className="p-4 md:p-8"><Outlet /></main>
    </div>
  );
}
