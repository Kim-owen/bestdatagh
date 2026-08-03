import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  ArrowRight, Check, Plus, Zap, Shield, Sparkles, PhoneCall, HelpCircle, CheckCircle2, Star,
  TrendingDown, Calculator, ShieldCheck, Clock, Award, ChevronDown, Percent
} from "lucide-react";
import { Reviews } from "@/components/site/Reviews";
import { useCart } from "@/lib/cart";
import { InstantBuyModal, type InstantBuyItem } from "@/components/site/InstantBuyModal";
import { NetworkLogo } from "@/components/site/NetworkLogos";
import { AISmartRecommender } from "@/components/site/AISmartRecommender";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listActiveBundles } from "@/lib/public-bundles.functions";

const MTN_UP2U_FALLBACKS = [
  { size: "1 GB", price: 4.15, popular: false, standardPrice: 10.00 },
  { size: "2 GB", price: 8.15, popular: false, standardPrice: 20.00 },
  { size: "3 GB", price: 12.15, popular: true, standardPrice: 30.00 },
  { size: "5 GB", price: 19.15, popular: false, standardPrice: 50.00 },
  { size: "10 GB", price: 37.15, popular: true, standardPrice: 90.00 },
  { size: "15 GB", price: 54.15, popular: false, standardPrice: 135.00 },
  { size: "20 GB", price: 71.15, popular: true, standardPrice: 180.00 },
  { size: "50 GB", price: 172.15, popular: false, standardPrice: 400.00 },
  { size: "100 GB", price: 340.0, popular: true, standardPrice: 750.00 },
];

const FAQS = [
  {
    q: "What is MTN UP2U data package in Ghana?",
    a: "MTN UP2U (Yello Data) is a special high-speed non-expiry mobile data bundle offered at wholesale discounted rates across Ghana. It delivers full high-speed 4G/5G data directly to your MTN mobile number without speed throttling."
  },
  {
    q: "How fast is MTN UP2U bundle delivery on BestData?",
    a: "MTN UP2U data delivery is 100% automated via Edge dispatch servers. Once payment is completed via MTN MoMo or Bank Card on Paystack, your bundle is dispatched to your phone number within 1 to 5 seconds."
  },
  {
    q: "How do I check my MTN UP2U data balance?",
    a: "You can check your MTN UP2U data balance anytime by dialing *124# or *310# on your MTN line, or through the official MyMTN app."
  },
  {
    q: "Do MTN UP2U data packages expire?",
    a: "No! MTN UP2U data packages feature 90-day to non-expiry validity, allowing you to use your data freely without rollover stress or monthly expiration penalties."
  },
  {
    q: "Can I buy MTN UP2U data for a friend or relative in Ghana?",
    a: "Yes! Simply enter the recipient's MTN phone number during checkout, and the UP2U data bundle will be instantly delivered directly to their line."
  },
  {
    q: "What makes BestData the best site for MTN UP2U in Ghana?",
    a: "BestData offers Ghana's lowest wholesale prices, 24/7 automated instant delivery, live order tracking with status updates, secure Paystack protection, and dedicated customer support."
  }
];

export const Route = createFileRoute("/mtn-up2u")({
  head: () => {
    const canonicalUrl = "https://www.bestdatagh.shop/mtn-up2u";
    const title = "MTN UP2U Data Packages Ghana — Buy Cheap MTN Yello Data 2026 | BestData";
    const description = "Buy cheap MTN UP2U data packages online in Ghana. Instant 5-second automated delivery, 90-day non-expiry validity, 1GB to 100GB packages via MTN MoMo.";

    const schemaOrgJSONLD = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": canonicalUrl,
          "url": canonicalUrl,
          "name": title,
          "description": description,
          "isPartOf": {
            "@type": "WebSite",
            "name": "BestData Ghana",
            "url": "https://bestdatagh.com"
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://bestdatagh.com" },
            { "@type": "ListItem", "position": 2, "name": "Buy Data", "item": "https://bestdatagh.com/buy-data" },
            { "@type": "ListItem", "position": 3, "name": "MTN UP2U Data Packages", "item": canonicalUrl }
          ]
        },
        {
          "@type": "Product",
          "name": "MTN UP2U Data Packages",
          "description": "Cheap MTN UP2U high-speed non-expiry data packages with instant 5-second automated delivery across Ghana.",
          "brand": {
            "@type": "Brand",
            "name": "MTN Ghana"
          },
          "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "GHS",
            "lowPrice": "4.15",
            "highPrice": "340.00",
            "offerCount": "9",
            "availability": "https://schema.org/InStock"
          }
        },
        {
          "@type": "FAQPage",
          "mainEntity": FAQS.map(faq => ({
            "@type": "Question",
            "name": faq.q,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.a
            }
          }))
        }
      ]
    };

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: "MTN UP2U, MTN UP2U packages, cheap MTN data Ghana, MTN UP2U prices, buy MTN UP2U bundle, MTN Yello data, MTN non expiry data, MTN UP2U code, BestData Ghana" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonicalUrl },
        { property: "og:site_name", content: "BestData Ghana" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" }
      ],
      links: [{ rel: "canonical", href: canonicalUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(schemaOrgJSONLD)
        }
      ]
    };
  },
  component: MtnUp2uPage,
});

function MtnUp2uPage() {
  const { addItem, open: openCart } = useCart();
  const [instant, setInstant] = useState<InstantBuyItem>(null);
  const [selectedCalcIndex, setSelectedCalcIndex] = useState(2); // 3GB default

  const getPublicList = useServerFn(listActiveBundles);
  const { data: dbBundles } = useQuery({
    queryKey: ["activeBundles"],
    queryFn: () => getPublicList(),
  });

  const mtnBundles = useMemo(() => {
    if (!dbBundles || !Array.isArray(dbBundles) || dbBundles.length === 0) {
      return MTN_UP2U_FALLBACKS.map(b => ({
        id: `MTN-${b.size}`,
        network: "MTN",
        size: b.size,
        price: b.price,
        popular: b.popular,
        standardPrice: b.standardPrice
      }));
    }

    const filtered = dbBundles.filter((b: any) => {
      const net = (b.network || "").toLowerCase();
      return net.includes("mtn") || net.includes("yello") || net.includes("up2u");
    });

    if (filtered.length === 0) {
      return MTN_UP2U_FALLBACKS.map(b => ({
        id: `MTN-${b.size}`,
        network: "MTN",
        size: b.size,
        price: b.price,
        popular: b.popular,
        standardPrice: b.standardPrice
      }));
    }

    return filtered.map((b: any) => {
      const price = Number(b.price_ghs);
      return {
        id: b.id,
        network: "MTN",
        size: b.size_label || `${b.size_mb / 1024} GB`,
        price,
        popular: !!b.popular,
        standardPrice: Number((price * 2.2).toFixed(2))
      };
    });
  }, [dbBundles]);

  const calcBundle = mtnBundles[selectedCalcIndex] || mtnBundles[0];
  const savings = Math.max(0, calcBundle.standardPrice - calcBundle.price);
  const savingsPct = Math.round((savings / calcBundle.standardPrice) * 100);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        {/* SEO Hero Header Section */}
        <section className="border-b border-border/60 bg-gradient-to-b from-amber-500/15 via-card/50 to-background relative overflow-hidden">
          <div aria-hidden className="absolute -top-32 -right-32 h-96 w-96 rounded-full blur-[120px] bg-amber-400/20" />
          <div aria-hidden className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full blur-[100px] bg-amber-500/10" />

          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-14 md:py-20 relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-black text-amber-400 uppercase tracking-widest mb-4 shadow-sm">
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" /> Ghana's Premier MTN UP2U Wholesale Hub
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight font-display leading-[1.1]">
                MTN UP2U Data Packages <span className="text-amber-400 font-extrabold">& Wholesale Prices</span>
              </h1>
              <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
                Get cheap <strong className="text-foreground font-bold">MTN UP2U (Yello Non-Expiry Data)</strong> packages in Ghana with 100% automated 5-second instant delivery. Save up to 55% compared to standard USSD airtime rates!
              </p>
            </div>

            {/* Interactive Quick Calculator Card Widget */}
            <div className="mt-10 rounded-3xl border border-amber-400/30 bg-card/90 p-6 md:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-lg">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider">
                    <Calculator className="h-4 w-4" /> Live MTN UP2U Instant Savings Calculator
                  </div>
                  <h3 className="text-xl md:text-2xl font-black font-display">Select Package Size to Calculate Savings</h3>
                  <p className="text-xs text-muted-foreground">See how much money you save on BestData compared to standard USSD rates.</p>
                </div>

                <div className="w-full lg:w-auto flex flex-wrap items-center gap-2">
                  {mtnBundles.slice(0, 6).map((b, idx) => (
                    <button
                      key={b.size}
                      onClick={() => setSelectedCalcIndex(idx)}
                      className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all ${
                        selectedCalcIndex === idx
                          ? "bg-amber-400 text-slate-950 shadow-lg scale-105"
                          : "bg-background border border-border/80 text-foreground hover:bg-muted"
                      }`}
                    >
                      {b.size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculator Output Display */}
              <div className="mt-6 pt-6 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-background/80 p-4 rounded-2xl border border-border/60">
                  <div className="text-[10px] font-extrabold uppercase text-muted-foreground">Package Size</div>
                  <div className="text-2xl font-black text-amber-400 font-display mt-1">{calcBundle.size}</div>
                </div>

                <div className="bg-background/80 p-4 rounded-2xl border border-border/60">
                  <div className="text-[10px] font-extrabold uppercase text-muted-foreground">BestData UP2U Price</div>
                  <div className="text-2xl font-black text-foreground font-display mt-1">GH₵ {calcBundle.price.toFixed(2)}</div>
                </div>

                <div className="bg-background/80 p-4 rounded-2xl border border-border/60">
                  <div className="text-[10px] font-extrabold uppercase text-muted-foreground">Standard USSD Rate</div>
                  <div className="text-2xl font-black text-muted-foreground line-through font-display mt-1">GH₵ {calcBundle.standardPrice.toFixed(2)}</div>
                </div>

                <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/30">
                  <div className="text-[10px] font-extrabold uppercase text-emerald-400 flex items-center justify-center gap-1">
                    <TrendingDown className="h-3 w-3" /> You Save ({savingsPct}%)
                  </div>
                  <div className="text-2xl font-black text-emerald-400 font-display mt-1">GH₵ {savings.toFixed(2)}</div>
                </div>
              </div>

              <div className="mt-6 text-center sm:text-right">
                <button
                  onClick={() => setInstant({ network: "MTN", size: calcBundle.size, price: calcBundle.price })}
                  className="inline-flex items-center gap-2 rounded-2xl gold-gradient px-8 py-3.5 text-xs font-black text-primary-foreground shadow-xl hover:scale-[1.03] active:scale-[.97] transition-all"
                >
                  Buy {calcBundle.size} MTN UP2U Bundle Now <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Live MTN UP2U Packages Grid */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3 border-b border-border/40 pb-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-black flex items-center gap-2.5 font-display">
                  <span className="inline-block h-3.5 w-3.5 rounded-full bg-amber-400 animate-ping" />
                  All Available MTN UP2U Bundles
                </h2>
                <p className="text-xs font-semibold text-muted-foreground mt-1">Real-time updated MTN UP2U package pricing for all MTN numbers in Ghana</p>
              </div>
              <div className="text-xs font-bold text-amber-400 bg-amber-400/10 px-3.5 py-1.5 rounded-full border border-amber-400/30 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-amber-400" /> Best Price Guarantee
              </div>
            </div>

            <AISmartRecommender />

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {mtnBundles.map((b) => (
                <div
                  key={b.size}
                  className="group relative overflow-hidden rounded-3xl border border-amber-400/20 bg-card p-5 shadow-sm hover:-translate-y-1.5 hover:shadow-2xl hover:border-amber-400/40 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-amber-400" />
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400/10 p-1.5 shadow-sm ring-1 ring-amber-400/30">
                        <NetworkLogo network="MTN" className="h-8 w-8" />
                      </div>
                      {b.popular && (
                        <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-400 border border-amber-400/30">
                          Popular UP2U
                        </span>
                      )}
                    </div>

                    <div className="mt-5 text-3xl font-black tracking-tight font-display text-foreground">{b.size}</div>
                    <div className="mt-1 text-xs font-semibold text-amber-400/90 font-mono">MTN UP2U · 90 Days</div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/40">
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Price</span>
                      <span className="text-xl font-black text-amber-400 font-display">GH₵ {b.price.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          addItem({ id: `${b.network}-${b.size}`, network: "MTN", size: b.size, price: b.price });
                          openCart();
                        }}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-border/80 bg-background px-2.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted active:scale-[.97] transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" /> Cart
                      </button>
                      <button
                        onClick={() => setInstant({ network: "MTN", size: b.size, price: b.price })}
                        className="inline-flex items-center justify-center gap-1 rounded-xl gold-gradient px-2.5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-lg hover:scale-[1.03] active:scale-[.97] transition-all"
                      >
                        Buy UP2U <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Comparison Matrix Section */}
        <section className="py-12 bg-card/30 border-y border-border/60">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
            <div className="max-w-3xl mb-8">
              <h2 className="text-2xl md:text-4xl font-black font-display tracking-tight">
                Why BestData is Ghana's #1 MTN UP2U Provider
              </h2>
              <p className="mt-2 text-xs md:text-sm text-muted-foreground leading-relaxed">
                Compare BestData's automated MTN UP2U service with standard USSD airtime top-ups.
              </p>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-border/80 bg-card backdrop-blur-xl shadow-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-card/80 text-muted-foreground uppercase font-mono border-b border-border/60">
                  <tr>
                    <th className="p-4">Feature / Benefit</th>
                    <th className="p-4 text-amber-400 font-extrabold">BestData MTN UP2U</th>
                    <th className="p-4">Standard USSD (*138#)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  <tr>
                    <td className="p-4 font-bold text-foreground">10GB Data Package Price</td>
                    <td className="p-4 text-emerald-400 font-black text-sm">GH₵ 37.15 (Save 58%)</td>
                    <td className="p-4 text-muted-foreground line-through">GH₵ 90.00</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-foreground">Delivery Speed</td>
                    <td className="p-4 text-amber-400 font-bold">⚡ 1 to 5 Seconds (Instant Edge Dispatch)</td>
                    <td className="p-4 text-muted-foreground">Manual USSD prompts</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-foreground">Validity Period</td>
                    <td className="p-4 text-emerald-400 font-bold">90 Days / Non-Expiry</td>
                    <td className="p-4 text-muted-foreground">Varies / Monthly Reset</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-foreground">Payment Method</td>
                    <td className="p-4 text-foreground font-bold">All MoMo Networks (MTN, Telecel, AT) & Cards</td>
                    <td className="p-4 text-muted-foreground">Airtime balance only</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-foreground">Live Order Progress Tracker</td>
                    <td className="p-4 text-emerald-400 font-bold">✅ Yes (Real-time tracker step timeline)</td>
                    <td className="p-4 text-muted-foreground">❌ None</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Structured FAQ Section */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
            <div className="max-w-2xl mb-8">
              <h2 className="text-2xl md:text-4xl font-black font-display tracking-tight flex items-center gap-2">
                <HelpCircle className="h-7 w-7 text-amber-400" /> Frequently Asked Questions (FAQ)
              </h2>
              <p className="mt-2 text-xs md:text-sm text-muted-foreground">Answers to common questions regarding MTN UP2U data purchase and delivery.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {FAQS.map((faq, idx) => (
                <div key={idx} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-2">
                  <h3 className="text-sm font-bold text-amber-400 font-display flex items-start gap-2">
                    <span className="text-xs bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md shrink-0">Q{idx + 1}</span>
                    {faq.q}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-8">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Reviews />
      </main>

      {/* Instant Buy Modal */}
      {instant && (
        <InstantBuyModal item={instant} onClose={() => setInstant(null)} />
      )}

      <Footer />
    </div>
  );
}
