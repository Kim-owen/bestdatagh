import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { getPublicStorefrontBySlug, joinAgentNetwork } from "@/lib/agent.functions";
import { InstantBuyModal, type InstantBuyItem } from "@/components/site/InstantBuyModal";
import { NetworkLogo } from "@/components/site/NetworkLogos";
import {
  Store, ShieldCheck, MapPin, Users, MessageSquare, Video, ExternalLink,
  ShoppingBag, Zap, Star, UserPlus, CheckCircle2, Share2, Sparkles, Award
} from "lucide-react";

export const Route = createFileRoute("/store/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.toUpperCase()} Data Storefront & Mentor Profile — Bestdata` },
      { name: "description", content: `Buy cheap data bundles from ${params.slug} on BestData. Wholesale reseller prices & sub-agent mentorship.` },
    ],
  }),
  component: AgentSocialStorefrontPage,
});

function AgentSocialStorefrontPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const fetchStoreFn = useServerFn(getPublicStorefrontBySlug);
  const joinNetworkFn = useServerFn(joinAgentNetwork);

  const [selectedNetwork, setSelectedNetwork] = useState<string>("MTN");
  const [buyNowItem, setBuyNowItem] = useState<InstantBuyItem | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["publicStorefront", slug],
    queryFn: () => fetchStoreFn({ data: { slug } }),
  });

  const store = data?.store;
  const bundles = data?.bundles || [];

  const networks = Array.from(new Set(bundles.map((b: any) => b.network))) as string[];
  const filteredBundles = bundles.filter((b: any) => b.network === selectedNetwork);

  const handleJoinNetwork = async () => {
    if (!user) {
      window.location.href = `/auth?tab=signup&next=/store/${slug}`;
      return;
    }
    if (!store?.user_id) return;

    setJoining(true);
    setErrorMsg("");
    try {
      await joinNetworkFn({ data: { mentorUserId: store.user_id } });
      setJoined(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to join mentor network.");
    } finally {
      setJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060612] text-foreground flex flex-col justify-between">
        <Header />
        <main className="py-20 text-center text-xs font-bold text-slate-400 animate-pulse">
          Loading Agent Storefront & Social Profile...
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-[#060612] text-foreground flex flex-col justify-between">
        <Header />
        <main className="mx-auto max-w-[800px] px-4 py-20 text-center space-y-4">
          <Store className="mx-auto h-16 w-16 text-slate-600" />
          <h1 className="text-2xl font-black text-white">Storefront Not Found</h1>
          <p className="text-xs text-slate-400">The agent store link "<strong>{slug}</strong>" does not exist or is inactive.</p>
          <Link to="/find-agent" className="inline-flex items-center gap-2 rounded-2xl gold-gradient px-6 py-3 text-xs font-black text-slate-950">
            Browse Verified Agent Mentors
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const whatsappClean = store.whatsapp_phone ? store.whatsapp_phone.replace(/[^\d]/g, "").slice(-9) : null;

  return (
    <div className="min-h-screen bg-[#060612] text-foreground flex flex-col justify-between">
      <Header />

      <main className="w-full pb-16">
        {/* Cover & Hero Social Header */}
        <div className="relative border-b border-white/10 bg-gradient-to-b from-amber-500/20 via-slate-900 to-[#060612] pt-12 pb-16 px-4 sm:px-6 overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-amber-500/15 blur-[120px]" />

          <div className="mx-auto max-w-[1100px] space-y-6 relative">
            {/* Store Avatar & Badges */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl gold-gradient flex items-center justify-center text-slate-950 font-black text-4xl shadow-2xl shrink-0 ring-4 ring-amber-400/20">
                {(store.store_name || "A")[0].toUpperCase()}
              </div>

              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 border border-amber-400/20 px-3 py-1 text-[11px] font-black text-amber-400">
                    <Award className="h-3.5 w-3.5" /> Verified Master Mentor
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-400">
                    <Star className="h-3.5 w-3.5 fill-emerald-400" /> Active Store
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight flex items-center justify-center sm:justify-start gap-2">
                  <span>{store.store_name}</span>
                  <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
                </h1>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-amber-400" /> {store.city_region || "Accra, Ghana"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-emerald-400" /> {store.total_sub_agents || 0} Sub-Agents Network
                  </span>
                </div>
              </div>
            </div>

            {/* Notice / Bio */}
            {store.notice_text && (
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 backdrop-blur-md">
                <p className="text-xs text-slate-200 font-medium italic">
                  "{store.notice_text}"
                </p>
              </div>
            )}

            {/* Social Action Bar (Linktree Style) */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {whatsappClean && (
                <a
                  href={`https://wa.me/233${whatsappClean}?text=${encodeURIComponent("Hello " + store.store_name + ", I found your store on BestData and want to buy data or join your sub-agent network.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-xs font-extrabold text-emerald-400 hover:bg-emerald-500/20 transition-all shadow-md"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat on WhatsApp</span>
                </a>
              )}

              <button
                onClick={handleJoinNetwork}
                disabled={joining || joined}
                className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black transition-all shadow-md ${
                  joined
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "gold-gradient text-slate-950 hover:scale-105"
                }`}
              >
                {joined ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Joined Mentor Network!</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 stroke-[2.5]" />
                    <span>{joining ? "Joining..." : "Join Sub-Agent Network"}</span>
                  </>
                )}
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs font-bold text-destructive">{errorMsg}</p>
            )}
          </div>
        </div>

        {/* Live Bundle Pricing & Store Content */}
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 py-10 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Reseller Retail Rates</span>
              <h2 className="text-xl font-black text-white font-display">Available Data Bundles</h2>
            </div>

            {/* Network Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {networks.map((net) => (
                <button
                  key={net}
                  onClick={() => setSelectedNetwork(net)}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all border ${
                    selectedNetwork === net
                      ? "border-amber-400 bg-amber-400/10 text-amber-400"
                      : "border-white/10 bg-slate-900 text-slate-300 hover:border-white/20"
                  }`}
                >
                  <NetworkLogo network={net as any} className="h-4 w-4" />
                  <span>{net}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bundle Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBundles.map((b: any) => {
              const displayPrice = Number(b.display_price_ghs || b.price_ghs);

              return (
                <div
                  key={b.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 flex flex-col justify-between gap-4 hover:border-amber-400/40 transition-all duration-300 shadow-xl"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <NetworkLogo network={b.network} className="h-5 w-5" />
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{b.network}</span>
                    </div>

                    <h3 className="text-lg font-black text-white">{b.name}</h3>
                    <p className="text-2xl font-black text-amber-400 font-display">GH₵ {displayPrice.toFixed(2)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() =>
                        addItem({
                          id: b.id,
                          network: b.network,
                          size: b.name,
                          price: displayPrice,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10 transition-all"
                    >
                      <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
                      <span>Add Cart</span>
                    </button>

                    <button
                      onClick={() =>
                        setBuyNowItem({
                          network: b.network,
                          size: b.name,
                          price: displayPrice,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 rounded-2xl gold-gradient py-2.5 text-xs font-black text-slate-950 shadow-md hover:scale-105 transition-all"
                    >
                      <Zap className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Buy Now</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {buyNowItem && (
        <InstantBuyModal
          onClose={() => setBuyNowItem(null)}
          item={buyNowItem}
        />
      )}

      <Footer />
    </div>
  );
}
