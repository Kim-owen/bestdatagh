import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import { listActiveBundles } from "@/lib/public-bundles.functions";
import { getMyProfile, applyForAgent, AGENT_DISCOUNT_PCT } from "@/lib/profile.functions";
import { useCart, type Network } from "@/lib/cart";
import { InstantBuyModal, type InstantBuyItem } from "@/components/site/InstantBuyModal";
import { Store, TrendingUp, Percent, Users, ArrowRight, CheckCircle2, Clock, XCircle, Zap, Plus, Play, Pause, ChevronLeft, ChevronRight, Shield, Sparkles } from "lucide-react";
import { NetworkLogo } from "@/components/site/NetworkLogos";


import { z } from "zod";

const searchSchema = z.object({
  store: z.string().optional(),
  ref: z.string().optional(),
});

export const Route = createFileRoute("/agents")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({ meta: [
    { title: "Agent Store — Resell Data Bundles | Bestdata" },
    { name: "description", content: "Join Bestdata's agent program. Get up to 10% off wholesale data pricing, an agent-only storefront and bulk tools to grow your reselling business in Ghana." },
    { property: "og:title", content: "Become a Bestdata Agent" },
    { property: "og:description", content: "Wholesale data bundle pricing for verified resellers in Ghana." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AgentsPage,
});

function AgentsPage() {
  const { store, ref } = Route.useSearch();
  const agentRef = store || ref;

  const { user, loading } = useAuth();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchBundles = useServerFn(listActiveBundles);
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchProfile(), enabled: !!user });
  const bundles = useQuery({ queryKey: ["bundles"], queryFn: () => fetchBundles() });

  const roles: string[] = me.data?.roles ?? [];
  const isAgent = roles.includes("agent");
  const application = me.data?.application ?? null;

  // Dedicated Agent Customer Storefront View (When visited via unique agent link)
  if (agentRef) {
    return (
      <DedicatedAgentCustomerStorefront
        agentRef={agentRef}
        bundles={bundles.data ?? []}
        isLoading={bundles.isLoading}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero isSignedIn={!!user} isAgent={isAgent} status={application?.status} />

        {isAgent ? (
          <AgentStorefront bundles={bundles.data ?? []} />
        ) : loading ? (
          <section className="mx-auto max-w-[1080px] px-4 sm:px-6 py-16 text-center text-muted-foreground">Loading…</section>
        ) : !user ? (
          <SignUpCTA />
        ) : (
          <ApplyPanel status={application?.status} />
        )}

        <Perks />
      </main>
      <Footer />
    </div>
  );
}

function Hero({ isSignedIn, isAgent, status }: { isSignedIn: boolean; isAgent: boolean; status?: string }) {
  return (
    <section className="relative overflow-hidden bg-[#0a0a1a] text-white">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 0%, hsl(48 100% 55% / 0.25), transparent), radial-gradient(50% 50% at 90% 100%, hsl(263 85% 60% / 0.3), transparent)",
        }}
      />
      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Hero Text Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 backdrop-blur px-3.5 py-1.5 text-xs font-bold text-white/90">
              <Store className="h-3.5 w-3.5 text-[hsl(48_100%_60%)]" /> Bestdata Wholesale Agent Program
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-display tracking-tight leading-[1.1]">
              Resell data at <span className="text-[hsl(48_100%_60%)] font-black">wholesale prices</span>.
            </h1>
            <p className="text-sm md:text-base text-white/75 leading-relaxed max-w-xl">
              Approved Bestdata agents get up to {AGENT_DISCOUNT_PCT}% off every bundle, a dedicated storefront, and priority automated delivery — perfect for shop owners, mobile-money vendors, and community resellers across Ghana.
            </p>

            <div className="flex flex-wrap gap-3.5 pt-2">
              {isAgent ? (
                <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 px-5 h-12 text-xs font-black text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> You're an Active Agent
                </span>
              ) : status === "pending" ? (
                <span className="inline-flex items-center gap-2 rounded-2xl bg-amber-400/20 border border-amber-400/30 px-5 h-12 text-xs font-black text-amber-300">
                  <Clock className="h-4 w-4" /> Application Under Review
                </span>
              ) : (
                <Link
                  to={isSignedIn ? "/agents" : "/auth"}
                  search={isSignedIn ? undefined : { tab: "signup", next: "/agents" }}
                  className="inline-flex items-center gap-2 rounded-2xl gold-gradient px-6 h-12 text-xs font-black text-primary-foreground shadow-[var(--shadow-gold)] hover:scale-105 active:scale-95 transition-all"
                >
                  Apply to Become an Agent <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                to="/buy-data"
                search={{ network: "MTN" }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 h-12 text-xs font-black text-white hover:bg-white/10 transition-all"
              >
                Browse Retail Bundles
              </Link>
            </div>
          </div>

          {/* Right Interactive Slideshow & Video Showcase */}
          <div className="lg:col-span-5">
            <AgentHeroSlideshow />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ Interactive Agent Hero Slideshow ============ */
function AgentHeroSlideshow() {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const slides = [
    {
      id: "dashboard",
      title: "Real-Time Agent Analytics",
      subtitle: "Track daily commission earned & instant MoMo cashouts",
      tag: "🔴 LIVE DEMO",
      content: (
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 border border-white/15 p-3.5">
              <span className="text-[10px] font-black uppercase text-white/60">Today's Sales</span>
              <div className="text-xl font-black text-emerald-400 font-display mt-0.5">GH₵ 1,450.00</div>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 p-3.5">
              <span className="text-[10px] font-black uppercase text-white/60">Net Profit (10%)</span>
              <div className="text-xl font-black text-[hsl(48_100%_60%)] font-display mt-0.5">GH₵ 145.00</div>
            </div>
          </div>

          <div className="rounded-2xl bg-black/40 border border-white/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-white/90">MTN 10GB Data Package</span>
              <span className="font-black text-emerald-400">Delivered ⚡</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-white/60 font-mono">
              <span>Ref: BD-984210</span>
              <span>MoMo: 0244***182</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "bulk",
      title: "Instant Bulk Resell Engine",
      subtitle: "Top-up up to 500 phone numbers in a single click",
      tag: "⚡ HIGH SPEED",
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl bg-white/10 border border-white/15 p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-extrabold">Batch Processed</span>
            </div>
            <span className="font-mono text-white/70">50/50 Delivered</span>
          </div>

          <div className="space-y-2">
            {[
              { net: "MTN", phone: "024 892 1042", size: "5GB", price: "GH₵ 22.50" },
              { net: "Telecel", phone: "020 411 9021", size: "10GB", price: "GH₵ 43.00" },
              { net: "AT", phone: "026 771 0049", size: "2GB", price: "GH₵ 10.00" },
            ].map((row, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
                <span className="font-bold text-white/80">{row.net} · {row.phone}</span>
                <span className="font-black text-[hsl(48_100%_60%)]">{row.size} ({row.price})</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "community",
      title: "Ghana Wholesale Reseller Network",
      subtitle: "Join 1,200+ shop owners & MoMo vendors across Ghana",
      tag: "🤝 COMMUNITY",
      content: (
        <div className="space-y-3 text-xs">
          <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-3.5 space-y-1">
            <div className="font-extrabold text-emerald-300">24/7 Priority Agent WhatsApp Support</div>
            <div className="text-white/70">Direct line to our dispatch team for instant order resolutions.</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
              <div className="font-black text-base text-[hsl(48_100%_60%)] font-display">1.2K+</div>
              <div className="text-[10px] text-white/60">Active Agents</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
              <div className="font-black text-base text-emerald-400 font-display">99.9%</div>
              <div className="text-[10px] text-white/60">Uptime</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
              <div className="font-black text-base text-purple-300 font-display">&lt; 2 min</div>
              <div className="text-[10px] text-white/60">Dispatch</div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(t);
  }, [isPlaying, slides.length]);

  const active = slides[current];

  return (
    <div className="relative group rounded-3xl border border-white/20 bg-card/40 backdrop-blur-2xl p-6 shadow-2xl overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[hsl(48_100%_60%_/0.2)] blur-3xl" />

      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[10px] font-black tracking-wider uppercase text-[hsl(48_100%_60%)]">
          <Sparkles className="h-3 w-3" /> {active.tag}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
            className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
            className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Slide Body */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-black font-display text-white">{active.title}</h3>
          <p className="text-xs text-white/70 mt-0.5">{active.subtitle}</p>
        </div>

        <div className="min-h-[170px] animate-in fade-in zoom-in-95 duration-300">
          {active.content}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-2 mt-5 pt-3 border-t border-white/10">
        {slides.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => setCurrent(idx)}
            className={`h-2 rounded-full transition-all ${
              current === idx ? "w-7 bg-[hsl(48_100%_60%)]" : "w-2 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SignUpCTA() {
  return (
    <section className="mx-auto max-w-[1080px] px-4 sm:px-6 py-14">
      <div className="rounded-3xl border border-border bg-card p-8 text-center">
        <h2 className="text-2xl font-extrabold">Create a free account to apply</h2>
        <p className="mt-2 text-muted-foreground">Signing up takes 30 seconds. Once approved you'll unlock wholesale pricing and the agent storefront.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/auth" search={{ tab: "signup", next: "/agents" }} className="inline-flex items-center gap-2 rounded-xl gold-gradient px-5 h-11 text-sm font-bold text-primary-foreground shadow-[var(--shadow-gold)]">Create account</Link>
          <Link to="/auth" search={{ tab: "login", next: "/agents" }} className="inline-flex items-center rounded-xl border border-border px-5 h-11 text-sm font-bold">I already have one</Link>
        </div>
      </div>
    </section>
  );
}

function ApplyPanel({ status }: { status?: string }) {
  const qc = useQueryClient();
  const submit = useServerFn(applyForAgent);
  const [f, setF] = useState({ full_name: "", phone: "", region: "", monthly_volume: "", note: "" });
  const mut = useMutation({
    mutationFn: () => submit({ data: f }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  if (status === "approved") return null;
  if (status === "pending") {
    return (
      <section className="mx-auto max-w-[860px] px-4 sm:px-6 py-14">
        <div className="rounded-3xl border border-amber-300/40 bg-amber-500/5 p-8">
          <div className="flex items-center gap-3"><Clock className="h-5 w-5 text-amber-500" /><h2 className="text-xl font-extrabold">Your application is under review</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">Our team usually approves new agents within 24 hours. You'll get an email once you're activated.</p>
        </div>
      </section>
    );
  }
  return (
    <section className="mx-auto max-w-[860px] px-4 sm:px-6 py-14">
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
        {status === "rejected" && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" /> Your previous application was rejected. You can update your details and re-submit.
          </div>
        )}
        <h2 className="text-2xl font-extrabold">Agent application</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tell us a bit about your reselling business.</p>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full name" value={f.full_name} onChange={(v) => setF({ ...f, full_name: v })} required />
          <Input label="Phone (MoMo)" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} required type="tel" placeholder="0244 000 000" />
          <Input label="Region" value={f.region} onChange={(v) => setF({ ...f, region: v })} required placeholder="Greater Accra" />
          <Input label="Estimated monthly volume" value={f.monthly_volume} onChange={(v) => setF({ ...f, monthly_volume: v })} placeholder="e.g. GHS 2,000" />
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Anything else?</label>
            <textarea rows={4} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" placeholder="Where you sell from, existing customers, etc." />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <button disabled={mut.isPending} className="inline-flex items-center gap-2 rounded-xl gold-gradient px-5 h-11 text-sm font-bold text-primary-foreground shadow-[var(--shadow-gold)] disabled:opacity-50">
              {mut.isPending ? "Submitting…" : "Submit application"} <ArrowRight className="h-4 w-4" />
            </button>
            {mut.error && <span className="text-xs text-destructive">{(mut.error as Error).message}</span>}
          </div>
        </form>
      </div>
    </section>
  );
}

function Input({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold">{label}</label>
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
    </div>
  );
}

function AgentStorefront({ bundles }: { bundles: any[] }) {
  const { addItem } = useCart();
  const [network, setNetwork] = useState<string>("MTN");
  const [buyNow, setBuyNow] = useState<InstantBuyItem | null>(null);
  const nets = useMemo(() => Array.from(new Set(bundles.map((b) => b.network))), [bundles]);
  const filtered = bundles.filter((b) => b.network === network);

  return (
    <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Agent storefront</div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Wholesale rates — {AGENT_DISCOUNT_PCT}% off</h2>
          <p className="mt-1 text-sm text-muted-foreground">Prices below reflect your agent discount. Buy instantly or add to cart.</p>
        </div>
        <Link to="/bulk" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 h-10 text-sm font-bold hover:bg-muted">
          <Users className="h-4 w-4" /> Bulk purchase
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {nets.map((n) => (
          <button key={n} onClick={() => setNetwork(n)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${network === n ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted"}`}>
            <NetworkLogo network={n} className="h-5 w-5" /> {n}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => {
          const agentPrice = +(b.price_ghs * (1 - AGENT_DISCOUNT_PCT / 100)).toFixed(2);
          return (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{b.network} · {b.validity}</div>
                  <div className="text-lg font-extrabold">{b.size_label}</div>
                </div>
                {b.popular && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">Popular</span>}
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-primary">GHS {agentPrice.toFixed(2)}</span>
                <span className="text-xs line-through text-muted-foreground">GHS {Number(b.price_ghs).toFixed(2)}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => addItem({ id: `${b.network}-${b.size_label}-agent`, network: b.network, size: b.size_label, price: agentPrice })} className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 h-10 text-sm font-bold hover:bg-muted">
                  <Plus className="h-4 w-4" /> Add
                </button>
                <button onClick={() => setBuyNow({ network: b.network, size: b.size_label, price: agentPrice })} className="inline-flex items-center justify-center gap-1 rounded-xl gold-gradient px-3 h-10 text-sm font-bold text-primary-foreground shadow-[var(--shadow-gold)]">
                  <Zap className="h-4 w-4" /> Buy now
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {buyNow && <InstantBuyModal item={buyNow} onClose={() => setBuyNow(null)} />}
    </section>
  );
}

function Perks() {
  const items = [
    { icon: Percent, title: `${AGENT_DISCOUNT_PCT}% off every bundle`, desc: "Wholesale pricing across MTN, Telecel and AirtelTigo." },
    { icon: TrendingUp, title: "Higher margins", desc: "Set your own retail price and pocket the difference on every sale." },
    { icon: Users, title: "Bulk delivery tools", desc: "Send data to dozens of customers from one screen with a CSV upload." },
    { icon: Store, title: "Priority support", desc: "Dedicated agent support channel with faster response times." },
  ];
  return (
    <section className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-14">
        <h3 className="text-center text-2xl font-extrabold tracking-tight">Why agents choose Bestdata</h3>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((i) => {
            const Icon = i.icon;
            return (
              <div key={i.title} className="rounded-2xl border border-border bg-card p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
                <div className="mt-3 text-sm font-bold">{i.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{i.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============ Dedicated Agent Customer Storefront View ============ */
function DedicatedAgentCustomerStorefront({
  agentRef, bundles, isLoading
}: {
  agentRef: string; bundles: any[]; isLoading: boolean;
}) {
  const [selectedNetwork, setSelectedNetwork] = useState<"MTN"|"Telecel"|"AirtelTigo">("MTN");
  const [buyItem, setBuyItem] = useState<InstantBuyItem | null>(null);
  const cart = useCart();

  const formattedRefName = agentRef.charAt(0).toUpperCase() + agentRef.slice(1).replace(/[-_]/g, " ");

  const filteredBundles = useMemo(() => {
    return bundles.filter((b) => b.network === selectedNetwork && b.active !== false);
  }, [bundles, selectedNetwork]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <div>
        {/* Dedicated Agent Header */}
        <header className="sticky top-0 z-40 border-b border-border/80 bg-card/80 backdrop-blur-2xl px-4 sm:px-6 py-4 shadow-sm">
          <div className="mx-auto max-w-[1280px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl gold-gradient font-black text-primary-foreground text-lg shadow-md font-display">
                {formattedRefName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black font-display tracking-tight">{formattedRefName}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                    <CheckCircle2 className="h-3 w-3" /> Verified Reseller
                  </span>
                </div>
                <p className="text-[11px] font-bold text-muted-foreground">Authorized Bestdata Wholesale Partner</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[11px] font-black text-primary">
                ⚡ Instant MoMo Delivery
              </span>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hi! I'm ordering data bundles from ${formattedRefName}'s store.`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 px-3.5 py-2 text-xs font-extrabold hover:bg-muted transition-all"
              >
                Contact Agent
              </a>
            </div>
          </div>
        </header>

        {/* Dedicated Agent Hero Banner */}
        <section className="relative overflow-hidden bg-[#090919] text-white py-12 md:py-16">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, hsl(243 85% 62% / 0.4), transparent), radial-gradient(40% 40% at 80% 100%, hsl(48 100% 60% / 0.25), transparent)",
            }}
          />

          <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 text-center space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-xs font-black text-[hsl(48_100%_60%)] uppercase tracking-wider">
              ⚡ Exclusive Reseller Prices
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display tracking-tight max-w-3xl mx-auto leading-tight">
              Buy Cheap MTN, Telecel & AT Bundles from <span className="text-[hsl(48_100%_60%)]">{formattedRefName}</span>
            </h2>

            <p className="text-xs sm:text-sm text-white/70 max-w-xl mx-auto font-medium">
              Select your network below, pick your data package, and enter your phone number. Your data will be dispatched instantly!
            </p>
          </div>
        </section>

        {/* Network Picker & Bundles Marketplace */}
        <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 md:py-14 space-y-8">
          {/* Network Selection Tabs */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-4 flex-wrap">
            {(["MTN", "Telecel", "AirtelTigo"] as const).map((net) => {
              const active = selectedNetwork === net;
              return (
                <button
                  key={net}
                  onClick={() => setSelectedNetwork(net)}
                  className={`inline-flex items-center gap-3 rounded-2xl border px-6 py-3.5 text-xs font-black transition-all duration-200 ${
                    active
                      ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/40 scale-105"
                      : "border-border/80 bg-card/60 hover:bg-muted/50"
                  }`}
                >
                  <NetworkLogo network={net} className="h-5 w-5" />
                  <span>{net === "AirtelTigo" ? "AT (AirtelTigo)" : net}</span>
                </button>
              );
            })}
          </div>

          {/* Bundle Cards Grid */}
          {isLoading ? (
            <div className="py-16 text-center text-xs font-bold text-muted-foreground flex justify-center items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" /> Loading Packages…
            </div>
          ) : filteredBundles.length === 0 ? (
            <div className="rounded-3xl border border-border/80 bg-card p-12 text-center text-xs font-bold text-muted-foreground">
              No active packages for {selectedNetwork} currently. Please select another network above.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredBundles.map((b) => (
                <div
                  key={b.id}
                  className="group relative rounded-3xl border border-border/80 bg-card p-6 shadow-sm hover:border-primary/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 border border-border/60 px-3 py-1 text-[10px] font-black uppercase text-muted-foreground">
                        <NetworkLogo network={b.network} className="h-3.5 w-3.5" /> {b.network}
                      </span>
                      {b.popular && (
                        <span className="inline-flex items-center gap-1 rounded-full gold-gradient px-2.5 py-0.5 text-[10px] font-black text-primary-foreground">
                          ★ Best Seller
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-3xl font-black font-display tracking-tight text-foreground">{b.size_label}</div>
                      <div className="text-xs font-semibold text-muted-foreground mt-1">{b.validity || "Non-Expiry Data"}</div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/40 space-y-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-extrabold text-muted-foreground">Price</span>
                      <div className="text-2xl font-black font-display text-primary">
                        GH₵ {Number(b.price_ghs).toFixed(2)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setBuyItem({ network: b.network as Network, size: b.size_label, price: Number(b.price_ghs) })}
                        className="w-full rounded-2xl gold-gradient px-3 py-3 text-xs font-extrabold text-primary-foreground shadow-sm hover:scale-105 active:scale-95 transition-all"
                      >
                        Buy Now
                      </button>
                      <button
                        onClick={() => cart.addItem({ id: `${b.network}-${b.size_label}`, network: b.network as Network, size: b.size_label, price: Number(b.price_ghs) })}
                        className="w-full rounded-2xl border border-border/80 bg-background px-3 py-3 text-xs font-extrabold hover:bg-muted active:scale-95 transition-all"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Dedicated Footer */}
      <footer className="border-t border-border/80 bg-card py-8 px-4 text-center text-xs font-bold text-muted-foreground">
        <div className="mx-auto max-w-[1280px] space-y-2">
          <p>© {new Date().getFullYear()} {formattedRefName} — Powered by Bestdata Ghana</p>
          <p className="text-[11px] text-muted-foreground/70">100% Encrypted Payments via Paystack · MTN MoMo · Telecel Cash · AT Money</p>
        </div>
      </footer>

      {/* Instant Order Modal */}
      {buyItem && <InstantBuyModal item={buyItem} onClose={() => setBuyItem(null)} />}
    </div>
  );
}
