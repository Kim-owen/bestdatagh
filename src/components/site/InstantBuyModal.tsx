import { useEffect, useState } from "react";
import { Check, Loader2, X, Lock, ShieldCheck } from "lucide-react";
import type { Network } from "@/lib/cart";
import { createCheckoutOrder, verifyOrderPayment } from "@/lib/orders.functions";
import { openPaystackInlineCheckout } from "@/lib/paystack-inline";

export type InstantBuyItem = { network: Network; size: string; price: number } | null;

export function InstantBuyModal({ item, onClose }: { item: InstantBuyItem; onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [orderId, setOrderId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!item) {
      setPhone("");
      setStatus("idle");
      setOrderId("");
      setErrorMsg("");
    }
  }, [item]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!item) return null;

  const validPhone = /^\d{9,10}$/.test(phone.replace(/\s+/g, ""));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPhone) return;
    setStatus("processing");
    setErrorMsg("");

    try {
      // 1. Create order and get Paystack authorization details
      const orderRes = await createCheckoutOrder({
        data: {
          items: [
            {
              id: `${item.network.toLowerCase()}-${item.size.toLowerCase()}`,
              network: item.network,
              size: item.size,
              price: item.price,
              qty: 1,
            },
          ],
          recipientPhone: phone,
        },
      });

      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_live_74ed2ba7f110bcec6ca98f9d270ff1bd025b24c3";

      // 2. Open Paystack Inline Pop-up directly on page
      await openPaystackInlineCheckout({
        key: publicKey,
        email: `customer-${phone.replace(/\s+/g, "")}@bestdatagh.com`,
        amountGhs: item.price,
        reference: orderRes.reference,
        metadata: {
          order_id: orderRes.orderId,
          recipient_phone: phone,
        },
        onSuccess: async (ref) => {
          try {
            const verifyRes = await verifyOrderPayment({ data: { reference: ref } });
            if (verifyRes.verified) {
              setOrderId(orderRes.reference);
              setStatus("done");
            } else {
              throw new Error("Payment verification failed.");
            }
          } catch (err: any) {
            setErrorMsg(err.message || "Payment verification failed.");
            setStatus("error");
          }
        },
        onClose: () => {
          setStatus("idle");
        },
      });
    } catch (err: any) {
      console.error("Paystack instant checkout error:", err);
      setErrorMsg(err.message || "Failed to initialize Paystack payment.");
      setStatus("error");
    }
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
            <div className="eyebrow mb-1 flex items-center gap-1">
              <Lock className="h-3 w-3 text-primary" /> Paystack Instant Checkout
            </div>
            <h3 className="text-lg font-bold">{item.size} · {item.network}</h3>
            <p className="text-xs text-muted-foreground">Delivered within 2 minutes to your phone.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === "done" ? (
          <div className="mt-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <Check className="h-7 w-7 text-emerald-500" />
            </div>
            <h4 className="mt-4 text-base font-bold">Payment Complete & Order Confirmed</h4>
            <p className="mt-1 text-sm text-muted-foreground">Reference <span className="font-mono font-semibold text-foreground">{orderId}</span></p>
            <p className="mt-1 text-xs text-muted-foreground">Your {item.size} {item.network} bundle has been processed for +233 {phone}.</p>
            <button onClick={onClose} className="mt-5 w-full rounded-xl gold-gradient px-4 py-2.5 text-sm font-bold text-primary-foreground">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            {errorMsg && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-bold">
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="ib-phone" className="text-xs font-semibold text-foreground/80">Recipient phone number</label>
              <div className="mt-1.5 flex items-center rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/40">
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
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-lg font-extrabold font-display">GHS {item.price.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Secured by Paystack — MTN MoMo, Telecel Cash, AT Money, Visa & Mastercard.
              </div>
            </div>

            <button
              type="submit"
              disabled={!validPhone || status === "processing"}
              className="flex w-full items-center justify-center gap-2 rounded-xl gold-gradient px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {status === "processing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Launching Paystack Payment…
                </>
              ) : (
                <>Pay GHS {item.price.toFixed(2)} with Paystack</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
