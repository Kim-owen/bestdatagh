import React, { useState } from "react";
import { X, Printer, Copy, Check, ShieldCheck, Sparkles, Phone, Calendar, Hash, Tag } from "lucide-react";

export function AgentReceiptModal({
  order,
  isOpen,
  onClose,
  agentRate = 5,
}: {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  agentRate?: number;
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const item = (order.order_items && order.order_items[0]) || {};
  const recipient = item.recipient_phone || "Store Order";
  const network = item.network || "MTN";
  const size = item.size_label || "Data Bundle";
  const price = Number(order.total_ghs || 0).toFixed(2);
  const dateStr = new Date(order.created_at).toLocaleString("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const waText = `*BESTDATA OFFICIAL RECEIPT*\n` +
    `--------------------------------\n` +
    `🧾 *Ref:* ${order.reference}\n` +
    `📅 *Date:* ${dateStr}\n` +
    `📲 *Recipient:* ${recipient}\n` +
    `📡 *Network:* ${network.toUpperCase()}\n` +
    `📦 *Package:* ${size}\n` +
    `💰 *Amount Paid:* GH₵ ${price}\n` +
    `⚡ *Status:* ${String(order.status).toUpperCase()}\n` +
    `--------------------------------\n` +
    `Thank you for doing business with us! 🚀`;

  function copyText() {
    navigator.clipboard.writeText(waText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 text-slate-100 p-6 md:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-[10px] font-black uppercase text-emerald-400">
              <ShieldCheck className="h-3 w-3" /> Official Sales Receipt
            </div>
            <h3 className="text-xl font-black font-display tracking-tight text-white mt-1">BESTDATA GH</h3>
            <p className="text-xs text-slate-400">Transaction & Delivery Summary</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable Card Section */}
        <div id="printable-receipt" className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4 font-mono text-xs">
          <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-primary" /> Reference</span>
            <span className="font-bold text-primary select-all">{order.reference}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Date</span>
            <span className="text-slate-200">{dateStr}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-emerald-400" /> Recipient</span>
            <span className="font-bold text-white text-sm">{recipient}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-amber-400" /> Package</span>
            <span className="font-bold text-slate-200">{network.toUpperCase()} · {size}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400 pt-1">
            <span className="font-sans font-bold text-slate-300">Total Paid:</span>
            <span className="font-display font-black text-lg text-emerald-400">GH₵ {price}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={copyText}
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-extrabold text-slate-200 hover:bg-slate-700 hover:text-white active:scale-95 transition-all"
          >
            {copied ? <><Check className="h-4 w-4 text-emerald-400" /> Copied!</> : <><Copy className="h-4 w-4 text-primary" /> Copy WhatsApp</>}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-2xl gold-gradient px-4 py-3 text-xs font-extrabold text-slate-950 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Printer className="h-4 w-4" /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
