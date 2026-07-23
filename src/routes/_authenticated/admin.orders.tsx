import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListOrders,
  adminUpdateOrderStatus,
  adminRetryOrder,
  adminCheckSwiftDataOrderStatus,
} from "@/lib/admin.functions";
import { useState } from "react";
import {
  ShoppingBag,
  RefreshCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Zap,
  Check,
  Copy,
  ExternalLink,
  Filter,
} from "lucide-react";

import { TableRowSkeleton, StatCardSkeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/orders")({ component: OrdersPage });

const STATUSES = ["pending", "paid", "processing", "delivered", "failed", "refunded"] as const;

function OrdersPage() {
  const list = useServerFn(adminListOrders);
  const upd = useServerFn(adminUpdateOrderStatus);
  const retry = useServerFn(adminRetryOrder);
  const checkSwiftData = useServerFn(adminCheckSwiftDataOrderStatus);

  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [checkingRef, setCheckingRef] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["adminOrders"],
    queryFn: () => list(),
    refetchInterval: 4000, // Automatically poll live gateway status every 4 seconds!
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; status: string }) => upd({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminOrders"] }),
  });

  const handleRetry = async (orderId: string) => {
    setRetryingId(orderId);
    setActionNotice(null);
    try {
      const res = await retry({ data: { id: orderId } });
      if (res.apiSuccess) {
        setActionNotice({
          type: "success",
          text: `✓ Order ${res.reference} re-submitted to SwiftData API & delivered! Status updated to Delivered.`,
        });
      } else {
        setActionNotice({
          type: "error",
          text: `⚠️ SwiftData API re-attempt queued (${res.apiErrorMsg || "in-progress"}). Status updated to Processing.`,
        });
      }
      qc.invalidateQueries({ queryKey: ["adminOrders"] });
    } catch (e: any) {
      setActionNotice({
        type: "error",
        text: `Retry failed: ${e.message || e}`,
      });
    } finally {
      setRetryingId(null);
    }
  };

  const handleCheckGateway = async (reference: string) => {
    setCheckingRef(reference);
    setActionNotice(null);
    try {
      const res = await checkSwiftData({ data: { reference } });
      if (res.ok) {
        setActionNotice({
          type: "success",
          text: `✓ Gateway Sync for ${reference}: Status verified as "${res.status.toUpperCase()}"`,
        });
        qc.invalidateQueries({ queryKey: ["adminOrders"] });
      } else {
        setActionNotice({
          type: "error",
          text: `Gateway notice: ${res.message}`,
        });
      }
    } catch (e: any) {
      setActionNotice({
        type: "error",
        text: `Gateway check error: ${e.message}`,
      });
    } finally {
      setCheckingRef(null);
    }
  };

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const ordersList = data ?? [];

  const totalOrders = ordersList.length;
  const deliveredCount = ordersList.filter((o: any) => o.status === "delivered").length;
  const processingCount = ordersList.filter((o: any) => o.status === "processing" || o.status === "paid").length;
  const failedCount = ordersList.filter((o: any) => o.status === "failed").length;
  const totalRevenue = ordersList
    .filter((o: any) => o.status === "delivered" || o.status === "paid")
    .reduce((sum: number, o: any) => sum + Number(o.total_ghs || 0), 0);

  const filteredOrders = ordersList.filter((o: any) => {
    const item = (o.order_items && o.order_items[0]) || {};
    const ref = (o.reference || "").toLowerCase();
    const phone = (item.recipient_phone || "").toLowerCase();
    const net = (item.network || "").toLowerCase();

    const matchesSearch = ref.includes(search.toLowerCase()) || phone.includes(search.toLowerCase());
    const matchesStatus = selectedStatus === "all" || o.status === selectedStatus;
    const matchesNetwork = selectedNetwork === "all" || net.includes(selectedNetwork.toLowerCase());

    return matchesSearch && matchesStatus && matchesNetwork;
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-widest">
              <Zap className="h-4 w-4" /> Live Provider Fulfillment & Retry Center
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Auto-Sync Active (Every 4s)
            </span>
          </div>
          <h1 className="text-3xl font-black text-white font-display">Customer Orders</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time gateway status verification automatically updates order statuses in the background.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-bold text-white hover:bg-white/10 transition-all self-start md:self-auto"
        >
          <RefreshCcw className={`h-4 w-4 text-amber-400 ${isFetching ? "animate-spin" : ""}`} />
          <span>{isFetching ? "Syncing..." : "Refresh Orders"}</span>
        </button>
      </div>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div
          className={`rounded-2xl p-4 text-xs font-mono flex items-center justify-between animate-in fade-in ${
            actionNotice.type === "success"
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border border-amber-500/30 bg-amber-500/10 text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Real-time Order Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 space-y-2 backdrop-blur-xl">
          <div className="text-xs text-slate-400">Total Revenue (Delivered)</div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            GH₵ {totalRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">{totalOrders} total orders</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 space-y-2 backdrop-blur-xl">
          <div className="text-xs text-slate-400">Delivered Orders</div>
          <div className="text-2xl font-black text-white font-mono flex items-center gap-2">
            <span>{deliveredCount}</span>
            <span className="text-xs text-emerald-400 font-sans font-bold">✓ Complete</span>
          </div>
          <div className="text-[11px] text-slate-400">Successfully credited to line</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 space-y-2 backdrop-blur-xl">
          <div className="text-xs text-slate-400">In-Flight / Processing</div>
          <div className="text-2xl font-black text-sky-400 font-mono flex items-center gap-2">
            <span>{processingCount}</span>
            <span className="text-xs text-sky-400 font-sans font-bold animate-pulse">⚡ Active</span>
          </div>
          <div className="text-[11px] text-slate-400">Waiting for gateway response</div>
        </div>

        <div
          onClick={() => setSelectedStatus("failed")}
          className="cursor-pointer rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 space-y-2 backdrop-blur-xl hover:bg-rose-500/20 transition-all"
        >
          <div className="text-xs text-rose-300 font-bold flex items-center justify-between">
            <span>Failed (Action Needed)</span>
            <AlertCircle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">{failedCount}</div>
          <div className="text-[11px] text-rose-300 font-bold">Click to filter failed orders</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 w-full md:w-auto">
          {["all", "failed", "processing", "delivered", "pending"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                selectedStatus === st
                  ? st === "failed"
                    ? "bg-rose-500 text-white shadow-lg"
                    : "bg-amber-400 text-slate-950 shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {st === "all" ? "All Orders" : st}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Network Filter */}
          <select
            value={selectedNetwork}
            onChange={(e) => setSelectedNetwork(e.target.value)}
            className="w-full sm:w-auto rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-xs text-white focus:border-amber-400 outline-none"
          >
            <option value="all">All Networks</option>
            <option value="mtn">MTN</option>
            <option value="telecel">Telecel</option>
            <option value="airtel">AirtelTigo</option>
          </select>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/60 pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase border-b border-white/10">
              <tr>
                <th className="p-4">Reference & Date</th>
                <th className="p-4">Recipient & Bundle</th>
                <th className="p-4">Amount & Payment</th>
                <th className="p-4">Live Status</th>
                <th className="p-4 text-right">Retry & Gateway Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {isLoading && (
                <>
                  <TableRowSkeleton columns={5} />
                  <TableRowSkeleton columns={5} />
                  <TableRowSkeleton columns={5} />
                  <TableRowSkeleton columns={5} />
                  <TableRowSkeleton columns={5} />
                </>
              )}
              {!isLoading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">No orders match the selected filters.</td>
                </tr>
              )}
              {filteredOrders.map((o: any) => {
                const item = (o.order_items && o.order_items[0]) || {};
                const isRetrying = retryingId === o.id;
                const isChecking = checkingRef === o.reference;

                return (
                  <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Reference & Date */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-sm">{o.reference}</span>
                        <button
                          type="button"
                          onClick={() => copyRef(o.reference)}
                          className="text-slate-400 hover:text-white p-1"
                        >
                          {copiedRef === o.reference ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                        {new Date(o.created_at).toLocaleString()}
                      </div>
                    </td>

                    {/* Recipient & Bundle */}
                    <td className="p-4 font-sans">
                      <div className="font-extrabold text-white text-sm">{item.recipient_phone || "N/A"}</div>
                      <div className="text-xs text-amber-400 font-bold mt-0.5">
                        {item.network || "Network"} · {item.size_label || "Bundle"}
                      </div>
                    </td>

                    {/* Amount & Payment Source */}
                    <td className="p-4">
                      <div className="font-black text-emerald-400 text-sm">
                        GH₵ {Number(o.total_ghs || 0).toFixed(2)}
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300 font-mono uppercase">
                        {o.source || "Paystack"}
                      </span>
                    </td>

                    {/* Live Status Selector */}
                    <td className="p-4">
                      <select
                        value={o.status}
                        disabled={updateMutation.isPending}
                        onChange={(e) => updateMutation.mutate({ id: o.id, status: e.target.value })}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold outline-none cursor-pointer uppercase transition-all ${
                          o.status === "delivered" || o.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : o.status === "failed"
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                            : "bg-sky-500/20 text-sky-400 border-sky-500/40 animate-pulse"
                        }`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-slate-950 text-white">
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Actions: Retry Fulfillment & Gateway Check */}
                    <td className="p-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleCheckGateway(o.reference)}
                          disabled={isChecking}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          <RefreshCcw className={`h-3 w-3 ${isChecking ? "animate-spin" : ""}`} />
                          <span>{isChecking ? "Checking..." : "Verify Gateway"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRetry(o.id)}
                          disabled={isRetrying}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl gold-gradient text-primary-foreground text-xs font-black shadow-lg hover:scale-[1.02] active:scale-[.98] transition-all disabled:opacity-50"
                        >
                          <Send className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                          <span>{isRetrying ? "Retrying..." : "Retry Order"}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

