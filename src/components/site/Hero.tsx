import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Zap, Lock, Users, Check, Wifi } from "lucide-react";
import { NetworkLogo } from "./NetworkLogos";

const NETWORKS = [
  { key: "MTN", label: "MTN" },
  { key: "Telecel", label: "Telecel" },
  { key: "AirtelTigo", label: "AT (AirtelTigo)" },
] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0a0a1a]">
      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-[36rem] w-[36rem] rounded-full blur-[120px]" style={{ background: "rgba(79,70,229,0.18)" }} />
        <div className="absolute top-1/3 -right-40 h-[32rem] w-[32rem] rounded-full blur-[120px]" style={{ background: "rgba(30,30,90,0.55)" }} />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(79,70,229,.6), transparent)" }} />
      </div>

      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 py-14 md:py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* LEFT — copy */}
          <div className="flex flex-col space-y-8">
            <div className="reveal in-view inline-flex items-center gap-2 rounded-full bg-[#4f46e5]/10 border border-[#4f46e5]/25 px-3 py-1.5 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4f46e5] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4f46e5]" />
              </span>
              <span className="text-[#a5a3f5] text-[11px] font-bold uppercase tracking-[0.18em]">Marketplace Live · Ghana</span>
            </div>

            <div className="space-y-5">
              <h1 className="reveal in-view text-4xl md:text-5xl lg:text-[64px] font-bold text-white leading-[1.05] tracking-tight" style={{ animationDelay: "80ms" }}>
                The cheapest data
                <br />
                <span className="text-[#7c74ff]">bundles in Ghana.</span>
              </h1>
              <p className="reveal in-view text-slate-400 text-base md:text-lg max-w-xl" style={{ animationDelay: "160ms" }}>
                Instant MTN, Telecel and AirtelTigo bundles at wholesale prices. No signup, no login — enter a number, pay with MoMo, done.
              </p>
            </div>

            <div className="reveal in-view flex flex-col sm:flex-row items-stretch sm:items-center gap-3" style={{ animationDelay: "240ms" }}>
              <Link
                to="/buy-data"
                search={{ network: "MTN" }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4f46e5] hover:bg-[#4338ca] px-6 h-12 text-sm font-bold text-white shadow-[0_10px_30px_-8px_rgba(79,70,229,0.7)] active:scale-[.98] transition-all"
              >
                Buy Data Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/auth"
                search={{ tab: "signup", next: undefined }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 px-6 h-12 text-sm font-semibold text-white active:scale-[.98] transition-all"
              >
                <ShieldCheck className="h-4 w-4" /> Create Free Account
              </Link>
            </div>

            <div className="reveal in-view flex flex-wrap gap-8 items-center pt-2" style={{ animationDelay: "320ms" }}>
              <div className="space-y-0.5">
                <p className="text-white font-bold text-2xl">100k+</p>
                <p className="text-slate-500 text-[11px] uppercase tracking-widest">Happy users</p>
              </div>
              <div className="w-px h-10 bg-[#1e1e5a]" />
              <div className="space-y-0.5">
                <p className="text-white font-bold text-2xl">Instant</p>
                <p className="text-slate-500 text-[11px] uppercase tracking-widest">Delivery</p>
              </div>
              <div className="w-px h-10 bg-[#1e1e5a]" />
              <div className="space-y-0.5">
                <p className="text-white font-bold text-2xl">Paystack</p>
                <p className="text-slate-500 text-[11px] uppercase tracking-widest">Secure</p>
              </div>
            </div>

            <div className="reveal in-view flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/70 pt-1" style={{ animationDelay: "400ms" }}>
              <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-[#7c74ff]" /> Fast delivery</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-[#7c74ff]" /> Secure payments</span>
              <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-[#7c74ff]" /> Trusted by 1000s</span>
            </div>
          </div>

          {/* RIGHT — MyMTN-inspired bundle picker */}
          <div className="reveal in-view relative group" style={{ animationDelay: "300ms" }}>
            <div aria-hidden className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-[#4f46e5] to-[#1e1e5a] blur-2xl opacity-30 group-hover:opacity-50 transition duration-1000" />
            <div className="relative bg-[#141432] border border-[#1e1e5a] rounded-[32px] shadow-2xl overflow-hidden">
              {/* Yellow accent balance card (MyMTN vibe) */}
              <div className="relative p-6 sm:p-7" style={{ background: "linear-gradient(135deg, #FFCC00 0%, #FFB800 100%)" }}>
                <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-black/5" />
                <div aria-hidden className="absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-black/5" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/60">Wholesale Rate</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-black font-extrabold text-3xl sm:text-4xl tracking-tight">GHS 3.71</span>
                      <span className="text-black/60 text-sm font-semibold">/ GB</span>
                    </div>
                    <p className="mt-1 text-black/70 text-xs font-medium">Cheapest live price · updated hourly</p>
                  </div>
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-[#FFCC00]">
                    <Wifi className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Quick action pills */}
                <div className="flex gap-2">
                  <button type="button" className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#4f46e5] text-white text-xs font-bold py-2.5 shadow-[0_6px_18px_-6px_rgba(79,70,229,0.7)]">
                    Data
                  </button>
                  <button type="button" className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#0a0a1a] border border-[#1e1e5a] text-slate-400 hover:text-white hover:border-[#4f46e5]/60 text-xs font-semibold py-2.5">
                    Airtime
                  </button>
                  <button type="button" className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#0a0a1a] border border-[#1e1e5a] text-slate-400 hover:text-white hover:border-[#4f46e5]/60 text-xs font-semibold py-2.5">
                    AFA
                  </button>
                </div>

                {/* Network */}
                <div className="space-y-3">
                  <label className="text-slate-300 text-[11px] font-bold uppercase tracking-[0.2em]">Network</label>
                  <div className="grid grid-cols-3 gap-3">
                    {NETWORKS.map((n, i) => (
                      <button
                        key={n.key}
                        type="button"
                        className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all bg-white ${
                          i === 0
                            ? "ring-2 ring-[#4f46e5] shadow-[0_8px_24px_-8px_rgba(79,70,229,0.7)]"
                            : "ring-1 ring-[#1e1e5a] hover:ring-[#4f46e5]/70"
                        }`}
                      >
                        {i === 0 && (
                          <span className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#4f46e5] text-white ring-2 ring-[#141432]">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <div className="h-12 w-full grid place-items-center">
                          <NetworkLogo network={n.key} className="h-9 w-9" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800">{n.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-3">
                  <label className="text-slate-300 text-[11px] font-bold uppercase tracking-[0.2em]">Recipient number</label>
                  <div className="relative flex items-center bg-[#0a0a1a] border border-[#1e1e5a] rounded-2xl overflow-hidden focus-within:border-[#4f46e5] focus-within:ring-2 focus-within:ring-[#4f46e5]/20 transition-all">
                    <span className="pl-4 pr-3 py-4 text-slate-400 text-sm font-semibold border-r border-[#1e1e5a]">🇬🇭 +233</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="54 000 0000"
                      className="flex-1 bg-transparent px-4 py-4 text-white placeholder:text-slate-600 focus:outline-none"
                    />
                    <span className="pr-4 h-2 w-2 rounded-full bg-emerald-400 mr-4" />
                  </div>
                </div>

                {/* Bundle list (MyMTN row style) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 text-[11px] font-bold uppercase tracking-[0.2em]">Bundle</label>
                    <Link to="/buy-data" search={{ network: "MTN" }} className="text-[11px] font-semibold text-[#7c74ff] hover:text-white">View all →</Link>
                  </div>
                  <div className="space-y-2">
                    {[
                      { size: "2 GB", validity: "90 days", price: "8.15", tag: null },
                      { size: "5 GB", validity: "90 days", price: "19.15", tag: "Popular" },
                      { size: "10 GB", validity: "90 days", price: "37.15", tag: null },
                    ].map((b, i) => (
                      <button
                        key={b.size}
                        type="button"
                        className={`w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 border transition-all text-left ${
                          i === 1
                            ? "bg-[#1e1e5a]/70 border-[#4f46e5]"
                            : "bg-[#0a0a1a] border-[#1e1e5a] hover:border-[#4f46e5]/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${i === 1 ? "bg-[#4f46e5] text-white" : "bg-[#141432] text-[#7c74ff]"}`}>
                            <Wifi className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold text-sm">{b.size}</span>
                              {b.tag && (
                                <span className="rounded-full bg-[#FFCC00] text-black text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5">{b.tag}</span>
                              )}
                            </div>
                            <p className="text-slate-500 text-[11px]">{b.validity} · Instant delivery</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-white font-bold text-sm">GHS {b.price}</div>
                          <div className="text-slate-500 text-[10px] uppercase tracking-wider">Total</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <Link
                    to="/buy-data"
                    search={{ network: "MTN" }}
                    className="w-full inline-flex items-center justify-center gap-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[#4f46e5]/20 transition-all active:scale-[.98]"
                  >
                    Purchase bundle <ArrowRight className="h-4 w-4" />
                  </Link>

                  <div className="flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                    <span>Secured by Paystack</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span>MoMo · Visa · Mastercard</span>
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
