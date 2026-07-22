import { Link } from "@tanstack/react-router";
import {
  ArrowRight, Zap, Shield, BadgePercent, MessageCircle, Clock, ClipboardCheck,
  Wallet, History, Rocket, Lock, Headphones, Smartphone, CreditCard, Signal, MapPin, Calendar,
  MessageSquare, Mail,
} from "lucide-react";
import { NetworkLogo } from "./NetworkLogos";
import { Reveal, SectionHeading } from "./Reveal";

/* ============ Networks ============ */
const NETWORKS = [
  { name: "MTN", desc: "Ghana's largest network", price: "From GHS 4.15", social: "30K+ users", to: "/buy-data?network=MTN", color: "hsl(48 100% 50%)", tint: "hsl(48 100% 50% / 0.12)" },
  { name: "Telecel", desc: "Reliable nationwide coverage", price: "From GHS 38.00", social: "7K+ users", to: "/buy-data?network=Telecel", color: "hsl(0 85% 50%)", tint: "hsl(0 85% 50% / 0.12)" },
  { name: "AirtelTigo (AT)", desc: "Best value bundles", price: "From GHS 3.95", social: "10K+ users", to: "/buy-data?network=AirtelTigo", color: "hsl(210 85% 45%)", tint: "hsl(210 85% 45% / 0.12)" },
];

export function NetworksSection() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <Reveal><SectionHeading eyebrow="Supported Networks" title="Choose Your Telecom Network" subtitle="Select your preferred provider to explore live data bundle pricing and validity details" /></Reveal>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          {NETWORKS.map((n, i) => (
            <Reveal key={n.name} delay={i * 80}>
              <a href={n.to} className="group relative block overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-lg transition-all hover:-translate-y-1.5 hover:shadow-2xl">
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: n.color }} />
                <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-40" style={{ background: n.color }} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-card border border-border/60 shadow-inner" style={{ background: n.tint }}>
                      <NetworkLogo network={n.name} className="h-7 w-7" />
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider" style={{ background: n.tint, color: n.color }}>
                      {n.social}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold text-foreground">{n.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{n.desc}</p>
                  <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Starting Rate</div>
                      <div className="text-sm font-extrabold text-foreground">{n.price}</div>
                    </div>
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ Why Bestdata ============ */
const WHY = [
  { icon: Zap, title: "Instant Delivery", desc: "Automated processing pushes bundles directly to your phone within seconds of payment approval." },
  { icon: Shield, title: "Bank-Grade Security", desc: "Encrypted checkout via Paystack supporting Mobile Money, Visa, Mastercard & bank cards." },
  { icon: BadgePercent, title: "Wholesale Rates", desc: "Up to 40% cheaper than direct operator retail prices across MTN, Telecel, and AirtelTigo." },
  { icon: MessageCircle, title: "Dedicated Support", desc: "Active customer service team ready to resolve delivery or transaction queries via email & live chat." },
  { icon: Clock, title: "24/7 Availability", desc: "High availability platform operating round-the-clock for continuous top-ups anytime." },
  { icon: ClipboardCheck, title: "Real-Time Tracking", desc: "Track every order with your unique reference ID without requiring account login." },
];

export function WhySection() {
  return (
    <section className="py-16 md:py-24 bg-card/30 border-y border-border/40">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <Reveal><SectionHeading eyebrow="Platform Advantages" title="Why Users Trust Bestdata" subtitle="Experience seamless, high-speed data delivery designed for mobile users and resellers" /></Reveal>
        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map((w, i) => {
            const Icon = w.icon;
            return (
              <Reveal key={w.title} delay={i * 60}>
                <div className="relative h-full overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all group">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-extrabold text-foreground">{w.title}</h3>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground leading-relaxed">{w.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============ Free Account Band ============ */
const BENEFITS = [
  { icon: Wallet, title: "Wallet System", desc: "Load funds for 1-click instant orders" },
  { icon: History, title: "Order History", desc: "Keep track of receipts & transaction logs" },
  { icon: Rocket, title: "Reseller Access", desc: "Apply for wholesale agent discounts" },
  { icon: Lock, title: "API Keys", desc: "Integrate bundle sales into your own app" },
  { icon: Headphones, title: "Priority Queue", desc: "Get priority processing for large orders" },
];

export function FreeAccountSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <Reveal><SectionHeading eyebrow="Member Privileges" title="Unlock Advanced Features" subtitle="Guest purchases are always instant — but creating a free account unlocks tools for power users." /></Reveal>

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <Reveal key={b.title} delay={i * 60}>
                <div className="h-full rounded-2xl border border-border bg-card p-4 text-center shadow-[var(--shadow-card)]">
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-3 text-sm font-bold text-foreground">{b.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{b.desc}</div>
                </div>
              </Reveal>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <Link to="/auth" search={{ tab: "signup", next: undefined }} className="inline-flex items-center gap-2 rounded-2xl gold-gradient px-5 h-10 text-sm font-bold text-primary-foreground shadow-[var(--shadow-gold)] hover:brightness-105 active:scale-[.97]">
            Create Free Account <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">No obligation. You can still buy data without an account.</p>
        </div>
      </div>
    </section>
  );
}

/* ============ Info section ============ */
const INFO_FEATURES = [
  { icon: Zap, title: "Fast Delivery", desc: "Data bundles delivered within minutes across all networks in Ghana" },
  { icon: CreditCard, title: "Secure Paystack Payment", desc: "Pay safely with Mobile Money (MoMo) and bank cards" },
  { icon: Signal, title: "All Networks", desc: "MTN Ghana, Telecel Ghana, and AirtelTigo data bundles" },
  { icon: MapPin, title: "Ghana-Wide", desc: "Serving customers in Accra, Kumasi, Tamale, and all of Ghana." },
];

const NETWORK_LINKS = [
  { name: "Buy MTN Data Bundles — Ghana", to: "/buy-data?network=MTN", color: "hsl(48 100% 50%)" },
  { name: "Buy Telecel Data Bundles — Ghana", to: "/buy-data?network=Telecel", color: "hsl(0 85% 50%)" },
  { name: "Buy AirtelTigo Data Bundles — Ghana", to: "/buy-data?network=AirtelTigo", color: "hsl(210 85% 45%)" },
];

const KEYWORD_LINKS = [
  ["Cheap Data Bundles Ghana", "/buy-data"],
  ["Buy Data Online Ghana", "/buy-data"],
  ["MTN Data Prices", "/buy-data?network=MTN"],
  ["Telecel Data Prices", "/buy-data?network=Telecel"],
  ["AirtelTigo Data Prices", "/buy-data?network=AirtelTigo"],
  ["Blog & Guides", "/blog"],
];

export function InfoSection() {
  return (
    <section className="border-y border-border bg-card py-16 md:py-24">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Buy Affordable Data Bundles in Ghana</h2>
          <p className="mt-4 text-sm md:text-base text-muted-foreground">
            Bestdata is Ghana's trusted platform for buying MTN data bundles, Telecel data bundles, and AirtelTigo data bundles online.
            Enjoy fast delivery, secure Paystack payments via Mobile Money, and affordable prices on all data packages.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {INFO_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl border border-border p-4 bg-background">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-3 text-sm font-bold">{f.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{f.desc}</div>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
          {NETWORK_LINKS.map((n) => (
            <a key={n.name} href={n.to} className="group flex items-center gap-3 rounded-2xl border border-border bg-background p-4 hover:border-primary hover:-translate-y-0.5 transition-all">
              <div className="grid h-10 w-10 place-items-center rounded-full" style={{ background: `${n.color}20` }}>
                <Signal className="h-4 w-4" style={{ color: n.color }} />
              </div>
              <div className="flex-1 text-sm font-semibold">{n.name}</div>
              <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
          {KEYWORD_LINKS.map(([label, href]) => (
            <a key={label} href={href} className="text-primary hover:underline">{label}</a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ Blog section ============ */
const POSTS = [
  { category: "Bill Payments", title: "How to Pay Bills Online in Ghana With Mobile Money", excerpt: "Pay ECG, Ghana Water, DSTV and GoTV online with Mobile Money from your phone. Here is exactly what you need and how long it takes.", date: "Jul 11, 2026", slug: "pay-bills-online-ghana-mobile-money" },
  { category: "AirtelTigo", title: "AT BigTime Data Bundles in Ghana Explained", excerpt: "AT BigTime data bundles explained: what AirtelTigo BigTime is, who it suits, and a cheaper way to keep an AT line loaded with data.", date: "Jul 11, 2026", slug: "at-bigtime-data-bundles-ghana" },
  { category: "Diaspora", title: "How to Buy Data for Ghana From Abroad", excerpt: "A simple guide for the diaspora: buy data for Ghana from abroad, pay with your card, and have the bundle land on your family phone in minutes.", date: "Jul 11, 2026", slug: "buy-data-for-ghana-from-abroad" },
];

export function BlogSection() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-[1152px] px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <Reveal><SectionHeading eyebrow="From the Blog" title="Data bundle tips & guides" align="left" /></Reveal>
          <a href="/blog" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">View all <ArrowRight className="h-4 w-4" /></a>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {POSTS.map((p, i) => (
            <Reveal key={p.slug} delay={i * 80}>
              <a href={`/blog/${p.slug}`} className="group relative block h-full overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] hover:-translate-y-1 hover:shadow-[var(--shadow-hover)] transition-all">
                <div className="absolute inset-x-0 top-0 h-[2px] gold-gradient" />
                <span className="inline-block rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">{p.category}</span>
                <h3 className="mt-3 text-base font-bold leading-snug line-clamp-2 text-foreground group-hover:text-primary">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {p.date}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-primary">Read <ArrowRight className="h-3.5 w-3.5" /></span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ Support CTA ============ */
export function SupportCTA() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl rounded-3xl border-2 border-primary/30 bg-primary/5 p-8 md:p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full gold-gradient shadow-[var(--shadow-gold)]">
              <MessageSquare className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="eyebrow mt-4">Support</div>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold">Need Help?</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Our AI support assistant can help you with orders, deposits, and any questions — instantly.
            </p>
            <div className="mt-6">
              <Link to="/support" className="inline-flex items-center gap-2 rounded-2xl gold-gradient px-5 h-10 text-sm font-bold text-primary-foreground shadow-[var(--shadow-gold)] active:scale-[.97]">
                Visit Support Center <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> AI Support: 9 AM – 9 PM</span>
              <span>·</span>
              <a href="mailto:support@bestdata.com" className="inline-flex items-center gap-1 hover:text-primary"><Mail className="h-3.5 w-3.5" /> support@bestdata.com</a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
