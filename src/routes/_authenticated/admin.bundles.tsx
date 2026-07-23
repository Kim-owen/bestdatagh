import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListBundles,
  adminSaveBundle,
  adminDeleteBundle,
  adminGetProviderPackages,
  adminSyncProviderPackages,
} from "@/lib/admin.functions";
import { useState } from "react";
import { Plus, Trash2, RefreshCw, Zap, CheckCircle2, ShieldCheck, Database, Layers, ArrowUpRight, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/bundles")({ component: BundlesPage });

const empty = {
  network: "MTN",
  size_label: "",
  size_mb: 1024,
  price_ghs: 0,
  validity: "Non-Expiry",
  popular: false,
  active: true,
  sort_order: 100,
};

function BundlesPage() {
  const list = useServerFn(adminListBundles);
  const save = useServerFn(adminSaveBundle);
  const del = useServerFn(adminDeleteBundle);
  const getProvider = useServerFn(adminGetProviderPackages);
  const syncProvider = useServerFn(adminSyncProviderPackages);

  const qc = useQueryClient();

  const { data: storeBundles, isLoading: loadingStore } = useQuery({
    queryKey: ["adminBundles"],
    queryFn: () => list(),
  });

  const { data: providerInfo, isLoading: loadingProvider, refetch: refetchProvider } = useQuery({
    queryKey: ["adminProviderPackages"],
    queryFn: () => getProvider(),
  });

  const [editing, setEditing] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"store" | "provider">("store");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (v: any) => save({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminBundles"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminBundles"] }),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncProvider(),
    onSuccess: (res: any) => {
      setSyncStatusMsg(`Successfully synced ${res.syncedCount} packages from SwiftData API!`);
      qc.invalidateQueries({ queryKey: ["adminBundles"] });
      qc.invalidateQueries({ queryKey: ["adminProviderPackages"] });
      setTimeout(() => setSyncStatusMsg(null), 5000);
    },
    onError: (err: any) => {
      setSyncStatusMsg(`Sync error: ${err.message}`);
    },
  });

  const filteredStoreBundles = (storeBundles ?? []).filter((b: any) => {
    const q = searchQuery.toLowerCase();
    return b.network.toLowerCase().includes(q) || b.size_label.toLowerCase().includes(q);
  });

  const filteredProviderPackages = (providerInfo?.packages ?? []).filter((p: any) => {
    const q = searchQuery.toLowerCase();
    return (p.network || "").toLowerCase().includes(q) || (p.size_label || `${p.size_gb}GB`).toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">
            <Zap className="h-4 w-4" /> SwiftData API Provider Integration
          </div>
          <h1 className="text-3xl font-black text-white font-display">Data Bundle Packages</h1>
          <p className="text-xs text-slate-400 mt-1">
            Sync packages in real-time from the SwiftData Gateway or customize your retail bundle prices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="inline-flex items-center gap-2 rounded-2xl gold-gradient px-5 py-3 text-xs font-black text-primary-foreground shadow-xl hover:scale-[1.02] active:scale-[.98] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            <span>{syncMutation.isPending ? "Syncing Packages..." : "Sync SwiftData API Packages"}</span>
          </button>

          <button
            onClick={() => setEditing(empty)}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-bold text-white hover:bg-white/10 transition-all"
          >
            <Plus className="h-4 w-4" /> Custom Bundle
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatusMsg && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-mono text-emerald-400 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Provider API Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 space-y-2 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Provider Gateway Status</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white flex items-center gap-2 font-mono">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{providerInfo?.isHealthy ? "OPERATIONAL" : "CONNECTING..."}</span>
          </div>
          <div className="text-[11px] text-slate-400">SwiftData Supabase Gateway</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 space-y-2 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>API Wallet Balance</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 font-mono">
            GH₵ {(providerInfo?.balanceGhs ?? 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400">Main API Fulfillment Balance</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 space-y-2 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Available Provider Packages</span>
            <Layers className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {providerInfo?.packages?.length ?? 0} Active Packages
          </div>
          <div className="text-[11px] text-slate-400">MTN, Telecel, AirtelTigo iShare & Bigtime</div>
        </div>
      </div>

      {/* Editing Form Modal Card */}
      {editing && (
        <div className="rounded-3xl border border-amber-500/30 bg-slate-900/90 p-6 space-y-4 animate-in fade-in shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-lg font-black text-white font-display">
              {editing.id ? "Edit Bundle Package" : "Create New Bundle Package"}
            </h2>
            <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-white text-xs">✕ Close</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <label className="space-y-1.5">
              <span className="text-slate-400 font-bold">Network</span>
              <select
                value={editing.network}
                onChange={(e) => setEditing({ ...editing, network: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white font-medium focus:border-amber-400 outline-none"
              >
                <option value="MTN">MTN</option>
                <option value="Telecel">Telecel</option>
                <option value="AirtelTigo">AirtelTigo</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-slate-400 font-bold">Size Label (e.g. 1GB)</span>
              <input
                type="text"
                value={editing.size_label}
                onChange={(e) => setEditing({ ...editing, size_label: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white font-mono focus:border-amber-400 outline-none"
                placeholder="1GB"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-slate-400 font-bold">Size MB</span>
              <input
                type="number"
                value={editing.size_mb}
                onChange={(e) => setEditing({ ...editing, size_mb: +e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white font-mono focus:border-amber-400 outline-none"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-slate-400 font-bold">Retail Price (GH₵)</span>
              <input
                type="number"
                step="0.01"
                value={editing.price_ghs}
                onChange={(e) => setEditing({ ...editing, price_ghs: +e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-amber-400 font-mono font-bold focus:border-amber-400 outline-none"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-slate-400 font-bold">Validity</span>
              <input
                type="text"
                value={editing.validity}
                onChange={(e) => setEditing({ ...editing, validity: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 outline-none"
                placeholder="Non-Expiry"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-slate-400 font-bold">Sort Order</span>
              <input
                type="number"
                value={editing.sort_order}
                onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white font-mono focus:border-amber-400 outline-none"
              />
            </label>

            <label className="flex items-center gap-2 pt-6 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={editing.popular}
                onChange={(e) => setEditing({ ...editing, popular: e.target.checked })}
                className="h-4 w-4 rounded accent-amber-400"
              />
              <span className="font-bold">Tag as Popular</span>
            </label>

            <label className="flex items-center gap-2 pt-6 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                className="h-4 w-4 rounded accent-amber-400"
              />
              <span className="font-bold">Active in Store</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(editing)}
              className="rounded-xl gold-gradient px-6 py-2.5 text-xs font-black text-primary-foreground shadow-lg"
            >
              {saveMutation.isPending ? "Saving..." : "Save Bundle"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-xl border border-white/15 bg-white/5 px-6 py-2.5 text-xs font-bold text-white hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("store")}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "store"
                ? "bg-amber-400 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Active Store Bundles ({storeBundles?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("provider")}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "provider"
                ? "bg-amber-400 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Live SwiftData API ({providerInfo?.packages?.length ?? 0})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bundles..."
            className="w-full rounded-2xl border border-white/10 bg-slate-900/60 pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 outline-none"
          />
        </div>
      </div>

      {/* TAB 1: STORE BUNDLES */}
      {activeTab === "store" && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 overflow-hidden backdrop-blur-xl shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase border-b border-white/10">
                <tr>
                  <th className="p-4">Network</th>
                  <th className="p-4">Package Size</th>
                  <th className="p-4">Retail Price</th>
                  <th className="p-4">Validity</th>
                  <th className="p-4">Badges & Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {loadingStore && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Loading store bundles...</td>
                  </tr>
                )}
                {filteredStoreBundles.length === 0 && !loadingStore && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">No store bundles found. Click "Sync SwiftData API Packages" above to populate!</td>
                  </tr>
                )}
                {filteredStoreBundles.map((b: any) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-bold text-white font-sans flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${
                        b.network === "MTN" ? "bg-amber-400" : b.network === "Telecel" ? "bg-rose-500" : "bg-sky-400"
                      }`} />
                      <span>{b.network}</span>
                    </td>
                    <td className="p-4 font-extrabold text-amber-400">{b.size_label}</td>
                    <td className="p-4 text-white font-bold">GH₵ {Number(b.price_ghs).toFixed(2)}</td>
                    <td className="p-4 text-slate-300 font-sans">{b.validity}</td>
                    <td className="p-4 font-sans">
                      <div className="flex items-center gap-1.5">
                        {b.popular && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 border border-amber-400/30 text-amber-400">
                            ★ POPULAR
                          </span>
                        )}
                        {b.active ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 border border-rose-500/30 text-rose-400">
                            HIDDEN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditing(b)}
                          className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:text-white hover:bg-white/10 text-xs font-bold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => confirm("Delete this bundle package?") && deleteMutation.mutate(b.id)}
                          className="p-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE PROVIDER API PACKAGES */}
      {activeTab === "provider" && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 overflow-hidden backdrop-blur-xl shadow-xl">
          <div className="p-4 bg-slate-950/80 border-b border-white/10 flex items-center justify-between">
            <div className="text-xs text-amber-400 font-bold font-mono">
              GET https://ihrvvniomtoofrjkmalb.supabase.co/functions/v1/api/v1/packages
            </div>
            <button
              onClick={() => refetchProvider()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingProvider ? "animate-spin" : ""}`} /> Refresh Provider API
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/50 text-slate-400 font-mono uppercase border-b border-white/10">
                <tr>
                  <th className="p-4">Provider Package ID</th>
                  <th className="p-4">Provider Network</th>
                  <th className="p-4">Package Size</th>
                  <th className="p-4">Base Provider Price</th>
                  <th className="p-4">Validity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {loadingProvider && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">Fetching live packages from SwiftData API...</td>
                  </tr>
                )}
                {filteredProviderPackages.length === 0 && !loadingProvider && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">No provider packages found.</td>
                  </tr>
                )}
                {filteredProviderPackages.map((p: any, idx: number) => (
                  <tr key={p.id || idx} className="hover:bg-white/[0.02]">
                    <td className="p-4 text-slate-300 font-bold">{p.id || `pkg_${idx}`}</td>
                    <td className="p-4 font-bold text-white uppercase font-sans">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-200">
                        {p.network}
                      </span>
                    </td>
                    <td className="p-4 text-amber-400 font-extrabold">{p.size_label || `${p.size_gb}GB`}</td>
                    <td className="p-4 text-emerald-400 font-bold">GH₵ {Number(p.price_ghs || 0).toFixed(2)}</td>
                    <td className="p-4 text-slate-400 font-sans">{p.validity || "Non-Expiry"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

