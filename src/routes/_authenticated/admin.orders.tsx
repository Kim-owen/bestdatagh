import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListOrders, adminUpdateOrderStatus, adminRetryOrder } from "@/lib/admin.functions";
import { useState } from "react";
import { ShoppingBag, RefreshCcw, Search, CheckCircle2, AlertTriangle, Clock, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/orders")({ component: OrdersPage });

const STATUSES = ["pending", "processing", "delivered", "failed", "refunded"] as const;

function OrdersPage() {
  const list = useServerFn(adminListOrders);
  const upd = useServerFn(adminUpdateOrderStatus);
  const retry = useServerFn(adminRetryOrder);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retriedMessage, setRetriedMessage] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["adminOrders"],
    queryFn: () => list(),
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; status: string }) => upd({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminOrders"] }),
  });

  const handleRetry = async (orderId: string) => {
    setRetryingId(orderId);
    try {
      const res = await retry({ data: { id: orderId } });
      setRetriedMessage(`Order ${res.reference} retried & delivered via SMS!`);
      qc.invalidateQueries({ queryKey: ["adminOrders"] });
      setTimeout(() => setRetriedMessage(null), 4000);
    } catch (e: any) {
      alert(`Retry failed: ${e.message || e}`);
    } finally {
      setRetryingId(null);
    }
  };

  const filteredOrders = (data ?? []).filter((o: any) => {
    const item = (o.order_items && o.order_items[0]) || {};
    const ref = (o.reference || "").toLowerCase();
    const phone = (item.recipient_phone || "").toLowerCase();
    const matchesSearch = ref.includes(search.toLowerCase()) || phone.includes(search.toLowerCase());
    const matchesStatus = selectedStatus === "all" || o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" /> Order Operations & Retry Engine
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage data bundle orders, retry failed/pending fulfillments, and update statuses.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="self-start sm:self-auto flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted active:scale-95 transition-all shadow-sm"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Refresh Orders
        </button>
      </div>

      {retriedMessage && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs font-bold text-emerald-500 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {retriedMessage}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border/60 w-full sm:w-auto">
          {["all", "pending", "delivered", "failed"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all ${
                selectedStatus === st
                  ? "gold-gradient text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ref or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-3xl border border-border/80 bg-card shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-black tracking-wider">
            <tr>
              <th className="p-3.5">Reference</th>
              <th className="p-3.5">Recipient & Bundle</th>
              <th className="p-3.5">Total</th>
              <th className="p-3.5">Source</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Created</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading && (
              <tr>
                <td className="p-8 text-center text-muted-foreground" colSpan={7}>
                  Loading orders data…
                </td>
              </tr>
            )}
            {!isLoading && filteredOrders.length === 0 && (
              <tr>
                <td className="p-8 text-center text-muted-foreground" colSpan={7}>
                  No orders match the current filter.
                </td>
              </tr>
            )}
            {filteredOrders.map((o: any) => {
              const item = (o.order_items && o.order_items[0]) || {};
              const isRetrying = retryingId === o.id;

              return (
                <tr key={o.id} className="hover:bg-muted/40 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-foreground">{o.reference}</td>
                  <td className="p-3.5">
                    <div className="font-extrabold text-foreground">{item.recipient_phone || "N/A"}</div>
                    <div className="text-[11px] text-muted-foreground">{item.size_label} · {item.network}</div>
                  </td>
                  <td className="p-3.5 font-black text-foreground font-display">GH₵ {Number(o.total_ghs).toFixed(2)}</td>
                  <td className="p-3.5">
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-muted-foreground">
                      {o.source || "web"}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <select
                      value={o.status}
                      disabled={updateMutation.isPending}
                      onChange={(e) => updateMutation.mutate({ id: o.id, status: e.target.value })}
                      className={`rounded-xl border border-border px-2.5 py-1 text-xs font-bold outline-none cursor-pointer ${
                        o.status === "delivered" || o.status === "paid"
                          ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                          : o.status === "failed"
                          ? "bg-destructive/15 text-destructive border-destructive/30"
                          : "bg-amber-500/15 text-amber-500 border-amber-500/30"
                      }`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3.5 text-[11px] text-muted-foreground font-medium">
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleRetry(o.id)}
                      disabled={isRetrying}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-xl gold-gradient text-primary-foreground shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Send className="h-3 w-3" />
                      {isRetrying ? "Retrying…" : "Retry Order"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
