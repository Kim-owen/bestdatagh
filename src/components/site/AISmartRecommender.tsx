import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAIRecommendedDeals, RecommendedDeal } from "@/lib/ai-recommender.functions";
import { Sparkles, Zap, ShieldCheck, ArrowRight, Sliders, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function AISmartRecommender() {
  const getDeals = useServerFn(getAIRecommendedDeals);

  const [budgetGhs, setBudgetGhs] = useState(20);
  const [network, setNetwork] = useState("ALL");
  const [usageType, setUsageType] = useState<"light" | "social" | "streaming" | "heavy">("social");
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<RecommendedDeal[] | null>(null);

  async function handleRecommend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await getDeals({ data: { budgetGhs, network, usageType } });
      setDeals(res.recommendations || []);
    } catch {
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles className="h-3.5 w-3.5" /> AI Package Optimizer
          </div>
          <h2 className="text-xl md:text-2xl font-black font-display tracking-tight text-foreground">
            Smart Deal Finder
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Input your budget and network to let AI find the absolute cheapest cost per GB.
          </p>
        </div>
      </div>

      <form onSubmit={handleRecommend} className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-2xl border border-border/50">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1">
            <Sliders className="h-3.5 w-3.5 text-primary" /> Target Budget (GH₵)
          </label>
          <input
            type="number"
            min={1}
            max={500}
            value={budgetGhs}
            onChange={(e) => setBudgetGhs(Number(e.target.value) || 1)}
            className="w-full h-10 px-3.5 rounded-xl border border-border bg-card text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Network Provider</label>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl border border-border bg-card text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">All Networks (MTN, Telecel, AT)</option>
            <option value="MTN">MTN Yello</option>
            <option value="TELECEL">Telecel Ghana</option>
            <option value="AIRTEL">AirtelTigo iShare</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl gold-gradient text-primary-foreground font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">Analyzing Deals...</span>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-current" /> Recommend Deals
              </>
            )}
          </button>
        </div>
      </form>

      {deals && deals.length > 0 && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Recommended Packages</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {deals.map((d) => (
              <div key={d.id} className="relative rounded-2xl border border-border/80 bg-card p-5 space-y-3 hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                      {d.badge}
                    </span>
                    <span className="text-[11px] font-extrabold text-emerald-500">GH₵ {d.costPerGb}/GB</span>
                  </div>

                  <div className="text-lg font-black font-display text-foreground">{d.network} {d.sizeLabel}</div>
                  <div className="text-2xl font-black font-display text-primary mt-1">GH₵ {d.priceGhs.toFixed(2)}</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-2">{d.recommendationReason}</p>
                </div>

                <Link
                  to="/buy-data"
                  search={{ network: d.network.toUpperCase().includes("MTN") ? "MTN" : d.network.toUpperCase().includes("TELECEL") ? "Telecel" : "AirtelTigo" } as any}
                  className="w-full py-2.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-extrabold transition-all flex items-center justify-center gap-1.5"
                >
                  Buy This Deal <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
