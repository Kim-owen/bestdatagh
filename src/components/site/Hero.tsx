import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicHeroSlides } from "@/lib/admin.functions";
import { ArrowRight, ShieldCheck, Zap, Lock, Users, Check, Wifi, Sparkles, Phone, CreditCard } from "lucide-react";
import { NetworkLogo } from "./NetworkLogos";
import { type Network } from "@/lib/cart";

const NETWORKS = [
  { key: "MTN" as Network, label: "MTN", color: "from-amber-500/20 to-yellow-500/5", border: "border-amber-500/50", glow: "shadow-[0_0_20px_rgba(245,158,11,0.25)]", text: "text-amber-400" },
  { key: "Telecel" as Network, label: "Telecel", color: "from-rose-500/20 to-red-500/5", border: "border-rose-500/50", glow: "shadow-[0_0_20px_rgba(244,63,94,0.25)]", text: "text-rose-400" },
  { key: "AirtelTigo" as Network, label: "AT (AirtelTigo)", color: "from-blue-500/20 to-cyan-500/5", border: "border-blue-500/50", glow: "shadow-[0_0_20px_rgba(59,130,246,0.25)]", text: "text-blue-400" },
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
      title: "What Are We Doing Today?",
      subtitle: "Instant MTN Data Bundles at Wholesale Rates",
      tag: "🟡 MTN GHANA",
      mediaType: "image" as const,
      mediaUrl: "/backgrounds/mtn-eye-bg.jpg",
      active: true,
      sortOrder: 1,
    },
    {
      id: "mtn-sphere-slide",
      title: "Bestdata Ghana Hub",
      subtitle: "Automated MoMo Dispatch & Agent Portal",
      tag: "⚡ INSTANT DELIVERY",
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
    <section className="relative overflow-hidden bg-[#060612] text-foreground">
      {/* Dynamic Site Background Image/Video Layer (Crystal Clear) */}
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
              className="w-full h-full object-cover opacity-90 transition-opacity duration-1000"
            />
          ) : (
            <img
              key={currentSlide.mediaUrl}
              src={currentSlide.mediaUrl}
              alt={currentSlide.title}
              className="w-full h-full object-cover opacity-90 transition-opacity duration-1000"
            />
          )}
          {/* Subtle vignette for edge framing */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060612]/80 via-transparent to-[#060612]/30" />
        </div>
      )}

      {/* Dynamic Multi-layered Ambient Glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 h-[40rem] w-[40rem] rounded-full bg-indigo-600/15 blur-[140px] animate-pulse" />
        <div className="absolute top-1/3 -right-40 h-[36rem] w-[36rem] rounded-full bg-purple-600/15 blur-[140px]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 py-12 md:py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* LEFT COLUMN — High Impact Copy & Value Proposition */}
          <div className="lg:col-span-7 flex flex-col space-y-8">
            {/* Live Badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full bg-primary/10 border border-primary/30 px-4 py-2 w-fit backdrop-blur-xl shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" /> {currentSlide?.tag || "Ghana Data Hub"}
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-[62px] font-black leading-[1.08] tracking-tight font-display text-white">
                The cheapest data <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
                  bundles in Ghana.
                </span>
              </h1>
              <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
                {currentSlide?.subtitle || "Instant MTN, Telecel, and AirtelTigo high-speed data bundles at true wholesale rates."}
                <span className="text-white font-semibold"> No hidden fees, instant MoMo dispatch.</span>
              </p>
            </div>

            {/* Action CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-1">
              <button
                onClick={handleBuyNow}
                className="group relative inline-flex items-center justify-center gap-2.5 rounded-2xl gold-gradient px-8 h-14 text-sm font-black text-primary-foreground shadow-[0_10px_30px_-5px_hsl(243_85%_62%_/_0.6)] hover:scale-[1.02] active:scale-[.98] transition-all"
              >
                <span>Buy Data Now</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                to="/auth"
                search={{ tab: "signup", next: undefined }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 backdrop-blur-xl px-7 h-14 text-sm font-bold text-white active:scale-[.98] transition-all"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Create Free Account</span>
              </Link>
            </div>

            {/* Glassmorphism Stat Cards */}
            <div className="grid grid-cols-3 gap-3 pt-4 max-w-lg">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xl shadow-lg">
                <div className="text-xl sm:text-2xl font-black text-white font-mono">100k+</div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">Happy Users</div>
              </div>
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 backdrop-blur-xl shadow-lg">
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">Instant</div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/80 mt-0.5">MoMo Delivery</div>
              </div>
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 backdrop-blur-xl shadow-lg">
                <div className="text-xl sm:text-2xl font-black text-indigo-300 font-mono">Paystack</div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300/80 mt-0.5">256-Bit Encrypted</div>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-300 pt-2">
              <span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4 text-amber-400" /> Automated Delivery</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4 text-emerald-400" /> Paystack Secured</span>
              <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-indigo-400" /> Reseller Friendly</span>
            </div>
          </div>

          {/* RIGHT COLUMN — Ultra-Pro Interactive FinTech Purchase Card */}
          <div className="lg:col-span-5 relative group">
            {/* Outer Ambient Glow */}
            <div aria-hidden className="absolute -inset-1.5 rounded-[36px] bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 blur-2xl opacity-25 group-hover:opacity-40 transition duration-700" />
            
            <div className="relative rounded-[32px] border border-white/15 bg-slate-900/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
              
              {/* Premium Gold Wholesale Banner */}
              <div className="relative p-6 sm:p-7 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 shadow-md">
                <div aria-hidden className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-black/10 blur-xl" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-950 animate-pulse" /> Wholesale Rate Live
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono">GHS 3.71</span>
                      <span className="text-slate-900 text-sm font-extrabold">/ GB</span>
                    </div>
                    <p className="mt-1 text-slate-950 text-xs font-bold opacity-90">Cheapest price in Ghana · Updated hourly</p>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-amber-400 shadow-xl">
                    <Wifi className="h-6 w-6 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 sm:p-7 space-y-6">
                
                {/* Service Segmented Pills */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-white/10">
                  {(["Data", "Airtime", "AFA"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setServiceType(type)}
                      className={`py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                        serviceType === type
                          ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Network Selection Grid */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 text-[11px] font-extrabold uppercase tracking-widest">Select Network</label>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Auto-Matched</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {NETWORKS.map((n) => {
                      const isSelected = selectedNetwork === n.key;
                      return (
                        <button
                          key={n.key}
                          type="button"
                          onClick={() => setSelectedNetwork(n.key)}
                          className={`relative flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border transition-all ${
                            isSelected
                              ? `bg-slate-900 ${n.border} ${n.glow} scale-[1.03]`
                              : "bg-slate-950/60 border-white/10 hover:border-white/20 hover:bg-slate-900/50"
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-white ring-2 ring-slate-900 shadow-md">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          )}
                          <div className="h-10 w-full grid place-items-center">
                            <NetworkLogo network={n.key} className="h-8 w-8" />
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
                  <div className="relative flex items-center bg-slate-950 border border-white/15 rounded-2xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-inner">
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

                {/* Bundle Options */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 text-[11px] font-extrabold uppercase tracking-widest">Selected Bundle</label>
                    <button onClick={handleBuyNow} className="text-[11px] font-bold text-primary hover:underline">View All Bundles →</button>
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
                              ? "bg-primary/15 border-primary shadow-[0_4px_16px_rgba(99,102,241,0.2)]"
                              : "bg-slate-950/60 border-white/10 hover:border-white/20 hover:bg-slate-900/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-mono text-xs font-black ${
                              isSelected ? "bg-primary text-primary-foreground shadow-md" : "bg-white/5 text-slate-400"
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

                {/* Instant Purchase Submit */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="w-full flex items-center justify-center gap-2.5 rounded-2xl gold-gradient py-4 text-sm font-black text-primary-foreground shadow-[0_10px_30px_-5px_hsl(243_85%_62%_/_0.5)] hover:scale-[1.02] active:scale-[.98] transition-all"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Proceed to Instant Checkout</span>
                    <ArrowRight className="h-4 w-4" />
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
