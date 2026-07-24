import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { getMyWallet, verifyWalletDeposit, payOrderWithWallet } from "@/lib/wallet.functions";
import { listActiveBundles } from "@/lib/public-bundles.functions";
import { createCheckoutOrder } from "@/lib/orders.functions";
import { WalletTopUpModal } from "@/components/site/WalletModal";
import { NetworkLogo } from "@/components/site/NetworkLogos";
import { InstantBuyModal, type InstantBuyItem } from "@/components/site/InstantBuyModal";
import {
  User, Phone, Mail, Save, LogOut, KeyRound, ShoppingBag, Store, ShieldCheck,
  Wallet, Plus, Zap, Smartphone, CheckCircle2, Sparkles, ArrowRight
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [
    { title: "My Account & Instant Data — Bestdata" },
    { name: "description", content: "Manage your Bestdata profile, wallet and instant data purchases." },
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
  const verifyDepositFn = useServerFn(verifyWalletDeposit);
  const fetchBundlesFn = useServerFn(listActiveBundles);
  const createOrderFn = useServerFn(createCheckoutOrder);
  const payWalletFn = useServerFn(payOrderWithWallet);

  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => fetchProfile() });
  const { data: walletData } = useQuery({ queryKey: ["myWallet"], queryFn: () => fetchWallet(), enabled: !!user });
  const { data: bundlesData } = useQuery({ queryKey: ["activeBundles"], queryFn: () => fetchBundlesFn() });

  const bundles = bundlesData || [];
  const walletBalance = walletData?.balanceGhs || 0;

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [buyNowItem, setBuyNowItem] = useState<InstantBuyItem | null>(null);

  // In-Dashboard Quick Buy Form State
  const [buyNet, setBuyNet] = useState<string>("MTN");
  const [selectedBundleId, setSelectedBundleId] = useState<string>("");
  const [recipientPhone, setRecipientPhone] = useState<string>("");
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string>("");
  const [orderErrorMsg, setOrderErrorMsg] = useState<string>("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("reference") || params.get("trxref");
      if (ref && ref.startsWith("DEP-")) {
        verifyDepositFn({ data: { reference: ref } })
          .then(() => {
            if (isMounted) {
              qc.invalidateQueries({ queryKey: ["myWallet"] });
              qc.invalidateQueries({ queryKey: ["me"] });
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch(console.error);
      }
    }
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (data?.profile) {
      setName(data.profile.display_name ?? "");
      setPhone(data.profile.phone ?? "");
      if (!recipientPhone) setRecipientPhone(data.profile.phone ?? "");
    }
  }, [data?.profile?.id]);

  const save = useMutation({
    mutationFn: () => saveProfile({ data: { display_name: name, phone } }),
    onSuccess: () => { setSaved(true); qc.invalidateQueries({ queryKey: ["me"] }); setTimeout(() => setSaved(false), 1800); },
  });

  const availableBundles = bundles.filter((b: any) => b.network === buyNet);
  const activeBundle = availableBundles.find((b: any) => b.id === selectedBundleId) || availableBundles[0];

  const quickBuyMut = useMutation({
    mutationFn: async ({ payMethod }: { payMethod: "wallet" | "momo" }) => {
      setOrderSuccessMsg("");
      setOrderErrorMsg("");

      if (!activeBundle) throw new Error("Please select a valid data bundle package.");
      const cleanPhone = recipientPhone.replace(/[^\d]/g, "");
      if (cleanPhone.length < 9) throw new Error("Enter a valid Ghana mobile number (e.g. 0244000000).");

      if (payMethod === "wallet") {
        if (walletBalance < Number(activeBundle.price_ghs)) {
          throw new Error(`Insufficient wallet balance. Balance: GH₵ ${walletBalance.toFixed(2)}, Required: GH₵ ${Number(activeBundle.price_ghs).toFixed(2)}. Please top up your wallet.`);
        }

        const ordRes = await createOrderFn({
          data: {
            items: [{
              id: activeBundle.id,
              network: activeBundle.network,
              size: activeBundle.size_label,
              price: Number(activeBundle.price_ghs),
              qty: 1,
            }],
            recipientPhone: cleanPhone,
            email: user?.email,
          },
        });

        await payWalletFn({ data: { orderId: ordRes.orderId, amountGhs: Number(activeBundle.price_ghs) } });
        qc.invalidateQueries({ queryKey: ["myWallet"] });
        return { ok: true, reference: ordRes.reference, price: Number(activeBundle.price_ghs) };
      } else {
        setBuyNowItem({
          network: activeBundle.network as any,
          size: activeBundle.size_label,
          price: Number(activeBundle.price_ghs),
        });
        return { ok: true, modal: true };
      }
    },
    onSuccess: (res) => {
      if (res?.reference) {
        setOrderSuccessMsg(`🎉 Success! Order #${res.reference} of GH₵ ${res.price.toFixed(2)} dispatched to ${recipientPhone}.`);
      }
    },
    onError: (err: any) => {
      setOrderErrorMsg(err.message || "Failed to process data purchase.");
    },
  });

  const roles: string[] = data?.roles ?? [];
  const isAgent = roles.includes("agent");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-10 md:py-14 space-y-8">
        <header className="flex items-center gap-4">
          <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-emerald-500/30 bg-white p-1 shadow-md shrink-0">
            <img src="/logo.png" alt="Account Avatar" className="h-full w-full object-contain" />
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
          <div className="lg:col-span-2 space-y-6">
            {/* Customer In-Dashboard Quick Buy Widget */}
            <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                  <Zap className="h-4 w-4" /> Instant In-Dashboard Data Purchaser
                </div>
                <span className="text-[11px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  Instant Delivery
                </span>
              </div>

              <div className="space-y-4">
                {/* Network Pills */}
                <div className="flex gap-2">
                  {["MTN", "Telecel", "AirtelTigo"].map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => {
                        setBuyNet(net);
                        const first = bundles.find((b: any) => b.network === net);
                        if (first) setSelectedBundleId(first.id);
                      }}
                      className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all border ${
                        buyNet === net
                          ? "border-amber-400 bg-amber-400/10 text-amber-400"
                          : "border-border bg-card text-muted-foreground hover:border-foreground/20"
                      }`}
                    >
                      <NetworkLogo network={net as any} className="h-4 w-4" />
                      <span>{net}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">Select Bundle Package</label>
                    <select
                      value={activeBundle?.id || ""}
                      onChange={(e) => setSelectedBundleId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold outline-none focus:border-amber-400"
                    >
                      {availableBundles.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.network} {b.size_label} — GH₵ {Number(b.price_ghs).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">Recipient Phone Number</label>
                    <input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="0244 000 000"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    disabled={quickBuyMut.isPending}
                    onClick={() => quickBuyMut.mutate({ payMethod: "wallet" })}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl gold-gradient px-6 h-11 text-xs font-black text-primary-foreground shadow-sm hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>Pay with Wallet (GH₵ {activeBundle ? Number(activeBundle.price_ghs).toFixed(2) : "0.00"})</span>
                  </button>

                  <button
                    disabled={quickBuyMut.isPending}
                    onClick={() => quickBuyMut.mutate({ payMethod: "momo" })}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl border border-border bg-card px-6 h-11 text-xs font-bold hover:bg-muted transition-all"
                  >
                    <Smartphone className="h-4 w-4 text-emerald-500" />
                    <span>Pay via Mobile Money</span>
                  </button>
                </div>

                {orderSuccessMsg && (
                  <p className="text-xs font-bold text-emerald-500">{orderSuccessMsg}</p>
                )}

                {orderErrorMsg && (
                  <p className="text-xs font-bold text-destructive">{orderErrorMsg}</p>
                )}
              </div>
            </section>

            {/* Profile details */}
            <section className="rounded-2xl border border-border bg-card p-6">
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
          </div>

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

              <Link
                to="/account/transactions"
                className="flex items-center justify-between text-xs font-bold text-primary hover:underline pt-2 border-t border-border"
              >
                <span>View Full Transaction History</span>
                <Wallet className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Dashboard Menu</h3>
              <div className="grid gap-2">
                <QLink to="/account/transactions" icon={Wallet} label="Wallet & Statements" />
                <QLink to="/track-order" icon={ShoppingBag} label="Track My Data Orders" />
                {isAgent && <QLink to="/agent" icon={Store} label="Agent Workspace" />}
                {(isAgent || isAdmin) && <QLink to="/account/api-keys" icon={KeyRound} label="API Keys" />}
                {isAdmin && <QLink to="/admin" icon={ShieldCheck} label="Admin Panel" />}
              </div>

              {!isAgent && (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                    <Store className="h-4 w-4" /> BestData Agent Program
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Want up to 10% off data bundle prices & your own custom store?
                  </p>
                  <Link
                    to="/agents"
                    className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl gold-gradient py-2 text-xs font-black text-slate-950 shadow-sm hover:scale-[1.02] transition-all"
                  >
                    <span>Apply to Become an Agent →</span>
                  </Link>
                </div>
              )}
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
      {buyNowItem && (
        <InstantBuyModal
          item={buyNowItem}
          onClose={() => setBuyNowItem(null)}
        />
      )}
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
