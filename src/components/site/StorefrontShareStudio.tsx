import { useState } from "react";
import { QrCode, Share2, Copy, Check, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export function StorefrontShareStudio({ storeSlug, storeName }: { storeSlug: string; storeName: string }) {
  const [copied, setCopied] = useState(false);
  const storeUrl = typeof window !== "undefined" ? `${window.location.origin}/store/${storeSlug}` : `https://ghana-data-hub-gold.vercel.app/store/${storeSlug}`;

  function copyLink() {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    toast.success("Storefront link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(`Hi! Buy cheap data bundles on my official ${storeName} storefront: ${storeUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <div className="rounded-3xl border border-primary/20 bg-card p-6 md:p-8 space-y-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-black font-display text-foreground">Storefront Share & QR Studio</h3>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          Live Storefront
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* QR Code Visual */}
        <div className="flex flex-col items-center justify-center p-6 bg-muted/40 rounded-2xl border border-border/60 text-center space-y-3">
          <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-200">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(storeUrl)}`}
              alt={`QR Code for ${storeName}`}
              className="h-36 w-36 object-contain"
            />
          </div>
          <div className="text-xs font-bold text-foreground">Scan QR Code to Shop</div>
          <div className="text-[10px] text-muted-foreground">Customers can scan this code to buy data directly from your store.</div>
        </div>

        {/* Share Actions */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Your Store Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={storeUrl}
                className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none"
              />
              <button
                onClick={copyLink}
                className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs shrink-0 hover:brightness-110 flex items-center gap-1.5 transition-all"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={shareWhatsApp}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <MessageCircle className="h-4 w-4 fill-current" /> Share Storefront on WhatsApp
            </button>

            <a
              href={storeUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full h-10 rounded-xl border border-border bg-muted/30 hover:bg-muted text-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Preview Storefront
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
