import { useState, useEffect } from "react";
import { Truck, CheckSquare, Zap, Clock, RefreshCw } from "lucide-react";

export interface DeliveryTrackerOrder {
  id: string;
  reference: string;
  queueType?: "fast" | "standard";
  durationLabel?: string;
  placedAt: string;
  deliveredAt?: string;
  status: "completed" | "delivered" | "processing" | "pending" | "failed";
}

interface DeliveryProgressTrackerProps {
  orders: DeliveryTrackerOrder[];
  customBannerMsg?: string;
}

export function DeliveryProgressTracker({ orders, customBannerMsg }: DeliveryProgressTrackerProps) {
  const [lastChecked, setLastChecked] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    setLastChecked(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, [orders]);

  if (!orders || orders.length === 0) return null;

  const hasProcessing = orders.some((o) => o.status === "processing" || o.status === "pending");
  const bannerText = customBannerMsg || (hasProcessing ? "Moving well — expect it within minutes." : "All dispatches completed successfully.");

  return (
    <div className="w-full rounded-2xl border border-blue-200 bg-blue-50/50 dark:bg-slate-900/90 dark:border-blue-900/50 p-4 sm:p-5 space-y-3 font-sans shadow-sm text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-extrabold text-base sm:text-lg">
          <Truck className="h-5 w-5" />
          <span>Delivery Progress</span>
        </div>
      </div>

      {/* Banner Status Box */}
      <div className="rounded-xl border border-emerald-200 bg-white dark:bg-slate-950 dark:border-emerald-900/60 p-3 flex items-center gap-2.5 shadow-2xl">
        <div className="h-6 w-6 rounded-md bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <CheckSquare className="h-4 w-4" />
        </div>
        <span className="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
          {bannerText}
        </span>
      </div>

      {/* Order List */}
      <div className="rounded-xl border border-blue-100 bg-white/80 dark:bg-slate-950/80 dark:border-slate-800 divide-y divide-blue-50 dark:divide-slate-800 overflow-hidden shadow-2xl">
        {orders.map((ord) => {
          const isFast = ord.queueType === "fast" || (ord.reference && ord.reference.toLowerCase().includes("fast"));
          const refBadge = ord.reference.startsWith("#") ? ord.reference : `#${ord.reference.slice(-6)}`;
          const placedFormatted = new Date(ord.placedAt).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });

          const deliveredFormatted = ord.deliveredAt
            ? new Date(ord.deliveredAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "in progress…";

          return (
            <div key={ord.id || ord.reference} className="p-3.5 space-y-1 hover:bg-blue-50/30 dark:hover:bg-slate-900/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isFast ? (
                    <span className="flex items-center gap-1 font-black text-xs text-emerald-700 dark:text-emerald-400">
                      <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> Fast lane · {ord.durationLabel || "Instant"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-black text-xs text-blue-600 dark:text-blue-400">
                      <Clock className="h-3.5 w-3.5 text-blue-500" /> Standard queue · {ord.durationLabel || "15s"}
                    </span>
                  )}
                </div>

                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  {refBadge}
                </span>
              </div>

              <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
                placed {placedFormatted} → delivered {deliveredFormatted}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Last Checked */}
      <div className="text-[11px] font-bold text-blue-500/80 dark:text-blue-400/80 pt-1 flex items-center justify-between">
        <span>Last checked {lastChecked}</span>
        <RefreshCw className="h-3 w-3 animate-spin opacity-50" />
      </div>
    </div>
  );
}
