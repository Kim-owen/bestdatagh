import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useState } from "react";
import { CheckCircle2, Clock, PackageSearch, XCircle } from "lucide-react";

export const Route = createFileRoute("/track-order")({
  head: () => ({
    meta: [
      { title: "Track Order — Bestdata" },
      { name: "description", content: "Track your Bestdata order with your Order ID and phone number." },
      { property: "og:title", content: "Track Order — Bestdata" },
      { property: "og:description", content: "Track your Bestdata order in seconds." },
      { property: "og:url", content: "/track-order" },
    ],
    links: [{ rel: "canonical", href: "/track-order" }],
  }),
  component: TrackOrder,
});

type Status = "delivered" | "processing" | "failed" | null;

function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    // Demo logic: pick a status based on order ID length
    if (!orderId.trim()) return setStatus(null);
    const len = orderId.trim().length;
    setStatus(len < 4 ? "failed" : len < 8 ? "processing" : "delivered");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-12 md:py-20">
        <div className="mx-auto max-w-xl">
          <div className="eyebrow mb-3">Track Order</div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Track your data order</h1>
          <p className="mt-3 text-muted-foreground">Enter your Order ID and the phone number the bundle was sent to.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Order ID</label>
              <input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. BD-2026-001234"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Phone number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 024 123 4567"
                inputMode="tel"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl gold-gradient px-4 h-11 text-sm font-bold text-primary-foreground shadow-[var(--shadow-gold)] active:scale-[.97]">
              <PackageSearch className="h-4 w-4" /> Track order
            </button>
          </form>

          {submitted && status && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-6">
              {status === "delivered" && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-[color:var(--success)]" />
                  <div>
                    <div className="font-bold">Delivered</div>
                    <p className="text-sm text-muted-foreground">Bundle was delivered to {phone}. Enjoy your data!</p>
                  </div>
                </div>
              )}
              {status === "processing" && (
                <div className="flex items-start gap-3">
                  <Clock className="h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <div className="font-bold">Processing</div>
                    <p className="text-sm text-muted-foreground">We're delivering your bundle. Most orders arrive within minutes.</p>
                  </div>
                </div>
              )}
              {status === "failed" && (
                <div className="flex items-start gap-3">
                  <XCircle className="h-6 w-6 shrink-0 text-destructive" />
                  <div>
                    <div className="font-bold">Order not found</div>
                    <p className="text-sm text-muted-foreground">Double-check your Order ID or contact support@bestdata.com.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="mt-6 text-xs text-muted-foreground">Most orders arrive within minutes. If a bundle hasn't arrived after 12 hours, contact support.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
