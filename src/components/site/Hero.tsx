import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicHeroSlides } from "@/lib/admin.functions";
import {
  ArrowRight, ShieldCheck, Zap, Lock, Users, Check, Wifi, Sparkles, Phone, CreditCard,
  TrendingDown, CheckCircle2, Star, Activity, Search
} from "lucide-react";
import { NetworkLogo } from "./NetworkLogos";
import { type Network } from "@/lib/cart";

const NETWORKS = [
  { key: "MTN" as Network, label: "MTN UP2U", color: "from-amber-500/25 via-amber-500/10 to-transparent", border: "border-amber-400/60", glow: "shadow-[0_0_25px_rgba(245,158,11,0.35)]", text: "text-amber-400" },
  { key: "Telecel" as Network, label: "Telecel", color: "from-rose-500/25 via-rose-500/10 to-transparent", border: "border-rose-500/60", glow: "shadow-[0_0_25px_rgba(244,63,94,0.35)]", text: "text-rose-400" },
  { key: "AirtelTigo" as Network, label: "AT iShare", color: "from-sky-500/25 via-sky-500/10 to-transparent", border: "border-sky-400/60", glow: "shadow-[0_0_25px_rgba(56,189,248,0.35)]", text: "text-sky-400" },
] as const;

export function Hero() {
  const navigate = useNavigate();
  const [selectedNetwork, setSelectedNetwork] = useState<Network>("MTN");
  const [serviceType, setServiceType] = useState<"Data" | "Airtime" | "AFA">("Data");
  const [phone, setPhone] = useState("");
  const [selectedBundle, setSelectedBundle] = useState<string>("5 GB");
  const [slideIndex, setSlideIndex] = useState(0);

  const fetchSlides = useServerFn(getPublicHeroSlides);
  const { data: slides } = useQuery({
    queryKey: ["publicHeroSlides"],
    queryFn: () => fetchSlides(),
  });

  const activeSlides = slides && slides.length > 0 ? slides : [
    {
      id: "mtn-eye-slide",
      title: "Ghana's Premier Wholesale Data Hub",
      subtitle: "Instant MTN UP2U, Telecel & AirtelTigo Bundles at Wholesale Rates",
      tag: "🟡 MTN UP2U WHLESALE",
      mediaType: "image" as const,
      mediaUrl: "/backgrounds/mtn-eye-bg.jpg",
      active: true,
      sortOrder: 1,
    },
    {
      id: "mtn-sphere-slide",
      title: "Automated MoMo Dispatch System",
      subtitle: "1-5 Second Instant Auto-Delivery Across All Ghana Networks",
      tag: "⚡ 100% AUTOMATED DISPATCH",
      mediaType: "image" as const,
      mediaUrl: "/backgrounds/mtn-sphere-bg.jpg",
      active: true,
      sortOrder: 2,
    },
  ];

  // Auto-rotate background slide every 7 seconds
  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  const currentSlide = activeSlides[slideIndex % activeSlides.length];

  const bundles = [
    { size: "2 GB", validity: "90 days", price: "8.15", tag: null },
    { size: "5 GB", validity: "90 days", price: "19.15", tag: "Popular" },
    { size: "10 GB", validity: "90 days", price: "37.15", tag: "Best Value" },
  ];

  function handleBuyNow() {
    navigate({
      to: "/buy-data",
      search: { network: selectedNetwork },
    });
  }

  return (
    <section className="relative overflow-hidden bg-[#05050f] text-foreground">
      {/* Background Image / Video Slide */}
      {currentSlide?.mediaUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none transition-all duration-1000 ease-in-out">
          {currentSlide.mediaType === "video" ? (
            <video
              key={currentSlide.mediaUrl}
              src={currentSlide.mediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover opacity-80 transition-opacity duration-1000"
            />
          ) : (
            <img
              key={currentSlide.mediaUrl}
              src={currentSlide.mediaUrl}
              alt={currentSlide.title}
              className="w-full h-full object-cover opacity-80 transition-opacity duration-1000"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#05050f] via-[#05050f]/80 to-[#05050f]/40" />
        </div>
      )}

      {/* Multi-layered Ambient Neon Glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 h-[42rem] w-[42rem] rounded-full bg-amber-500/20 blur-[150px] animate-pulse" />
        <div className="absolute top-1/3 -right-40 h-[38rem] w-[38rem] rounded-full bg-purple-600/20 blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 h-[32rem] w-[32rem] rounded-full bg-emerald-500/15 blur-[140px]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 py-12 md:py-20 lg:py-24">
        
        {/* Top Ticker Status Ribbon */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-2xl shadow-xl">
          <div className="flex items-center gap-2.5 text-xs font-extrabold text-amber-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono uppercase tracking-wider text-[11px] text-white">
              ⚡ Live Dispatch Engine: <span className="text-emerald-400 font-black">All Networks Operational (1-5s Delivery)</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-[11px] font-bold text-slate-300">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Paystack 256-Bit SSL</span>
            <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> 4.9/5 Rating (12,400+ Reviews)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* LEFT COLUMN — Main Headline & Value Proposition */}
          <div className="lg:col-span-7 flex flex-col space-y-8">
            
            {/* Live Tag Pill */}
            <div className="inline-flex items-center gap-2.5 rounded-full bg-amber-400/10 border border-amber-400/30 px-4 py-2 w-fit backdrop-blur-xl shadow-lg">
              <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
                {currentSlide?.tag || "GHANA'S #1 DATA HUB"}
              </span>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-[62px] font-black leading-[1.08] tracking-tight font-display text-white">
                Ghana's Leading <br />
                <span className="bg-gradient-to-r from-amber-400 via-yellow-200 to-emerald-400 bg-clip-text text-transparent drop-shadow-md">
                  Wholesale Data Hub.
                </span>
              </h1>
              <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
                Buy cheap <strong className="text-amber-400 font-extrabold">MTN UP2U</strong>, Telecel, and AirtelTigo bundles with 100% automated 5-second Mobile Money delivery. Non-expiry packages from 1GB to 100GB.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-1">
              <button
                onClick={handleBuyNow}
                className="group relative inline-flex items-center justify-center gap-2.5 rounded-2xl gold-gradient px-8 h-14 text-sm font-black text-slate-950 shadow-[0_10px_35px_-5px_rgba(245,158,11,0.5)] hover:scale-[1.03] active:scale-[.97] transition-all"
              >
                <span>Buy Data Now</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <Link
                to="/mtn-up2u"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 backdrop-blur-xl px-7 h-14 text-sm font-extrabold text-amber-400 active:scale-[.97] transition-all shadow-md"
              >
                <Zap className="h-4 w-4" />
                <span>MTN UP2U Bundles</span>
              </Link>
            </div>

            {/* Glassmorphism Stat Cards */}
            <div className="grid grid-cols-3 gap-3 pt-4 max-w-lg">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-lg">
                <div className="text-xl sm:text-2xl font-black text-white font-mono">100k+</div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">Active Customers</div>
              </div>
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 backdrop-blur-xl shadow-lg">
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">1-5 Sec</div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/90 mt-0.5">Auto MoMo Dispatch</div>
              </div>
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-xl shadow-lg">
                <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">55% Off</div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400/90 mt-0.5">Wholesale Savings</div>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-300 pt-2">
              <span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4 text-amber-400" /> Automated Delivery</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4 text-emerald-400" /> Paystack Secured</span>
              <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-indigo-400" /> Reseller Friendly</span>
            </div>
          </div>

          {/* RIGHT COLUMN — FinTech Purchase Card */}
          <div className="lg:col-span-5 relative group">
            {/* Ambient Neon Glow */}
            <div aria-hidden className="absolute -inset-2 rounded-[38px] bg-gradient-to-r from-amber-500 via-emerald-500 to-purple-500 blur-2xl opacity-30 group-hover:opacity-50 transition duration-700" />
            
            <div className="relative rounded-[32px] border border-white/15 bg-slate-950/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
              
              {/* Gold Banner */}
              <div className="relative p-6 sm:p-7 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 shadow-md">
                <div aria-hidden className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-black/10 blur-xl" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950">
                      <span className="h-2 w-2 rounded-full bg-emerald-950 animate-pulse" /> Wholesale Rate Live
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono">GH₵ 3.71</span>
                      <span className="text-slate-950 text-xs font-black uppercase">/ GB</span>
                    </div>
                    <p className="mt-1 text-slate-950 text-xs font-bold opacity-90">Ghana's Lowest Wholesale Rate · Real-time MoMo</p>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-amber-400 shadow-xl ring-2 ring-amber-400/40">
                    <Wifi className="h-6 w-6 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Card Form */}
              <div className="p-6 sm:p-7 space-y-5">
                
                {/* Service Segmented Pills */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-900 border border-white/10">
                  {(["Data", "Airtime", "AFA"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setServiceType(type)}
                      className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
                        serviceType === type
                          ? "bg-amber-400 text-slate-950 shadow-md scale-[1.02]"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Network Selection Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 text-[11px] font-extrabold uppercase tracking-widest">Select Network</label>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Auto-Matched</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {NETWORKS.map((n) => {
                      const isSelected = selectedNetwork === n.key;
                      return (
                        <button
                          key={n.key}
                          type="button"
                          onClick={() => setSelectedNetwork(n.key)}
                          className={`relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all ${
                            isSelected
                              ? `bg-slate-900 ${n.border} ${n.glow} scale-[1.03]`
                              : "bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900/50"
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-slate-950 ring-2 ring-slate-950 shadow-md">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          )}
                          <div className="h-8 w-full grid place-items-center">
                            <NetworkLogo network={n.key} className="h-7 w-7" />
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? n.text : "text-slate-400"}`}>
                            {n.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recipient Phone Number */}
                <div className="space-y-2">
                  <label className="text-slate-300 text-[11px] font-extrabold uppercase tracking-widest">Recipient Phone Number</label>
                  <div className="relative flex items-center bg-slate-900 border border-white/15 rounded-2xl overflow-hidden focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all shadow-inner">
                    <div className="flex items-center gap-1.5 pl-4 pr-3 py-3.5 text-slate-300 text-xs font-bold border-r border-white/10 bg-white/5">
                      <span>🇬🇭</span>
                      <span>+233</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="024 123 4567"
                      className="flex-1 bg-transparent px-4 py-3.5 text-white placeholder:text-slate-600 text-sm font-semibold focus:outline-none"
                    />
                    <Phone className="h-4 w-4 text-slate-500 mr-4 shrink-0" />
                  </div>
                </div>

                {/* Bundle Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 text-[11px] font-extrabold uppercase tracking-widest">Select Bundle</label>
                    <button onClick={handleBuyNow} className="text-[11px] font-bold text-amber-400 hover:underline">View All Bundles →</button>
                  </div>
                  <div className="space-y-2">
                    {bundles.map((b) => {
                      const isSelected = selectedBundle === b.size;
                      return (
                        <button
                          key={b.size}
                          type="button"
                          onClick={() => setSelectedBundle(b.size)}
                          className={`w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border transition-all text-left ${
                            isSelected
                              ? "bg-amber-400/15 border-amber-400 shadow-[0_4px_16px_rgba(245,158,11,0.2)]"
                              : "bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-mono text-xs font-black ${
                              isSelected ? "bg-amber-400 text-slate-950 shadow-md" : "bg-white/5 text-slate-400"
                            }`}>
                              {b.size.split(" ")[0]}G
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-black text-sm">{b.size}</span>
                                {b.tag && (
                                  <span className="rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider px-2 py-0.5">
                                    {b.tag}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-400 text-[11px] font-medium">{b.validity} · Non-expiry</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-emerald-400 font-mono font-black text-sm">GH₵ {b.price}</div>
                            <div className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Instant</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Instant Purchase Submit Button */}
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="w-full flex items-center justify-center gap-2.5 rounded-2xl gold-gradient py-4 text-sm font-black text-slate-950 shadow-[0_10px_35px_-5px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[.98] transition-all"
                  >
                    <CreditCard className="h-4 w-4 text-slate-950" />
                    <span>Proceed to Instant Checkout</span>
                    <ArrowRight className="h-4 w-4 text-slate-950" />
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">
                    <span>MTN MoMo</span>
                    <span className="h-1 w-1 rounded-full bg-slate-600" />
                    <span>Telecel Cash</span>
                    <span className="h-1 w-1 rounded-full bg-slate-600" />
                    <span>AT Money</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
