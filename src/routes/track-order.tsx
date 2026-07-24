import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { smartTrackOrders } from "@/lib/orders.functions";
import { NetworkLogo } from "@/components/site/NetworkLogos";
import {
  Search, CheckCircle2, Clock, XCircle, Share2, Printer, Download,
  Smartphone, ShieldCheck, Sparkles, FileText, ShoppingBag, Copy, Check
} from "lucide-react";

export const Route = createFileRoute("/track-order")({
  head: () => ({
    meta: [
      { title: "Smart Order Tracker & Receipts — Bestdata" },
      { name: "description", content: "Track your data orders by phone number or reference ID. Print or share official receipts on WhatsApp." },
      { property: "og:title", content: "Smart Order Tracker — Bestdata" },
      { property: "og:description", content: "Track data purchases instantly." },
      { property: "og:url", content: "/track-order" },
    ],
    links: [{ rel: "canonical", href: "/track-order" }],
  }),
  component: TrackOrder,
});

function TrackOrder() {
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const trackFn = useServerFn(smartTrackOrders);

  const mut = useMutation({
    mutationFn: async () => {
      const res = await trackFn({ data: { query } });
      return res.orders;
    },
    onSuccess: (data) => {
      setOrders(data);
    },
  });

  const handleCopyReceiptText = (ord: any) => {
    const itemStr = (ord.items || [])
      .map((it: any) => `• ${it.network} ${it.size_label} -> ${it.recipient_phone} (GH₵ ${Number(it.price_ghs || 0).toFixed(2)})`)
      .join("\n");

    const msg = `🧾 *BESTDATA GHANA - OFFICIAL RECEIPT*\n` +
      `-----------------------------------\n` +
      `*Order Ref:* ${ord.reference}\n` +
      `*Date:* ${new Date(ord.created_at).toLocaleString()}\n` +
      `*Status:* ${ord.status.toUpperCase()}\n\n` +
      `*Purchased Items:*\n${itemStr}\n\n` +
      `*Total Paid:* GH₵ ${Number(ord.total_ghs || 0).toFixed(2)}\n` +
      `-----------------------------------\n` +
      `Thank you for choosing BestData Ghana! (bestdatagh.com)`;

    try {
      navigator.clipboard.writeText(msg);
      setCopiedId(ord.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleShareWhatsapp = (ord: any) => {
    const itemStr = (ord.items || [])
      .map((it: any) => `• ${it.network} ${it.size_label} -> ${it.recipient_phone} (GH₵ ${Number(it.price_ghs || 0).toFixed(2)})`)
      .join("\n");

    const msg = `🧾 *BESTDATA GHANA - OFFICIAL RECEIPT*\n` +
      `-----------------------------------\n` +
      `*Order Ref:* ${ord.reference}\n` +
      `*Date:* ${new Date(ord.created_at).toLocaleString()}\n` +
      `*Status:* ${ord.status.toUpperCase()}\n\n` +
      `*Purchased Items:*\n${itemStr}\n\n` +
      `*Total Paid:* GH₵ ${Number(ord.total_ghs || 0).toFixed(2)}\n` +
      `-----------------------------------\n` +
      `Thank you for choosing BestData Ghana! (bestdatagh.com)`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handlePrintReceipt = (ord: any) => {
    const printWindow = window.open("", "_blank", "width=700,height=800");
    if (!printWindow) return;

    const itemsHtml = (ord.items || [])
      .map(
        (it: any) => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold;">${it.network} ${it.size_label}</td>
          <td style="padding: 10px 0; font-family: monospace;">${it.recipient_phone}</td>
          <td style="padding: 10px 0; text-align: right; font-weight: bold;">GH₵ ${Number(it.price_ghs || 0).toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${ord.reference} — BestData Ghana</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 25px; }
            .logo { font-size: 24px; font-weight: 900; color: #020617; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #e0e7ff; color: #3730a3; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin: 25px 0; }
            th { text-align: left; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; font-size: 12px; text-transform: uppercase; color: #64748b; }
            .total-box { background: #f8fafc; padding: 15px; border-radius: 12px; text-align: right; font-size: 18px; font-weight: 900; }
            .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">BESTDATA GHANA</div>
            <p style="margin: 4px 0; font-size: 12px; color: #64748b;">Official Data Bundle Transaction Receipt</p>
            <div className="badge">${ord.status}</div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <div>
              <strong>Order Reference:</strong> ${ord.reference}<br>
              <strong>Date:</strong> ${new Date(ord.created_at).toLocaleString()}
            </div>
            <div style="text-align: right;">
              <strong>Payment Status:</strong> ${ord.status.toUpperCase()}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item & Size</th>
                <th>Recipient Phone</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-box">
            Total Paid: GH₵ ${Number(ord.total_ghs || 0).toFixed(2)}
          </div>

          <div class="footer">
            BestData Ghana • Support: 0244 000 000 • bestdatagh.com<br>
            Printed on ${new Date().toLocaleString()}
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-[#060612] text-foreground flex flex-col justify-between">
      <Header />

      <main className="w-full py-12 md:py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/20 px-3.5 py-1 text-xs font-black text-amber-400">
              <Sparkles className="h-3.5 w-3.5" /> Instant Tracker & Digital Receipt Suite
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white font-display tracking-tight">
              Smart Order Tracker
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto">
              Track your data bundle orders by <strong>Phone Number</strong> (e.g. 0244 000 000) or <strong>Order Tracking Reference</strong> (e.g. BD-12345).
            </p>
          </div>

          {/* Search Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mut.mutate();
            }}
            className="rounded-3xl border border-white/10 bg-slate-900/90 p-4 md:p-6 shadow-2xl space-y-4 backdrop-blur-xl"
          >
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-300">
                Phone Number or Order Reference ID
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter phone number (0244 000 000) or Reference ID..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 pl-12 pr-4 py-3.5 text-sm font-bold text-white outline-none focus:border-amber-400 placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={mut.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-2xl gold-gradient py-4 text-xs font-black text-slate-950 shadow-[0_4px_20px_-2px_hsl(48_100%_50%_/_0.5)] hover:scale-[1.01] active:scale-95 disabled:opacity-50 transition-all"
            >
              <Search className="h-4 w-4" />
              <span>{mut.isPending ? "Searching Database..." : "Find Purchases & Track Orders"}</span>
            </button>

            {mut.error && (
              <p className="text-xs font-bold text-destructive text-center">
                {(mut.error as Error).message}
              </p>
            )}
          </form>

          {/* Order Cards List */}
          {orders.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                Found {orders.length} Order{orders.length > 1 ? "s" : ""}
              </h3>

              {orders.map((ord: any) => {
                const isDelivered = ord.status === "delivered" || ord.status === "completed";
                const isProcessing = ord.status === "processing" || ord.status === "paid";
                const isFailed = ord.status === "failed";

                return (
                  <div
                    key={ord.id}
                    className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 md:p-6 space-y-4 shadow-xl backdrop-blur-md"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Reference Code</span>
                        <h4 className="text-sm font-black text-white font-mono">{ord.reference}</h4>
                        <span className="text-[11px] text-slate-400">{new Date(ord.created_at).toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isDelivered && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Delivered
                          </span>
                        )}
                        {isProcessing && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 px-3 py-1 text-xs font-black text-amber-400">
                            <Clock className="h-3.5 w-3.5 animate-spin" /> Processing
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/20 px-3 py-1 text-xs font-black text-destructive">
                            <XCircle className="h-3.5 w-3.5" /> Failed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-2">
                      {(ord.items || []).map((it: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-slate-950/60 p-3 rounded-2xl border border-white/5">
                          <div className="flex items-center gap-2.5">
                            <NetworkLogo network={it.network} className="h-4 w-4" />
                            <div>
                              <span className="font-bold text-white">{it.network} {it.size_label}</span>
                              <span className="block text-[11px] font-mono text-slate-400">Recipient: {it.recipient_phone}</span>
                            </div>
                          </div>

                          <div className="text-right font-black text-white">
                            GH₵ {Number(it.price_ghs || 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total Amount</span>
                        <div className="text-lg font-black text-amber-400 font-display">
                          GH₵ {Number(ord.total_ghs || 0).toFixed(2)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleCopyReceiptText(ord)}
                          className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10 transition-all"
                        >
                          {copiedId === ord.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-black">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-slate-400" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleShareWhatsapp(ord)}
                          className="flex items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Share WhatsApp</span>
                        </button>

                        <button
                          onClick={() => handlePrintReceipt(ord)}
                          className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10 transition-all"
                        >
                          <Printer className="h-3.5 w-3.5 text-amber-400" />
                          <span>Print Receipt</span>
                        </button>
                      </div>
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
