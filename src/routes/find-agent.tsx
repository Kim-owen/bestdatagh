import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import { listPublicAgentMentors, joinAgentNetwork } from "@/lib/agent.functions";
import {
  Users, Search, ShieldCheck, MapPin, ExternalLink, MessageSquare,
  Sparkles, Star, Store, ArrowRight, CheckCircle2, UserPlus, Zap, Award
} from "lucide-react";

export const Route = createFileRoute("/find-agent")({
  head: () => ({
    meta: [
      { title: "Find a Mentor & Join a Reseller Agent — Bestdata" },
      { name: "description", content: "Browse verified BestData reseller mentors across Ghana and join their agent network to start selling cheap data bundles." },
    ],
  }),
  component: FindAgentPage,
});

function FindAgentPage() {
  const { user } = useAuth();
  const fetchMentorsFn = useServerFn(listPublicAgentMentors);
  const joinNetworkFn = useServerFn(joinAgentNetwork);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("ALL");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedId, setJoinedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["publicAgentMentors"],
    queryFn: () => fetchMentorsFn(),
  });

  const mentors = data?.mentors || [];

  const handleJoin = async (mentorUserId: string) => {
    if (!user) {
      window.location.href = "/auth?tab=signup";
      return;
    }

    setJoiningId(mentorUserId);
    setErrorMsg("");
    try {
      await joinNetworkFn({ data: { mentorUserId } });
      setJoinedId(mentorUserId);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to join mentor network.");
    } finally {
      setJoiningId(null);
    }
  };

  const filteredMentors = mentors.filter((m: any) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      (m.store_name || "").toLowerCase().includes(q) ||
      (m.displayName || "").toLowerCase().includes(q) ||
      (m.city_region || "").toLowerCase().includes(q);

    const matchesRegion =
      selectedRegion === "ALL" || (m.city_region || "").toLowerCase().includes(selectedRegion.toLowerCase());

    return matchesSearch && matchesRegion;
  });

  return (
    <div className="min-h-screen bg-[#060612] text-foreground flex flex-col justify-between">
      <Header />

      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 md:py-16 w-full space-y-10">
        {/* Hero Section */}
        <div className="relative rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 via-slate-900/80 to-slate-950 p-8 md:p-12 text-center space-y-4 overflow-hidden shadow-2xl">
          <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-amber-500/20 blur-[100px]" />

          <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/20 px-4 py-1.5 text-xs font-black text-amber-400">
            <Award className="h-4 w-4" /> Verified Reseller Mentors Ghana
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white font-display tracking-tight max-w-3xl mx-auto leading-tight">
            Find a Data Reseller Mentor & Start Your Business
          </h1>

          <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto font-medium">
            Join an established BestData Master Agent to get wholesale bundle prices, mentorship, and customer support with zero registration fees.
          </p>

          {/* Search & Filter Controls */}
          <div className="max-w-2xl mx-auto pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative flex items-center rounded-2xl border border-white/10 bg-black/60 focus-within:border-amber-400 transition-all">
              <Search className="absolute left-4 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search agent name, store or region..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent py-3 pl-11 pr-4 text-xs font-bold text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-xs font-bold text-slate-200 outline-none focus:border-amber-400"
            >
              <option value="ALL">All Regions 🇬🇭</option>
              <option value="Accra">Greater Accra</option>
              <option value="Kumasi">Ashanti (Kumasi)</option>
              <option value="Takoradi">Western (Takoradi)</option>
              <option value="Tamale">Northern (Tamale)</option>
              <option value="Cape Coast">Central (Cape Coast)</option>
            </select>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-auto max-w-2xl rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-xs font-bold text-destructive text-center">
            {errorMsg}
          </div>
        )}

        {/* Directory Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" />
              <span>Available Reseller Mentors ({filteredMentors.length})</span>
            </h2>
            <Link
              to="/agent"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:underline"
            >
              List your store as an Agent →
            </Link>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-xs font-bold text-slate-400 animate-pulse">
              Loading Agent Directory...
            </div>
          ) : filteredMentors.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-12 text-center space-y-3">
              <Store className="mx-auto h-12 w-12 text-slate-500" />
              <h3 className="text-base font-bold text-white">No Agent Mentors Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No reseller agents match your search filter right now. Be the first agent to list your store in this region!
              </p>
              <Link
                to="/agent"
                className="inline-flex items-center gap-2 rounded-2xl gold-gradient px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg hover:scale-105 transition-all"
              >
                <span>Become a Master Agent</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMentors.map((mentor: any) => {
                const isJoined = joinedId === mentor.user_id;

                return (
                  <div
                    key={mentor.id || mentor.user_id}
                    className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 flex flex-col justify-between gap-6 hover:border-amber-400/40 transition-all duration-300 shadow-xl group"
                  >
                    <div className="space-y-4">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl gold-gradient flex items-center justify-center text-slate-950 font-black text-lg shadow-md group-hover:scale-105 transition-transform">
                            {(mentor.store_name || "A")[0].toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                              <span>{mentor.store_name}</span>
                              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                            </h3>
                            <p className="text-xs font-medium text-slate-400">By {mentor.displayName}</p>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                          <Star className="h-3 w-3 fill-emerald-400" /> Active
                        </span>
                      </div>

                      {/* Location & Sub-Agent Stats */}
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-amber-400" /> {mentor.city_region || "Accra, Ghana"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-emerald-400" /> {mentor.total_sub_agents || 0} Sub-Agents
                        </span>
                      </div>

                      {/* Bio / Notice */}
                      {mentor.notice_text && (
                        <p className="text-xs text-slate-300 bg-white/5 p-3 rounded-2xl line-clamp-2 border border-white/5">
                          "{mentor.notice_text}"
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`/store/${mentor.slug}`}
                          className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10 transition-all"
                        >
                          <Store className="h-3.5 w-3.5 text-amber-400" />
                          <span>View Store</span>
                        </a>

                        {mentor.whatsapp_phone ? (
                          <a
                            href={`https://wa.me/233${mentor.whatsapp_phone.replace(/[^\d]/g, "").slice(-9)}?text=${encodeURIComponent("Hello " + mentor.store_name + ", I found your agent profile on BestData and want to join your sub-agent network.")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        ) : (
                          <button
                            disabled
                            className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/5 bg-white/5 py-2.5 text-xs font-bold text-slate-500 opacity-50"
                          >
                            <span>No Contact</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handleJoin(mentor.user_id)}
                        disabled={joiningId === mentor.user_id || isJoined}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-extrabold transition-all shadow-md ${
                          isJoined
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "gold-gradient text-slate-950 hover:scale-[1.02]"
                        }`}
                      >
                        {isJoined ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Joined Mentor Network!</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 stroke-[2.5]" />
                            <span>{joiningId === mentor.user_id ? "Joining..." : "Join as Sub-Agent"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
