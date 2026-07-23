import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { getMyWallet } from "@/lib/wallet.functions";
import { WalletTopUpModal } from "@/components/site/WalletModal";
import { User, Phone, Mail, Save, LogOut, KeyRound, ShoppingBag, Store, ShieldCheck, Wallet, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [
    { title: "My Account — Bestdata" },
    { name: "description", content: "Manage your Bestdata profile, contact details and account preferences." },
    { name: "robots", content: "noindex" },
  ] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, isAdmin, signOut } = useAuth();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);
  const fetchWallet = useServerFn(getMyWallet);

  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => fetchProfile() });
  const { data: walletData } = useQuery({ queryKey: ["myWallet"], queryFn: () => fetchWallet(), enabled: !!user });

  const walletBalance = walletData?.balanceGhs || 0;
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.profile) { setName(data.profile.display_name ?? ""); setPhone(data.profile.phone ?? ""); }
  }, [data?.profile?.id]);

  const save = useMutation({
    mutationFn: () => saveProfile({ data: { display_name: name, phone } }),
    onSuccess: () => { setSaved(true); qc.invalidateQueries({ queryKey: ["me"] }); setTimeout(() => setSaved(false), 1800); },
  });

  const roles: string[] = data?.roles ?? [];
  const isAgent = roles.includes("agent");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-10 md:py-14">
        <header className="mb-8 flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary text-xl font-bold">
            {(name || user?.email || "?")[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl md:text-3xl font-extrabold tracking-tight">{name || "My account"}</h1>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {isAdmin && <Badge tone="gold">Admin</Badge>}
              {isAgent && <Badge tone="indigo">Agent</Badge>}
              {!isAdmin && !isAgent && <Badge tone="muted">Member</Badge>}
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-bold">Profile details</h2>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
                <Field label="Full name" icon={User} value={name} onChange={setName} placeholder="Kwame Mensah" />
                <Field label="Phone" icon={Phone} value={phone} onChange={setPhone} placeholder="0244 000 000" type="tel" />
                <div>
                  <label className="mb-1.5 block text-xs font-semibold">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input disabled value={user?.email ?? ""} className="w-full rounded-xl border border-border bg-muted/40 pl-10 pr-4 py-2.5 text-sm text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Contact support to change your email.</p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button disabled={save.isPending} className="inline-flex items-center gap-2 rounded-xl gold-gradient px-4 h-10 text-sm font-bold text-primary-foreground shadow-[var(--shadow-gold)] disabled:opacity-50">
                    <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save changes"}
                  </button>
                  {saved && <span className="text-xs font-semibold text-green-600">Saved ✓</span>}
                  {save.error && <span className="text-xs text-destructive">{(save.error as Error).message}</span>}
                </div>
              </form>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-primary">Wallet Balance</h3>
                </div>
                <button
                  onClick={() => setWalletModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-xl gold-gradient px-3 py-1.5 text-xs font-black text-primary-foreground shadow-sm hover:scale-105 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Top Up
                </button>
              </div>

              <div className="text-3xl font-black font-display text-foreground">
                GH₵ {walletBalance.toFixed(2)}
              </div>

              <p className="text-xs text-muted-foreground">
                Use your wallet balance for instant 1-click purchases at checkout.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Quick links</h3>
              <div className="grid gap-2">
                <QLink to="/track-order" icon={ShoppingBag} label="My orders" />
                <QLink to="/account/api-keys" icon={KeyRound} label="API keys" />
                <QLink to="/agents" icon={Store} label={isAgent ? "Agent store" : "Become an agent"} />
                {isAdmin && <QLink to="/admin" icon={ShieldCheck} label="Admin panel" />}
              </div>
            </div>
            <button onClick={() => signOut()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 h-11 text-sm font-bold text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </aside>
        </div>
      </main>
      <WalletTopUpModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        userEmail={user?.email}
      />
      <Footer />
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "gold"|"indigo"|"muted" }) {
  const cls = tone === "gold" ? "bg-primary/15 text-primary" : tone === "indigo" ? "bg-indigo-500/15 text-indigo-500" : "bg-muted text-foreground/70";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{children}</span>;
}

function Field({ label, icon: Icon, value, onChange, type = "text", placeholder }: { label: string; icon: any; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>
    </div>
  );
}

function QLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to as any} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
      <Icon className="h-4 w-4 text-primary" /> {label}
    </Link>
  );
}
