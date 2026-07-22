import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Loader2, ShoppingBag, AlertCircle } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useCart } from "@/lib/cart";
import { createCheckoutOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Bestdata" },
      { name: "description", content: "Review your data bundles and pay securely with Mobile Money, Visa or Mastercard via Paystack." },
      { property: "og:title", content: "Checkout — Bestdata" },
      { property: "og:description", content: "Review and pay for your Ghana data bundles securely on Bestdata." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { items, subtotal, clear, setQty, removeItem } = useCart();
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [orderId, setOrderId] = useState("");
  const navigate = useNavigate();

  const validPhone = /^\d{9,10}$/.test(phone.replace(/\s+/g, ""));

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPhone || items.length === 0) return;
    setStatus("processing");
    setErrorMsg("");

    try {
      const res = await createCheckoutOrder({
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

      if (res?.authorizationUrl) {
        // Redirect user to Paystack payment gateway
        window.location.href = res.authorizationUrl;
      } else {
        throw new Error("Paystack did not return a valid checkout URL.");
      }
    } catch (err: any) {
      console.error("Checkout payment error:", err);
      setStatus("error");
      setErrorMsg(err.message || "Failed to initialize Paystack payment.");
    }
  };


  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-10 md:py-14">
        <div className="eyebrow mb-2">Checkout</div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Review & pay</h1>
        <p className="mt-2 text-muted-foreground">Confirm your bundles and complete payment securely.</p>

        {status === "done" ? (
          <div className="mt-10 rounded-3xl border border-border/80 bg-card p-8 md:p-12 text-center shadow-2xl max-w-lg mx-auto backdrop-blur-xl">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-emerald-500/15 text-emerald-500 ring-8 ring-emerald-500/10">
              <Check className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-2xl font-black font-display">Payment Successful!</h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Order Reference <span className="font-mono font-black text-primary">{orderId}</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Your data bundle order has been submitted for instant automated delivery to <span className="font-bold text-foreground">+233 {phone}</span>.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => navigate({ to: "/track-order" })}
                className="rounded-xl gold-gradient px-5 py-3 text-xs font-extrabold text-primary-foreground shadow-lg active:scale-95 transition-all"
              >
                Track Order Status
              </button>
              <Link to="/buy-data" search={{ network: "MTN" }} className="rounded-xl border border-border px-5 py-3 text-xs font-bold hover:bg-muted active:scale-95 transition-all">
                Purchase More Data
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-border/80 bg-card p-12 text-center max-w-lg mx-auto">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-lg font-extrabold font-display">Your Cart is Currently Empty</h2>
            <p className="mt-1 text-xs text-muted-foreground">Select a data bundle from our live marketplace to get started.</p>
            <Link to="/buy-data" search={{ network: "MTN" }} className="mt-6 inline-flex rounded-xl gold-gradient px-6 py-3 text-xs font-extrabold text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all">
              Browse Packages
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-widest text-primary">Selected Items ({items.length})</h2>
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

            <form onSubmit={pay} className="h-fit rounded-3xl border border-border/80 bg-card p-6 md:p-8 space-y-5 shadow-lg backdrop-blur-xl">
              <h2 className="text-xs font-black uppercase tracking-widest text-primary">Payment & Delivery</h2>
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

              <button
                type="submit"
                disabled={!validPhone || status === "processing"}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient px-4 py-3.5 text-xs font-extrabold text-primary-foreground shadow-[0_4px_16px_-2px_hsl(243_85%_62%_/_0.5)] hover:scale-[1.01] active:scale-[.98] disabled:opacity-60 transition-all"
              >
                {status === "processing" ? (<><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to Paystack…</>) : (<>Pay GH₵ {subtotal.toFixed(2)} via Paystack</>)}
              </button>
              <p className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                🔒 256-Bit Encrypted Payment Gateway
              </p>
            </form>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

