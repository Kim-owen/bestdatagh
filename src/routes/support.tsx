import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Mail, MessageSquare, Clock, ArrowRight, LifeBuoy, ShieldCheck, Zap } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Bestdata" },
      { name: "description", content: "Get help from the Bestdata team: AI assistant, live chat, and email support." },
      { property: "og:title", content: "Support — Bestdata" },
      { property: "og:description", content: "AI assistant, live chat, and email support for Bestdata customers." },
      { property: "og:url", content: "/support" },
    ],
    links: [{ rel: "canonical", href: "/support" }],
  }),
  component: SupportPage,
});

function SupportPage() {
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-12 md:py-16 text-center">
            <div className="eyebrow mb-3">Support</div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">How can we help?</h1>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Our team is here for orders, deposits, and any account questions.</p>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 sm:px-6 py-12 md:py-16">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              { icon: MessageSquare, title: "AI Chat Assistant", desc: "Instant answers about orders, deposits and bundles.", cta: "Start chat", href: "#chat" },
              { icon: Mail, title: "Email Support", desc: "Write to us and we'll get back within a few hours.", cta: "support@bestdata.com", href: "mailto:support@bestdata.com" },
              { icon: LifeBuoy, title: "Order Help", desc: "Bundle hasn't arrived? We'll investigate and refund if needed.", cta: "Track an order", href: "/track-order" },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-base font-bold">{c.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{c.desc}</p>
                  <a href={c.href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{c.cta} <ArrowRight className="h-3.5 w-3.5" /></a>
                </div>
              );
            })}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
              <h2 className="text-xl font-bold">Send us a message</h2>
              <p className="mt-1 text-sm text-muted-foreground">We reply to every message.</p>
              {sent ? (
                <div className="mt-6 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
                  Thanks — we've got your message and will reply shortly.
                </div>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); setSent(true); }}
                  className="mt-6 space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold">Name</label>
                      <input required className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold">Email</label>
                      <input required type="email" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">Order ID (optional)</label>
                    <input className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">Message</label>
                    <textarea required rows={5} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl gold-gradient px-4 h-11 text-sm font-bold text-primary-foreground shadow-[var(--shadow-gold)] active:scale-[.97]">
                    Send message <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-sm font-bold"><Clock className="h-4 w-4 text-primary" /> Hours</div>
                <p className="mt-2 text-sm text-muted-foreground">AI assistant: 9 AM – 9 PM daily. Email replies within a few hours during business hours.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-primary" /> Safety</div>
                <p className="mt-2 text-sm text-muted-foreground">We'll never ask for your PIN or Mobile Money authorization code. Report anyone claiming to be Bestdata asking for these.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-sm font-bold"><Zap className="h-4 w-4 text-primary" /> Order not arrived?</div>
                <p className="mt-2 text-sm text-muted-foreground">Most bundles arrive within minutes. If it hasn't arrived after 12 hours, message us with your Order ID and phone number.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
