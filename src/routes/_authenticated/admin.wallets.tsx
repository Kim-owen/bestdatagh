import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListWallets, adminAdjustUserWallet, adminReconcileAllPaystackDeposits } from "@/lib/admin.functions";
import { Wallet, Plus, Minus, Search, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, UserCheck } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/wallets")({
  component: AdminWalletsPage,
});

function AdminWalletsPage() {
  const queryClient = useQueryClient();
  const getWallets = useServerFn(adminListWallets);
  const adjustWallet = useServerFn(adminAdjustUserWallet);
  const reconcileAllFn = useServerFn(adminReconcileAllPaystackDeposits);

  const { data: walletState, isLoading, refetch } = useQuery({
    queryKey: ["adminWallets"],
    queryFn: () => getWallets(),
  });

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const handleReconcileAll = async () => {
    setReconciling(true);
    try {
      await reconcileAllFn();
      await queryClient.invalidateQueries({ queryKey: ["adminWallets"] });
      await refetch();
    } catch (e) {
      console.warn("Reconcile error:", e);
    } finally {
      setReconciling(false);
    }
  };

  const mut = useMutation({
    mutationFn: () =>
      adjustWallet({
        data: {
          userId: selectedUser.user_id,
          amountGhs: Number(adjustAmount),
          type: adjustType,
          reason: adjustReason,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWallets"] });
      setSelectedUser(null);
      setAdjustAmount("");
      setAdjustReason("");
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  const wallets = walletState?.wallets || [];
  const transactions = walletState?.transactions || [];
  const totalBalance = walletState?.totalBalance || 0;

  const filteredWallets = wallets.filter(
    (w: any) =>
      w.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      w.phone?.includes(search) ||
      w.user_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> User & Agent Wallets Management
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Monitor system-wide wallet balances, inspect deposits, and issue manual credits/debits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" /> Wallet Updated!
            </div>
          )}

          <button
            onClick={handleReconcileAll}
            disabled={reconciling}
            className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reconciling ? "animate-spin" : ""}`} />
            <span>{reconciling ? "Reconciling..." : "Reconcile All Paystack Deposits"}</span>
          </button>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-xs font-bold hover:bg-muted transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Total System Liabilities</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black text-foreground font-display">
            GH₵ {totalBalance.toFixed(2)}
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">Customer & Agent deposited funds</div>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Active Wallet Accounts</span>
            <UserCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-display">
            {wallets.length}
          </div>
          <div className="text-[11px] text-emerald-400/80 font-medium">Registered funded wallets</div>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Recent Transactions</span>
            <ArrowUpRight className="h-4 w-4 text-[hsl(48_100%_60%)]" />
          </div>
          <div className="text-3xl font-black text-[hsl(48_100%_60%)] font-display">
            {transactions.length}
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">Deposits & wallet purchases</div>
        </div>
      </div>

      {/* User Wallets Table */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-primary">User Wallet Balances</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search user name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background pl-9 pr-4 py-2 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-4 py-3">User Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Wallet Balance</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-medium">
              {isLoading ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading wallet accounts…</td></tr>
              ) : filteredWallets.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No matching wallet accounts found.</td></tr>
              ) : (
                filteredWallets.map((w: any) => (
                  <tr key={w.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-foreground">{w.displayName}</td>
                    <td className="px-4 py-3.5 font-mono">{w.phone}</td>
                    <td className="px-4 py-3.5 font-black text-emerald-400 text-sm">GH₵ {Number(w.balance_ghs).toFixed(2)}</td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground text-[11px]">{new Date(w.updated_at).toLocaleString()}</td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setSelectedUser(w)}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary/10 border border-primary/30 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/20 transition-all"
                      >
                        <Plus className="h-3 w-3" /> Adjust Balance
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Wallet Adjustment Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 md:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-primary">
                Adjust Wallet: {selectedUser.displayName}
              </h3>
              <button onClick={() => setSelectedUser(null)} className="text-xs font-bold text-muted-foreground hover:text-foreground">Close</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType("credit")}
                  className={`flex-1 py-2.5 rounded-xl border font-bold flex items-center justify-center gap-1 ${
                    adjustType === "credit" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  <Plus className="h-4 w-4" /> Credit (+ Add)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("debit")}
                  className={`flex-1 py-2.5 rounded-xl border font-bold flex items-center justify-center gap-1 ${
                    adjustType === "debit" ? "bg-destructive/15 text-destructive border-destructive/40" : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  <Minus className="h-4 w-4" /> Debit (- Deduct)
                </button>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Adjustment Amount (GH₵)</label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Offline MoMo deposit / Order refund #1042"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {mut.error && (
                <div className="text-xs font-bold text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> {(mut.error as Error).message}
                </div>
              )}

              <button
                onClick={() => mut.mutate()}
                disabled={mut.isPending || !adjustAmount || !adjustReason}
                className="w-full rounded-2xl gold-gradient py-3 text-xs font-black text-primary-foreground shadow-md disabled:opacity-50 hover:scale-[1.01] active:scale-95 transition-all"
              >
                {mut.isPending ? "Executing Adjustment…" : `Execute ${adjustType.toUpperCase()} of GH₵ ${Number(adjustAmount || 0).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
