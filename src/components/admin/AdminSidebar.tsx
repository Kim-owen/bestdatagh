import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
  ShieldAlert,
  MessageSquare,
  Banknote,
  TrendingUp,
  LifeBuoy,
  FileSpreadsheet,
  Wallet,
  Settings,
  Film,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

import { adminStats } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  badgeTone?: "primary" | "danger" | "warning";
}

interface AdminNavGroup {
  group: string;
  items: AdminNavItem[];
}

interface AdminStats {
  pendingOrders?: number;
  pendingAgentAppsCount?: number;
  pendingWithdrawalsCount?: number;
}

function buildNavGroups(stats?: AdminStats): AdminNavGroup[] {
  return [
    {
      group: "Core Operations",
      items: [
        { to: "/admin", label: "Command Center", icon: LayoutDashboard },
        {
          to: "/admin/orders",
          label: "Live Orders & Retry",
          icon: ShoppingBag,
          badge: stats?.pendingOrders,
          badgeTone: "danger",
        },
        { to: "/admin/users", label: "Users & Roles", icon: Users },
        { to: "/admin/bundles", label: "Bundle Packages", icon: Package },
        {
          to: "/admin/agents",
          label: "Agent Applications",
          icon: Store,
          badge: stats?.pendingAgentAppsCount,
          badgeTone: "primary",
        },
        {
          to: "/admin/withdrawals",
          label: "Payout Withdrawals",
          icon: BanknoteIcon,
          badge: stats?.pendingWithdrawalsCount,
          badgeTone: "warning",
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
}

const BADGE_TONE_CLASSES: Record<NonNullable<AdminNavItem["badgeTone"]>, string> = {
  primary: "bg-primary text-primary-foreground",
  danger: "bg-destructive text-destructive-foreground",
  warning: "bg-amber-500 text-white",
};

export interface AdminSidebarProps {
  userEmail: string;
  /** Gate the stats poll until the admin auth check has resolved. */
  enabled: boolean;
}

/**
 * Admin nav rebuilt on the shared ui/sidebar.tsx primitives (previously unused anywhere in the app).
 * Replaces the hand-rolled <aside> + a second, independently-maintained copy of the same nav JSX
 * for the mobile drawer — the Sidebar primitive handles the mobile Sheet internally, so there's
 * now exactly one nav config instead of two.
 */
export function AdminSidebar({ userEmail, enabled }: AdminSidebarProps) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const fnStats = useServerFn(adminStats);

  const { data: stats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async (): Promise<AdminStats> => {
      try {
        return ((await fnStats()) as AdminStats) ?? {};
      } catch {
        return {};
      }
    },
    enabled,
    refetchInterval: 30000,
  });

  const navGroups = buildNavGroups(stats);

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-0 border-b border-sidebar-border/60 px-3 py-4">
        <Link to="/" className="flex items-center gap-2.5 px-1">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gold-gradient text-sm font-black text-primary-foreground shadow-md">
            GM
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate font-display text-sm font-black tracking-tight text-sidebar-foreground">
              GigMart Admin
            </div>
            <div className="truncate text-[10px] font-bold uppercase tracking-widest text-sidebar-primary">
              Pro Management
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1 py-2">
        {navGroups.map((g) => (
          <SidebarGroup key={g.group}>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-wider">
              {g.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.to === "/admin" ? path === item.to : path.startsWith(item.to);
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label} className="text-xs font-bold">
                        <Link to={item.to as any}>
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {!!item.badge && (
                        <SidebarMenuBadge
                          className={cn("rounded-full text-[10px] font-black", BADGE_TONE_CLASSES[item.badgeTone ?? "primary"])}
                        >
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border/60 p-3">
        <Link
          to="/"
          className="flex items-center justify-between rounded-xl border border-sidebar-border bg-sidebar p-2.5 text-xs font-bold text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground group-data-[collapsible=icon]:justify-center"
        >
          <span className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <ArrowLeft className="h-3.5 w-3.5" /> Main Website
          </span>
          <ArrowLeft className="hidden h-3.5 w-3.5 group-data-[collapsible=icon]:block" />
          <ExternalLink className="h-3.5 w-3.5 opacity-60 group-data-[collapsible=icon]:hidden" />
        </Link>
        <div className="flex items-center gap-2 px-1 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
          <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
          <span className="truncate text-[11px] font-medium">{userEmail}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
