import { Link, useRouterState } from "@tanstack/react-router";
import {
  Menu, Moon, ShoppingBag, Sun, X, User as UserIcon, LogOut, Shield, KeyRound, Upload, Store,
  Home, Smartphone, Users, Package, Search, Code, Star, HelpCircle, Sparkles, ChevronRight, Zap,
  Wallet, Plus
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyWallet } from "@/lib/wallet.functions";
import { WalletTopUpModal } from "./WalletModal";
import { NotificationBell } from "./NotificationBell";

export function getRoleBasedNav(isAdmin: boolean, isAgent: boolean, isSignedIn: boolean) {
  if (isAdmin) {
    return [
      { label: "Admin Portal", to: "/admin" as const, search: undefined, icon: Shield },
      { label: "Buy Data", to: "/buy-data" as const, search: { network: "MTN" as const }, icon: Smartphone },
      { label: "Agent Portal", to: "/agent" as const, search: undefined, icon: Store },
      { label: "Bulk Orders", to: "/bulk" as const, search: undefined, icon: Package },
      { label: "Track Order", to: "/track-order" as const, search: undefined, icon: Search },
      { label: "Developers", to: "/developers" as const, search: undefined, icon: Code },
    ];
  }

  if (isAgent) {
    return [
      { label: "Agent Workspace", to: "/agent" as const, search: undefined, icon: Store },
      { label: "Buy Data", to: "/buy-data" as const, search: { network: "MTN" as const }, icon: Smartphone },
      { label: "Bulk Resell", to: "/bulk" as const, search: undefined, icon: Package },
      { label: "Agent Storefront", to: "/agents" as const, search: undefined, icon: Users },
      { label: "Track Order", to: "/track-order" as const, search: undefined, icon: Search },
      { label: "Developers", to: "/developers" as const, search: undefined, icon: Code },
    ];
  }

  if (isSignedIn) {
    return [
      { label: "Home", to: "/" as const, search: undefined, icon: Home },
      { label: "Buy Data", to: "/buy-data" as const, search: { network: "MTN" as const }, icon: Smartphone },
      { label: "Track Order", to: "/track-order" as const, search: undefined, icon: Search },
      { label: "Become an Agent", to: "/agents" as const, search: undefined, icon: Users },
      { label: "FAQ", to: "/faq" as const, search: undefined, icon: HelpCircle },
    ];
  }

  // Public / Visitor Nav
  return [
    { label: "Home", to: "/" as const, search: undefined, icon: Home },
    { label: "Buy Data", to: "/buy-data" as const, search: { network: "MTN" as const }, icon: Smartphone },
    { label: "Agent Program", to: "/agents" as const, search: undefined, icon: Users },
    { label: "Track Order", to: "/track-order" as const, search: undefined, icon: Search },
    { label: "Reviews", to: "/reviews" as const, search: undefined, icon: Star },
    { label: "FAQ", to: "/faq" as const, search: undefined, icon: HelpCircle },
  ];
}

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
    setDark(next);
  };
  return { dark, toggle };
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-3 group ${className}`}>
      <div className="relative grid h-10 w-10 place-items-center rounded-2xl gold-gradient text-primary-foreground font-black text-lg shadow-[0_4px_20px_-4px_hsl(243_85%_62%_/_0.6)] group-hover:scale-105 transition-transform duration-300">
        B
        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-black tracking-tight leading-none font-display">Bestdata</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-primary leading-none mt-1">Ghana Hub</span>
      </div>
    </Link>
  );
}

export function Header() {
  const { dark, toggle } = useTheme();
  const { count, open: openCart } = useCart();
  const { user, isAdmin, isAgent, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const fetchWallet = useServerFn(getMyWallet);
  const { data: walletData } = useQuery({
    queryKey: ["myWallet"],
    queryFn: () => fetchWallet(),
    enabled: !!user,
  });

  const walletBalance = walletData?.balanceGhs || 0;
  const navItems = getRoleBasedNav(isAdmin, isAgent, !!user);

  useEffect(() => { setOpen(false); setMenu(false); }, [pathname]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* iOS Glassmorphism Header Bar */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-2xl transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />

          {/* Desktop Glass Navigation Pills */}
          <nav className="hidden lg:flex items-center gap-1 rounded-full border border-border/50 bg-card/40 px-3 py-1.5 backdrop-blur-xl shadow-inner" aria-label="Primary">
            {navItems.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  search={item.search as any}
                  className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all duration-200 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-2px_hsl(243_85%_62%_/_0.6)] scale-[1.02]"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 opacity-80" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Controls & User Account Menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-card/80 hover:bg-muted transition-all active:scale-95 shadow-sm"
            >
              {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
            </button>

            <button
              onClick={openCart}
              aria-label={`Open cart, ${count} items`}
              className="relative grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-card/80 hover:bg-muted transition-all active:scale-95 shadow-sm"
            >
              <ShoppingBag className="h-4 w-4" />
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full gold-gradient px-1.5 text-[10px] font-black text-primary-foreground shadow-[0_2px_8px_hsl(243_85%_62%_/_0.6)] animate-bounce">
                  {count}
                </span>
              )}
            </button>

            {user && <NotificationBell />}

            {user ? (
              <div className="relative hidden md:block" ref={menuRef}>
                <button
                  onClick={() => setMenu((v) => !v)}
                  className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-card/80 px-3.5 py-1.5 text-xs font-extrabold hover:bg-muted transition-all shadow-sm"
                >
                  <div className="grid h-6 w-6 place-items-center rounded-lg gold-gradient text-primary-foreground text-xs font-black shadow-sm">
                    {(user.email ?? "?")[0].toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{user.email}</span>
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-3xl border border-border/80 bg-card/95 shadow-2xl py-3 z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95">
                    {/* User Account Info Header */}
                    <div className="px-4 py-2 border-b border-border/50 mb-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Signed in as</div>
                      <div className="text-xs font-bold truncate mt-0.5">{user.email}</div>
                      <div className="flex gap-1 mt-1.5">
                        {isAdmin && <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary border border-primary/20">Admin</span>}
                        {isAgent && <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-500 border border-emerald-500/20">Agent</span>}
                        {!isAdmin && !isAgent && <span className="rounded-md bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">Retail User</span>}
                      </div>
                    </div>

                    {/* Integrated Glassmorphic Wallet Card inside User Dropdown */}
                    <div className="mx-3 mb-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-500 flex items-center gap-1.5">
                          <Wallet className="h-4 w-4" /> Wallet Balance
                        </span>
                        <span className="font-mono font-black text-emerald-500 text-sm">GH₵ {walletBalance.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => { setWalletModalOpen(true); setMenu(false); }}
                        className="w-full flex items-center justify-center gap-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black py-1.5 text-xs font-black shadow-sm transition-all active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[3]" /> Top Up Deposit
                      </button>
                    </div>

                    {isAdmin && (
                      <Link to="/admin" className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold hover:bg-muted text-primary transition-colors">
                        <Shield className="h-4 w-4 text-primary" /> Admin Panel
                      </Link>
                    )}
                    {isAgent && (
                      <Link to="/agent" className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold hover:bg-muted text-emerald-500 transition-colors">
                        <Store className="h-4 w-4 text-emerald-500" /> Agent Dashboard
                      </Link>
                    )}
                    <Link to="/account" className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold hover:bg-muted transition-colors">
                      <UserIcon className="h-4 w-4" /> My Profile
                    </Link>
                    <Link to="/account/api-keys" className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold hover:bg-muted transition-colors">
                      <KeyRound className="h-4 w-4" /> Developer API Keys
                    </Link>
                    {(isAgent || isAdmin) && (
                      <Link to="/bulk" className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold hover:bg-muted transition-colors">
                        <Upload className="h-4 w-4" /> Bulk Order Tool
                      </Link>
                    )}
                    <Link to="/track-order" className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold hover:bg-muted transition-colors">
                      <ShoppingBag className="h-4 w-4" /> Track My Orders
                    </Link>

                    <div className="my-1 border-t border-border/50" />
                    <button onClick={() => signOut()} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-extrabold hover:bg-muted text-destructive transition-colors">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/auth" search={{ tab: "login", next: undefined }} className="text-xs font-extrabold text-foreground/80 hover:text-foreground px-3.5 py-2 transition-colors">
                  Log In
                </Link>
                <Link
                  to="/auth"
                  search={{ tab: "signup", next: undefined }}
                  className="inline-flex items-center gap-1.5 rounded-2xl gold-gradient px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-[0_4px_16px_-2px_hsl(243_85%_62%_/_0.5)] hover:scale-105 active:scale-95 transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-card/80 hover:bg-muted transition-all active:scale-95"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <WalletTopUpModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        userEmail={user?.email}
      />

      {/* Side Slide-Over Drawer for Mobile View */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setOpen(false)}
          />

          {/* Slide-in Panel from Right */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xs sm:max-w-sm bg-card/98 border-l border-border/80 shadow-2xl backdrop-blur-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-5">
                <Logo />
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-muted hover:bg-card transition-all active:scale-95"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Wallet Balance Card */}
              {user && (
                <div className="mt-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3 backdrop-blur-xl">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-500 dark:text-emerald-400">
                      <Wallet className="h-4 w-4" /> My Wallet Balance
                    </div>
                    <span className="font-mono font-black text-emerald-500 dark:text-emerald-400 text-sm">GH₵ {walletBalance.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => { setWalletModalOpen(true); setOpen(false); }}
                    className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 text-xs font-black shadow-md active:scale-95 transition-all"
                  >
                    <Plus className="h-4 w-4" /> Top Up Wallet Deposit
                  </button>
                </div>
              )}

              {/* Quick Status / Promo */}
              <div className="mt-4 rounded-2xl bg-primary/10 border border-primary/20 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-foreground">Cheapest Data</div>
                    <div className="text-[10px] font-semibold text-muted-foreground">Instant MoMo Delivery</div>
                  </div>
                </div>
                <Link
                  to="/buy-data"
                  search={{ network: "MTN" }}
                  onClick={() => setOpen(false)}
                  className="rounded-xl gold-gradient px-3 py-1.5 text-[10px] font-black text-primary-foreground shadow-sm"
                >
                  Shop
                </Link>
              </div>

              {/* Navigation Links */}
              <div className="mt-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 px-1">Navigation</div>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const active = pathname === item.to;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to as any}
                        search={item.search as any}
                        onClick={() => setOpen(false)}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-extrabold transition-all ${
                          active
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-foreground/80 hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className={`h-4 w-4 opacity-50 ${active ? "opacity-100" : ""}`} />
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* User Account / Role Section */}
              {user && (
                <div className="mt-6 border-t border-border/60 pt-5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 px-1">My Account</div>
                  <div className="space-y-1">
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold text-primary hover:bg-muted">
                        <Shield className="h-4 w-4" /> Admin Panel
                      </Link>
                    )}
                    {isAgent && (
                      <Link to="/agent" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold text-emerald-500 hover:bg-muted">
                        <Store className="h-4 w-4" /> Agent Dashboard
                      </Link>
                    )}
                    <Link to="/account" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold hover:bg-muted">
                      <UserIcon className="h-4 w-4" /> Profile Settings
                    </Link>
                    <Link to="/account/api-keys" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold hover:bg-muted">
                      <KeyRound className="h-4 w-4" /> Developer API Keys
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Footer */}
            <div className="border-t border-border/60 pt-5 mt-6 pb-6">
              {user ? (
                <button
                  onClick={() => { signOut(); setOpen(false); }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3 text-xs font-extrabold text-destructive hover:bg-destructive hover:text-white transition-all"
                >
                  <LogOut className="h-4 w-4" /> Sign Out ({user.email})
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/auth"
                    search={{ tab: "login", next: undefined }}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center rounded-2xl border border-border bg-background py-3 text-xs font-extrabold hover:bg-muted transition-all"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/auth"
                    search={{ tab: "signup", next: undefined }}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center rounded-2xl gold-gradient py-3 text-xs font-extrabold text-primary-foreground shadow-md transition-all"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom App Navigation Dock for iPhone & Android Mobile View */}
      <MobileBottomDock onOpenWallet={() => setWalletModalOpen(true)} />
    </>
  );
}

/* ============ Native iOS Floating Glass Bottom Navigation Dock ============ */
function MobileBottomDock({ onOpenWallet }: { onOpenWallet: () => void }) {
  const { count, open: openCart } = useCart();
  const { user, isAgent, isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Strictly Scoped Dock Items Based on Exact Role
  const dockItems = useMemo(() => {
    if (!user) {
      // 1. Visitor / Public Unauthenticated User
      return [
        { label: "Home", to: "/" as const, search: undefined, icon: Home },
        { label: "Buy Data", to: "/buy-data" as const, search: { network: "MTN" as const }, icon: Smartphone },
        { label: "Track", to: "/track-order" as const, search: undefined, icon: Search },
        { label: "Cart", isCart: true, icon: ShoppingBag },
        { label: "Log In", to: "/auth" as const, search: { tab: "login" as const, next: undefined }, icon: UserIcon },
      ];
    }

    if (isAdmin) {
      // 2. Admin User
      return [
        { label: "Admin", to: "/admin" as const, search: undefined, icon: Shield },
        { label: "Buy Data", to: "/buy-data" as const, search: { network: "MTN" as const }, icon: Smartphone },
        { label: "Bulk", to: "/bulk" as const, search: undefined, icon: Package },
        { label: "Deposit", isWallet: true, icon: Wallet },
        { label: "Account", to: "/account" as const, search: undefined, icon: UserIcon },
      ];
    }

    if (isAgent) {
      // 3. Verified Agent
      return [
        { label: "Agent", to: "/agent" as const, search: undefined, icon: Store },
        { label: "Buy Data", to: "/buy-data" as const, search: { network: "MTN" as const }, icon: Smartphone },
        { label: "Bulk", to: "/bulk" as const, search: undefined, icon: Package },
        { label: "Deposit", isWallet: true, icon: Wallet },
        { label: "Account", to: "/account" as const, search: undefined, icon: UserIcon },
      ];
    }

    // 4. Retail Account Holder (Logged In, Non-Agent)
    return [
      { label: "Home", to: "/" as const, search: undefined, icon: Home },
      { label: "Buy Data", to: "/buy-data" as const, search: { network: "MTN" as const }, icon: Smartphone },
      { label: "Deposit", isWallet: true, icon: Wallet },
      { label: "Cart", isCart: true, icon: ShoppingBag },
      { label: "Account", to: "/account" as const, search: undefined, icon: UserIcon },
    ];
  }, [user, isAdmin, isAgent]);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden rounded-full border border-white/20 dark:border-white/10 bg-card/85 backdrop-blur-2xl px-4 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-around">
        {dockItems.map((item, idx) => {
          const active = item.to ? pathname === item.to : false;
          const Icon = item.icon;

          if ((item as any).isWallet) {
            return (
              <button
                key="wallet-dock"
                onClick={onOpenWallet}
                className="flex flex-col items-center gap-0.5 text-[10px] font-extrabold text-emerald-500 hover:scale-105 active:scale-95 transition-all"
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/20 text-emerald-500 shadow-sm">
                  <Icon className="h-4 w-4" />
                </div>
                <span>Deposit</span>
              </button>
            );
          }

          if ((item as any).isCart) {
            return (
              <button
                key="cart-dock"
                onClick={openCart}
                className="relative flex flex-col items-center gap-1 text-[10px] font-extrabold text-foreground/70 hover:text-foreground active:scale-95 transition-all"
              >
                <div className="relative">
                  <Icon className="h-5 w-5 opacity-80" />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full gold-gradient px-1 text-[9px] font-black text-primary-foreground">
                      {count}
                    </span>
                  )}
                </div>
                <span>Cart</span>
              </button>
            );
          }

          return (
            <Link
              key={idx}
              to={item.to as any}
              search={item.search as any}
              className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition-all active:scale-95 ${
                active ? "text-primary font-black scale-105" : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-primary" : "opacity-80"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
