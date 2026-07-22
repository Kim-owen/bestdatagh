import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import type { Network } from "@/lib/cart";

export type InstantBuyItem = { network: Network; size: string; price: number } | null;

export function InstantBuyModal({ item, onClose }: { item: InstantBuyItem; onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    if (!item) {
      setPhone("");
      setStatus("idle");
      setOrderId("");
    }
  }, [item]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!item) return null;

  const validPhone = /^\d{9,10}$/.test(phone.replace(/\s+/g, ""));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPhone) return;
    setStatus("processing");
    window.setTimeout(() => {
      setOrderId("BD" + Math.random().toString(36).slice(2, 8).toUpperCase());
      setStatus("done");
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Buy now"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow mb-1">Instant checkout</div>
            <h3 className="text-lg font-bold">{item.size} · {item.network}</h3>
            <p className="text-xs text-muted-foreground">Delivered within minutes to your phone.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === "done" ? (
          <div className="mt-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15">
              <Check className="h-7 w-7 text-primary" />
            </div>
            <h4 className="mt-4 text-base font-bold">Order confirmed</h4>
            <p className="mt-1 text-sm text-muted-foreground">Reference <span className="font-mono font-semibold text-foreground">{orderId}</span></p>
            <p className="mt-1 text-xs text-muted-foreground">Your {item.size} {item.network} bundle is on its way to +233 {phone}.</p>
            <button onClick={onClose} className="mt-5 w-full rounded-lg gold-gradient px-4 py-2.5 text-sm font-bold text-primary-foreground">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="ib-phone" className="text-xs font-semibold text-foreground/80">Recipient phone number</label>
              <div className="mt-1.5 flex items-center rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-primary/40">
                <span className="pl-3 pr-2 text-sm font-semibold text-muted-foreground">🇬🇭 +233</span>
                <input
                  id="ib-phone"
                  inputMode="numeric"
                  autoFocus
                  placeholder="24 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                  className="flex-1 bg-transparent py-2.5 pr-3 text-sm font-medium outline-none"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="text-lg font-extrabold">GHS {item.price.toFixed(2)}</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Paid via Paystack — MoMo, Visa or Mastercard.</div>
            </div>

            <button
              type="submit"
              disabled={!validPhone || status === "processing"}
              className="flex w-full items-center justify-center gap-2 rounded-lg gold-gradient px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {status === "processing" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
              ) : (
                <>Pay GHS {item.price.toFixed(2)}</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
