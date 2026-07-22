import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ArrowRight, Check, Plus, Zap, Shield } from "lucide-react";
import { Reviews } from "@/components/site/Reviews";
import { useCart } from "@/lib/cart";
import { InstantBuyModal, type InstantBuyItem } from "@/components/site/InstantBuyModal";
import { NetworkLogo } from "@/components/site/NetworkLogos";

type Network = "MTN" | "Telecel" | "AirtelTigo";

const NETWORK_META: Record<Network, { color: string; tint: string; desc: string; validity: string }> = {
  MTN: { color: "hsl(48 100% 50%)", tint: "hsl(48 100% 50% / 0.12)", desc: "Ghana's largest network", validity: "90-day validity" },
  Telecel: { color: "hsl(0 85% 50%)", tint: "hsl(0 85% 50% / 0.12)", desc: "Reliable nationwide coverage", validity: "Non-expiry" },
  AirtelTigo: { color: "hsl(210 85% 45%)", tint: "hsl(210 85% 45% / 0.12)", desc: "Best value bundles", validity: "Non-expiry" },
};


const BUNDLES: Record<Network, { size: string; price: number; popular?: boolean }[]> = {
  MTN: [
    { size: "1 GB", price: 4.15 },
    { size: "2 GB", price: 8.15 },
    { size: "3 GB", price: 12.15, popular: true },
    { size: "5 GB", price: 19.15 },
    { size: "10 GB", price: 37.15 },
    { size: "15 GB", price: 54.15 },
    { size: "20 GB", price: 71.15 },
    { size: "50 GB", price: 172.15 },
  ],
  Telecel: [
    { size: "5 GB", price: 38.0 },
    { size: "10 GB", price: 71.0, popular: true },
    { size: "15 GB", price: 105.0 },
    { size: "20 GB", price: 137.0 },
    { size: "40 GB", price: 262.0 },
    { size: "50 GB", price: 320.0 },
  ],
  AirtelTigo: [
    { size: "1 GB", price: 3.95 },
    { size: "2 GB", price: 7.5 },
    { size: "3 GB", price: 11.0, popular: true },
    { size: "5 GB", price: 18.0 },
    { size: "10 GB", price: 34.0 },
    { size: "20 GB", price: 66.0 },
  ],
};

const NETWORKS: Network[] = ["MTN", "Telecel", "AirtelTigo"];

export const Route = createFileRoute("/buy-data")({
  validateSearch: (s: Record<string, unknown>) => ({ network: (s.network as Network) ?? "MTN" }),
  head: () => ({
    meta: [
      { title: "Buy Data Bundles — Bestdata" },
      { name: "description", content: "Buy cheap MTN, Telecel and AirtelTigo data bundles in Ghana. Fast delivery, secure Paystack payments." },
      { property: "og:title", content: "Buy Data Bundles — Bestdata" },
      { property: "og:description", content: "Buy cheap MTN, Telecel and AirtelTigo data bundles in Ghana." },
      { property: "og:url", content: "/buy-data" },
    ],
    links: [{ rel: "canonical", href: "/buy-data" }],
  }),
  component: BuyData,
});

function BuyData() {
  const { network } = Route.useSearch();
  const active: Network = NETWORKS.includes(network) ? network : "MTN";
  const meta = NETWORK_META[active];
  const { addItem, open: openCart } = useCart();
  const [instant, setInstant] = useState<InstantBuyItem>(null);


  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        {/* Header block */}
        <section className="border-b border-border/60 bg-card/40 backdrop-blur-xl relative overflow-hidden">
          <div aria-hidden className="absolute -top-32 -right-32 h-80 w-80 rounded-full blur-[100px] opacity-20" style={{ background: meta.color }} />
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-12 md:py-16 relative">
            <div className="max-w-2xl">
              <div className="eyebrow mb-3">Instant Data Marketplace</div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-display">Select Your Data Package</h1>
              <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                Choose your mobile network, select your preferred data size, and check out instantly with Mobile Money or Bank Cards via Paystack.
              </p>
            </div>

            <div className="mt-8 inline-flex flex-wrap gap-2.5 rounded-3xl border border-border/80 bg-card/80 p-2 backdrop-blur-2xl shadow-lg">
              {NETWORKS.map((n) => {
                const m = NETWORK_META[n];
                const isActive = n === active;
                return (
                  <Link
                    key={n}
                    to="/buy-data"
                    search={{ network: n }}
                    className={`inline-flex items-center gap-2.5 rounded-2xl px-5 py-2.5 text-xs font-extrabold transition-all ${
                      isActive ? "text-white shadow-xl scale-[1.02]" : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
                    }`}
                    style={isActive ? { background: m.color } : {}}
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-card/80 p-0.5 shadow-sm">
                      <NetworkLogo network={n} className="h-5 w-5" />
                    </span>
                    {n}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Bundles grid */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3 border-b border-border/40 pb-4">
              <div>
                <h2 className="text-2xl font-extrabold flex items-center gap-2.5 font-display">
                  <span className="inline-block h-3 w-3 rounded-full animate-ping" style={{ background: meta.color }} />
                  {active} Data Bundles
                </h2>
                <p className="text-xs font-semibold text-muted-foreground mt-1">{meta.desc} · {meta.validity}</p>
              </div>
              <div className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                ⚡ Instant Automated Dispatch
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {BUNDLES[active].map((b) => (
                <div
                  key={b.size}
                  className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card p-5 shadow-sm hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: meta.color }} />
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-card p-1.5 shadow-sm ring-1 ring-border/60">
                        <NetworkLogo network={active} className="h-8 w-8" />
                      </div>
                      {b.popular && (
                        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary border border-primary/20">
                          Popular
                        </span>
                      )}
                    </div>

                    <div className="mt-5 text-3xl font-black tracking-tight font-display">{b.size}</div>
                    <div className="mt-1 text-xs font-semibold text-muted-foreground">{meta.validity}</div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/40">
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Price</span>
                      <span className="text-xl font-extrabold text-foreground font-display">GH₵ {b.price.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          addItem({ id: `${active}-${b.size}`, network: active, size: b.size, price: b.price });
                          openCart();
                        }}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-border/80 bg-background px-2.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted active:scale-[.97] transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" /> Cart
                      </button>
                      <button
                        onClick={() => setInstant({ network: active, size: b.size, price: b.price })}
                        className="inline-flex items-center justify-center gap-1 rounded-xl gold-gradient px-2.5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-[0_4px_16px_-2px_hsl(243_85%_62%_/_0.5)] active:scale-[.97] transition-all"
                      >
                        Buy Now <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { icon: Zap, title: "Automated Dispatch", desc: "Bundles are credited instantly upon payment confirmation." },
                { icon: Shield, title: "Paystack Protection", desc: "100% secure payment gateway for Mobile Money & Cards." },
                { icon: Check, title: "Guest Checkout", desc: "Purchase data directly without needing a registered account." },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="flex items-start gap-3.5 rounded-3xl border border-border/80 bg-card/60 p-5 backdrop-blur-md">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold">{f.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{f.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <Reviews
            targetType="network"
            targetId={active}
            heading={`${active} customer reviews`}
            subheading={`See what customers say about buying ${active} bundles on Bestdata — or add your own.`}
          />
        </section>
      </main>
      <InstantBuyModal item={instant} onClose={() => setInstant(null)} />
      <Footer />

    </div>
  );
}
