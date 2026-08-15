import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminShell,
});

function AdminShell() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);
  const [userEmail, setUserEmail] = useState("");

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

  return (
    <SidebarProvider className="bg-background text-foreground">
      <AdminSidebar userEmail={userEmail} enabled={ok} />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-card/40 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-9 w-9 rounded-xl border border-border" />
            <div className="hidden items-center gap-2 text-xs font-bold text-muted-foreground sm:flex">
              <Activity className="h-4 w-4 animate-pulse text-success" />
              <span>System Status:</span>
              <span className="rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-success">
                Operational
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 border-r border-border/60 pr-4 text-xs font-bold text-muted-foreground sm:flex">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Admin Privileges Active</span>
            </div>
            <Link
              to="/developers"
              className="rounded-lg px-3 py-1.5 text-xs font-extrabold text-primary transition-colors hover:bg-primary/10 hover:underline"
            >
              API Portal
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
