import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Loader2, ShoppingBag, AlertCircle, ShieldCheck, Zap, Lock } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useCart } from "@/lib/cart";
import { createCheckoutOrder, verifyOrderPayment } from "@/lib/orders.functions";
import { checkPhoneVerification } from "@/lib/otp.functions";
import { openPaystackInlineCheckout } from "@/lib/paystack-inline";
import { OtpVerificationModal } from "@/components/site/OtpVerificationModal";

import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyWallet, payOrderWithWallet } from "@/lib/wallet.functions";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Bestdata" },
      { name: "description", content: "Review your data bundles and pay securely with Mobile Money, Visa or Mastercard in-line via Paystack." },
      { property: "og:title", content: "Checkout — Bestdata" },
      { property: "og:description", content: "Review and pay for your Ghana data bundles securely on Bestdata." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkout,
});

function Checkout() {
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

  const { items, subtotal, clear, setQty, removeItem } = useCart();
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying_phone" | "processing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [orderId, setOrderId] = useState("");
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const navigate = useNavigate();

  const validPhone = /^\d{9,10}$/.test(phone.replace(/\s+/g, ""));
  const canPayWallet = user && walletBalance >= subtotal && subtotal > 0;

  const handleWalletCheckout = async () => {
    if (!validPhone || items.length === 0) return;
    setStatus("processing");
    setErrorMsg("");

    try {
      const orderRes = await createCheckoutOrder({
        data: {
          items: items.map((it) => ({ id: it.id, network: it.network, size: it.size, price: it.price, qty: it.qty })),
          recipientPhone: phone,
        },
      });

      await payWallet({ data: { orderId: orderRes.orderId, amountGhs: subtotal } });
      queryClient.invalidateQueries({ queryKey: ["myWallet"] });
      setOrderId(orderRes.reference);
      setStatus("done");
      clear();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process wallet payment");
      setStatus("error");
    }
  };

  const initiatePaymentFlow = async () => {
    setStatus("processing");
    setErrorMsg("");

    try {
      // 1. Create order and get Paystack transaction details
      const orderRes = await createCheckoutOrder({
        data: {
          items: items.map((it) => ({
            id: it.id,
            network: it.network,
            size: it.size,
            price: it.price,
            qty: it.qty,
          })),
          recipientPhone: phone,
        },
      });

      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_b8e1f57e62d49e75eb82b5b3a4fdf24d3525cb7a";

      if (publicKey) {
        // 2. Open Paystack Inline Pop-up directly on page
        try {
          await openPaystackInlineCheckout({
            key: publicKey,
            email: `customer-${phone.replace(/\s+/g, "")}@bestdatagh.com`,
            amountGhs: subtotal,
            reference: orderRes.reference,
            metadata: {
              order_id: orderRes.orderId,
              recipient_phone: phone,
            },
            onSuccess: async (ref) => {
              // Automatically verify payment upon inline completion
              try {
                const verifyRes = await verifyOrderPayment({ data: { reference: ref } });
                if (verifyRes.verified) {
                  setOrderId(orderRes.reference);
                  setStatus("done");
                  clear();
                } else {
                  throw new Error("Payment verification could not be confirmed.");
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
          return;
        } catch (inlineErr: any) {
          console.warn("Paystack Inline popup fallback to redirect:", inlineErr.message);
        }
      }

      // Fallback redirect if inline SDK cannot be initialized
      if (orderRes?.authorizationUrl) {
        window.location.href = orderRes.authorizationUrl;
      } else {
        throw new Error("Paystack checkout URL not available.");
      }
    } catch (err: any) {
      console.error("Checkout payment error:", err);
      setStatus("error");
      setErrorMsg(err.message || "Failed to initialize payment checkout.");
    }
  };

  const handlePayClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPhone || items.length === 0) return;
    setStatus("verifying_phone");
    setErrorMsg("");

    try {
      // Check if phone number is a first-time buyer
      const checkRes = await checkPhoneVerification({ data: { phone } });

      if (checkRes.isVerified) {
        // Returning verified buyer -> proceed directly to Paystack In-line payment
        await initiatePaymentFlow();
      } else {
        // First-time buyer -> open OTP verification modal
        setStatus("idle");
        setOtpModalOpen(true);
      }
    } catch (err: any) {
      console.error("Phone verification check error:", err);
      // Fallback: proceed to payment flow
      await initiatePaymentFlow();
    }
  };

  const handleOtpVerified = async () => {
    setOtpModalOpen(false);
    await initiatePaymentFlow();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Header />
      <main className="mx-auto max-w-[1100px] w-full px-4 sm:px-6 py-10 md:py-14">
        <div className="eyebrow mb-2">In-Line Paystack Checkout</div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Review & Pay</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Confirm your data bundles and complete payment seamlessly without leaving the page.
        </p>

        {status === "done" ? (
          <div className="mt-10 rounded-3xl border border-border/80 bg-card p-8 md:p-12 text-center shadow-2xl max-w-lg mx-auto backdrop-blur-xl">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-emerald-500/15 text-emerald-500 ring-8 ring-emerald-500/10">
              <Check className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-2xl font-black font-display">Payment Successful!</h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Order Reference <span className="font-mono font-black text-primary">{orderId}</span>
            </p>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Your transaction has been verified in real-time. Your data bundle order is submitted for instant automated delivery to <span className="font-bold text-foreground">+233 {phone}</span>.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => navigate({ to: "/track-order" })}
                className="rounded-xl gold-gradient px-5 py-3 text-xs font-extrabold text-primary-foreground shadow-lg active:scale-95 transition-all"
              >
                Track Order Status
              </button>
              <Link
                to="/buy-data"
                search={{ network: "MTN" }}
                className="rounded-xl border border-border px-5 py-3 text-xs font-bold hover:bg-muted active:scale-95 transition-all"
              >
                Purchase More Data
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-border/80 bg-card p-12 text-center max-w-lg mx-auto shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-lg font-extrabold font-display">Your Cart is Currently Empty</h2>
            <p className="mt-1 text-xs text-muted-foreground">Select a data bundle package from our live marketplace to get started.</p>
            <Link
              to="/buy-data"
              search={{ network: "MTN" }}
              className="mt-6 inline-flex rounded-xl gold-gradient px-6 py-3 text-xs font-extrabold text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              Browse Packages
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
            {/* Selected Cart Items */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-primary">Selected Items ({items.length})</h2>
                <span className="text-xs font-bold text-muted-foreground">Instant Delivery</span>
              </div>
              <div className="mt-6 divide-y divide-border/50">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-4 py-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gold-gradient text-xs font-black text-primary-foreground shadow-md">
                      {it.network.slice(0, 3).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold">{it.size} · {it.network}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">GH₵ {it.price.toFixed(2)} unit price</div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={it.qty}
                      onChange={(e) => setQty(it.id, Number(e.target.value) || 1)}
                      className="w-16 rounded-xl border border-border bg-background px-2 py-1.5 text-center text-xs font-bold"
                    />
                    <div className="w-24 text-right text-sm font-extrabold">GH₵ {(it.price * it.qty).toFixed(2)}</div>
                    <button onClick={() => removeItem(it.id)} className="text-xs font-bold text-muted-foreground hover:text-destructive transition-colors">Remove</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment & Phone Verification Form */}
            <form onSubmit={handlePayClick} className="h-fit rounded-3xl border border-border/80 bg-card p-6 md:p-8 space-y-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <Zap className="h-4 w-4" /> In-Line Payment
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <Lock className="h-3 w-3" /> Paystack Secured
                </span>
              </div>

              <div>
                <label htmlFor="co-phone" className="text-xs font-bold text-foreground">Recipient Mobile Number</label>
                <div className="mt-2 flex items-center rounded-2xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                  <span className="pl-4 pr-3 text-xs font-bold text-muted-foreground">🇬🇭 +233</span>
                  <input
                    id="co-phone"
                    inputMode="numeric"
                    placeholder="24 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                    className="flex-1 bg-transparent py-3 pr-4 text-xs font-bold outline-none"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  First-time buyers will complete a quick 6-digit OTP verification.
                </p>
              </div>

              <div className="rounded-2xl bg-background/80 border border-border/60 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-bold">GH₵ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <span className="font-bold text-emerald-500">FREE</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="text-xs font-extrabold uppercase">Total Payable</span>
                  <span className="text-xl font-black text-foreground font-display">GH₵ {subtotal.toFixed(2)}</span>
                </div>
              </div>

              {status === "error" && (
                <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-xl text-xs font-bold text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {canPayWallet && (
                <button
                  type="button"
                  onClick={handleWalletCheckout}
                  disabled={!validPhone || status === "processing" || status === "verifying_phone"}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-4 py-4 text-xs font-black text-black shadow-md hover:scale-[1.01] active:scale-[.98] disabled:opacity-60 transition-all"
                >
                  <Wallet className="h-4 w-4" />
                  Pay GH₵ {subtotal.toFixed(2)} with Wallet (GH₵ {walletBalance.toFixed(2)} Avail)
                </button>
              )}

              <button
                type="submit"
                disabled={!validPhone || status === "processing" || status === "verifying_phone"}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient px-4 py-4 text-xs font-extrabold text-primary-foreground shadow-[0_4px_20px_-2px_hsl(243_85%_62%_/_0.5)] hover:scale-[1.01] active:scale-[.98] disabled:opacity-60 transition-all"
              >
                {status === "verifying_phone" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verifying Buyer Security…</>
                ) : status === "processing" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing Payment…</>
                ) : (
                  <>Pay GH₵ {subtotal.toFixed(2)} with Paystack</>
                )}
              </button>
              <p className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                💳 Mobile Money (MTN, Telecel, AirtelTigo) & Cards
              </p>
            </form>
          </div>
        )}
      </main>

      {/* First-Time Buyer OTP Verification Modal */}
      <OtpVerificationModal
        open={otpModalOpen}
        phone={phone}
        onOpenChange={setOtpModalOpen}
        onVerified={handleOtpVerified}
      />

      <Footer />
    </div>
  );
}
