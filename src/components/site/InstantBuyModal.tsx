import { useEffect, useState } from "react";
import { Check, Loader2, X, Lock, ShieldCheck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { Network } from "@/lib/cart";
import { createCheckoutOrder } from "@/lib/orders.functions";

import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyWallet, payOrderWithWallet } from "@/lib/wallet.functions";
import { Wallet } from "lucide-react";

export type InstantBuyItem = { network: Network; size: string; price: number } | null;

export function InstantBuyModal({ item, onClose }: { item: InstantBuyItem; onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchWallet = useServerFn(getMyWallet);
  const payWallet = useServerFn(payOrderWithWallet);

  const { data: walletData } = useQuery({
    queryKey: ["myWallet"],
    queryFn: () => fetchWallet(),
    enabled: !!user,
  });

  const walletBalance = walletData?.balanceGhs || 0;
  const canPayWallet = user && walletBalance >= (item?.price || 0);

  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [orderId, setOrderId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [paymentModalData, setPaymentModalData] = useState<{
    orderId: string;
    reference: string;
    phone: string;
    network: string;
    totalGhs: number;
  } | null>(null);

  const handleWalletPay = async () => {
    if (!validPhone || !item) return;
    setStatus("processing");
    setErrorMsg("");

    try {
      // Create order
      const orderRes = await createCheckoutOrder({
        data: {
          items: [{ id: `${item.network}-${item.size}`, network: item.network, size: item.size, price: item.price, qty: 1 }],
          recipientPhone: phone,
        },
      });

      // Pay with wallet
      await payWallet({ data: { orderId: orderRes.orderId, amountGhs: item.price } });
      queryClient.invalidateQueries({ queryKey: ["myWallet"] });
      setOrderId(orderRes.orderId);
      setStatus("done");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete wallet payment.");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (!item) {
      setPhone("");
      setStatus("idle");
      setOrderId("");
      setErrorMsg("");
      setPaymentModalData(null);
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

      onClose();
      navigate({
        to: "/payment/$reference",
        params: { reference: orderRes.reference },
      });
    } catch (err: any) {
      console.error("Paystack instant checkout error:", err);
      setErrorMsg(err.message || "Failed to initialize MoMo payment.");
      setStatus("error");
    }
  };

  if (paymentModalData) {
    return (
      <InAppPaymentModal
        orderId={paymentModalData.orderId}
        reference={paymentModalData.reference}
        recipientPhone={paymentModalData.phone}
        network={paymentModalData.network}
        totalGhs={paymentModalData.totalGhs}
        onClose={onClose}
        onSuccess={() => {
          setOrderId(paymentModalData.reference);
          setStatus("done");
          setPaymentModalData(null);
        }}
      />
    );
  }

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
              <Lock className="h-3 w-3 text-primary" /> In-App MoMo Checkout
            </div>
            <h3 className="text-lg font-bold">{item.size} · {item.network}</h3>
            <p className="text-xs text-muted-foreground">Delivered instantly after MoMo PIN prompt.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === "done" ? (
          <div className="mt-6 space-y-4 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
              <Check className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-foreground">Order Delivered! 🎉</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Your data bundle has been credited to <span className="font-semibold text-foreground">{phone}</span>.
              </p>
              {orderId && (
                <p className="mt-2 font-mono text-xs text-primary font-bold">
                  Reference: {orderId}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-md gold-gradient py-2 text-xs font-semibold text-primary-foreground"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Network:</span>
                <span className="font-bold">{item.network}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Bundle:</span>
                <span className="font-bold">{item.size}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-border/50 pt-1 mt-1">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-primary">GH₵ {item.price.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label htmlFor="instant-phone" className="block text-xs font-semibold">
                Recipient Phone Number
              </label>
              <input
                id="instant-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="024XXXXXXX"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {errorMsg && (
              <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            {user && (
              <div className="pt-1 border-t border-border/50">
                <button
                  type="button"
                  onClick={handleWalletPay}
                  disabled={!canPayWallet || !validPhone || status === "processing"}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 py-2.5 text-xs font-bold text-primary hover:bg-primary/20 disabled:opacity-50 transition-all mb-2"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Pay GH₵ {item.price.toFixed(2)} with Wallet (Bal: GH₵ {walletBalance.toFixed(2)})</span>
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={!validPhone || status === "processing"}
              className="flex w-full items-center justify-center gap-2 rounded-md gold-gradient py-3 text-xs font-bold text-primary-foreground disabled:opacity-50 shadow-md hover:scale-[1.01] active:scale-[.98] transition-all"
            >
              {status === "processing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Initiating MoMo Prompt…
                </>
              ) : (
                <>Pay GH₵ {item.price.toFixed(2)} via MoMo Push Prompt</>
              )}
            </button>

            <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-500" /> Direct MoMo PIN prompt pushed straight to your phone screen.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
