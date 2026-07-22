import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, ShoppingBag } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useCart } from "@/lib/cart";
import { verifyOrderPayment } from "@/lib/orders.functions";

export const Route = createFileRoute("/checkout/verify")({
  validateSearch: (search: Record<string, unknown>) => ({
    reference: (search.reference as string) || "",
  }),
  head: () => ({
    meta: [
      { title: "Payment Verification — Bestdata" },
      { name: "description", content: "Verifying your data bundle order transaction." },
    ],
  }),
  component: CheckoutVerify,
});

function CheckoutVerify() {
  const { reference } = Route.useSearch();
  const { clear } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"paid" | "processing" | "delivered" | "failed" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      setStatus("error");
      setErrorMsg("No transaction reference provided.");
      return;
    }

    verifyOrderPayment({ data: { reference } })
      .then((res: any) => {
        setLoading(false);
        if (res.verified) {
          setStatus(res.status || "paid");
          clear();
        } else {
          setStatus("failed");
          setErrorMsg("Payment could not be verified by Paystack.");
        }
      })
      .catch((err: any) => {
        setLoading(false);
        setStatus("error");
        setErrorMsg(err.message || "An error occurred while verifying payment.");
      });
  }, [reference, clear]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-16 w-full">
        {loading ? (
          <div className="rounded-3xl border border-border/80 bg-card p-10 text-center shadow-xl backdrop-blur-xl">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h2 className="mt-6 text-xl font-bold font-display">Verifying Payment…</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Checking status with Paystack for reference <span className="font-mono text-foreground font-semibold">{reference}</span>
            </p>
          </div>
        ) : status === "paid" || status === "processing" || status === "delivered" ? (
          <div className="rounded-3xl border border-border/80 bg-card p-8 md:p-10 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-emerald-500/15 text-emerald-500 ring-8 ring-emerald-500/10">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-2xl font-black font-display">Payment Successful!</h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Order Reference <span className="font-mono font-black text-primary">{reference}</span>
            </p>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Your transaction has been securely verified by Paystack. Your data bundle order is queued for instant delivery.
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
        ) : (
          <div className="rounded-3xl border border-destructive/30 bg-card p-8 md:p-10 text-center shadow-2xl">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-destructive/15 text-destructive ring-8 ring-destructive/10">
              <XCircle className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-2xl font-black font-display text-destructive">Payment Unconfirmed</h2>
            <p className="mt-2 text-xs text-muted-foreground font-medium">{errorMsg || "We could not confirm payment for this transaction."}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/checkout"
                className="rounded-xl gold-gradient px-5 py-3 text-xs font-extrabold text-primary-foreground shadow-lg active:scale-95 transition-all"
              >
                Return to Checkout
              </Link>
              <Link
                to="/support"
                className="rounded-xl border border-border px-5 py-3 text-xs font-bold hover:bg-muted active:scale-95 transition-all"
              >
                Contact Support
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
