import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import { getMyWallet, verifyWalletDeposit } from "@/lib/wallet.functions";
import { WalletTopUpModal } from "@/components/site/WalletModal";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Search,
  Plus,
  ArrowLeft,
  Filter,
  Sparkles,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/account/transactions")({
  head: () => ({
    meta: [
      { title: "Wallet & Transaction History — Bestdata" },
      { name: "description", content: "View complete wallet deposit history, purchases, and statement records." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountTransactionsPage,
});

function AccountTransactionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchWallet = useServerFn(getMyWallet);
  const verifyDepositFn = useServerFn(verifyWalletDeposit);

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "DEPOSIT" | "PURCHASE">("ALL");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);

  const { data: walletData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["myWallet"],
    queryFn: () => fetchWallet(),
    enabled: !!user,
  });

  const walletBalance = walletData?.balanceGhs || 0;
  const transactions = walletData?.transactions || [];

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleManualVerify = async (ref: string) => {
    setVerifyingRef(ref);
    try {
      await verifyDepositFn({ data: { reference: ref } });
      await qc.invalidateQueries({ queryKey: ["myWallet"] });
      await refetch();
    } catch (err) {
      console.warn("Manual verification notice:", err);
    } finally {
      setVerifyingRef(null);
    }
  };

  // Filter transactions
  const filteredTxs = transactions.filter((tx: any) => {
    const typeMatch =
      filterType === "ALL"
        ? true
        : filterType === "DEPOSIT"
        ? tx.type === "deposit" || Number(tx.amount_ghs) > 0
        : tx.type === "purchase" || Number(tx.amount_ghs) < 0;

    const query = searchTerm.toLowerCase();
    const searchMatch =
      !query ||
      (tx.reference || "").toLowerCase().includes(query) ||
      (tx.description || "").toLowerCase().includes(query) ||
      (tx.status || "").toLowerCase().includes(query);

    return typeMatch && searchMatch;
  });

  const totalDeposits = transactions
    .filter((t: any) => (t.status === "completed" || t.status === "paid") && Number(t.amount_ghs) > 0)
    .reduce((acc: number, t: any) => acc + Number(t.amount_ghs), 0);

  const totalSpent = transactions
    .filter((t: any) => (t.status === "completed" || t.status === "paid") && Number(t.amount_ghs) < 0)
    .reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount_ghs)), 0);

  const handleExportCsv = () => {
    if (transactions.length === 0) return;
    const headers = ["Date", "Reference", "Type", "Amount (GHS)", "Status", "Description"];
    const rows = transactions.map((t: any) => [
      `"${new Date(t.created_at || Date.now()).toLocaleString()}"`,
      `"${t.reference || ""}"`,
      `"${t.type || ""}"`,
      Number(t.amount_ghs || 0).toFixed(2),
      `"${t.status || ""}"`,
      `"${(t.description || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Bestdata_Statement_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#060612] text-foreground flex flex-col justify-between">
      <Header />

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-8 md:py-12 w-full space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              to="/account"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-amber-400 transition-colors mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Profile
            </Link>
            <h1 className="text-2xl md:text-3xl font-black text-white font-display tracking-tight flex items-center gap-3">
              <Wallet className="h-7 w-7 text-emerald-400" />
              <span>Wallet & Transaction History</span>
            </h1>
            <p className="text-xs text-slate-400">
              Live statement records, deposit receipts, and real-time wallet sync.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-all"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Export Statement</span>
            </button>

            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin text-amber-400" : ""}`} />
              <span>{isRefetching ? "Syncing..." : "Sync Balance"}</span>
            </button>

            <button
              onClick={() => setWalletModalOpen(true)}
              className="flex items-center gap-2 rounded-2xl gold-gradient px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg hover:scale-105 transition-all"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Top Up Deposit</span>
            </button>
          </div>
        </div>

        {/* Stats Grid Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Wallet Balance Card */}
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 via-slate-900/90 to-slate-950/90 p-6 backdrop-blur-xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Current Balance
              </span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white font-display">
              GH₵ {walletBalance.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-400">Available for instant 1-click bundle purchases</p>
          </div>

          {/* 2. Total Deposited */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 space-y-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <ArrowDownLeft className="h-4 w-4 text-emerald-400" /> Total Verified Deposits
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-display">
              + GH₵ {totalDeposits.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-400">Lifetime wallet top-ups completed</p>
          </div>

          {/* 3. Total Spent */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 space-y-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <ArrowUpRight className="h-4 w-4 text-amber-400" /> Total Purchases Spent
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-display">
              - GH₵ {totalSpent.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-400">Lifetime data orders paid via wallet</p>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-white/10 w-fit">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filterType === "ALL"
                    ? "gold-gradient text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All History ({transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("DEPOSIT")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filterType === "DEPOSIT"
                    ? "bg-emerald-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Deposits Only
              </button>
              <button
                type="button"
                onClick={() => setFilterType("PURCHASE")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filterType === "PURCHASE"
                    ? "bg-amber-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Purchases Only
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400/50 transition-all"
              />
            </div>
          </div>

          {/* Transactions List */}
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-400 mx-auto" />
              <p className="text-xs text-slate-400 font-mono">Loading transaction statement records...</p>
            </div>
          ) : filteredTxs.length === 0 ? (
            <div className="py-16 text-center space-y-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-8">
              <Wallet className="h-10 w-10 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white font-display">No Transactions Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchTerm
                    ? `No statement records matching "${searchTerm}".`
                    : "You have not performed any wallet deposits or purchases yet."}
                </p>
              </div>
              <button
                onClick={() => setWalletModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl gold-gradient px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg hover:scale-105 transition-all"
              >
                <Plus className="h-4 w-4 stroke-[3]" /> Top Up First Deposit
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTxs.map((tx: any) => {
                const isDep = tx.type === "deposit" || Number(tx.amount_ghs) > 0;
                const isCompleted = tx.status === "completed" || tx.status === "paid" || tx.status === "delivered";
                const isPending = tx.status === "pending";

                return (
                  <div
                    key={tx.id || tx.reference}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 hover:border-white/20 transition-all shadow-md"
                  >
                    {/* Left Icon & Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                          isDep
                            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                            : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                        }`}
                      >
                        {isDep ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm truncate">
                            {tx.description || (isDep ? "Wallet Top Up" : "Data Bundle Purchase")}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isCompleted
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : isPending
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {tx.status || "completed"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {new Date(tx.created_at || Date.now()).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopyRef(tx.reference)}
                            className="inline-flex items-center gap-1 hover:text-white transition-colors"
                          >
                            <span>{tx.reference}</span>
                            {copiedRef === tx.reference ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3 text-slate-500" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Amount & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
                      {isPending && isDep && (
                        <button
                          type="button"
                          onClick={() => handleManualVerify(tx.reference)}
                          disabled={verifyingRef === tx.reference}
                          className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/25 transition-all disabled:opacity-50"
                        >
                          {verifyingRef === tx.reference ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span>{verifyingRef === tx.reference ? "Verifying..." : "Verify Status"}</span>
                        </button>
                      )}

                      <div className="text-right font-mono">
                        <span
                          className={`text-base font-black ${
                            isDep ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {isDep ? "+" : "-"} GH₵ {Math.abs(Number(tx.amount_ghs || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <WalletTopUpModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        userEmail={user?.email}
      />

      <Footer />
    </div>
  );
}
