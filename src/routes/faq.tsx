import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ChevronDown, ArrowRight } from "lucide-react";
import { useState } from "react";

const FAQS: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: "Pricing",
    items: [
      { q: "Is the data here really cheaper than buying directly from MTN, Telecel, or AirtelTigo?", a: "Yes — our prices are genuinely much cheaper than buying direct. Same bundle, same network, far lower price." },
      { q: "Are there any hidden fees?", a: "No hidden fees. The price you see at checkout is the price you pay via Paystack." },
      { q: "Do prices change?", a: "Prices are updated from time to time based on network wholesale rates. The checkout price is always the final price." },
    ],
  },
  {
    category: "Delivery",
    items: [
      { q: "How fast is data delivered after I pay?", a: "Delivery is usually fast — most bundles arrive within a few minutes. Delivery times may vary, and in rare cases may take up to a few hours. If a bundle has not arrived after 12 hours, contact support." },
      { q: "How long do my bundles last?", a: "MTN bundles are valid for 90 days. Telecel and AirtelTigo bundles do not expire — your data stays on the line until you use it." },
      { q: "What happens if my order fails?", a: "Failed orders are automatically refunded to your wallet or original payment method." },
    ],
  },
  {
    category: "Payments",
    items: [
      { q: "Which payment methods do you accept?", a: "MTN MoMo, Telecel Cash, AirtelTigo Money, Visa, Mastercard, and your wallet — all secured via Paystack." },
      { q: "Is Paystack safe?", a: "Yes. Paystack is a PCI-DSS Level 1 compliant payment processor used across Africa. We never see or store your card details." },
      { q: "Can I pay from abroad?", a: "Yes — you can pay with an international Visa or Mastercard and have the bundle delivered to any Ghana number." },
    ],
  },
  {
    category: "Account",
    items: [
      { q: "Do I need an account to buy data?", a: "No — you can buy as a guest. Creating a free account unlocks wallet, order history, saved details, and priority support." },
      { q: "How do I reset my password?", a: "Use the 'Forgot password' link on the login page. We'll send a reset link to your email." },
    ],
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Bestdata" },
      { name: "description", content: "Frequently asked questions about buying data bundles on Bestdata." },
      { property: "og:title", content: "FAQ — Bestdata" },
      { property: "og:description", content: "Answers about pricing, delivery, payments and accounts on Bestdata." },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.flatMap((c) => c.items.map((i) => ({
          "@type": "Question",
          name: i.q,
          acceptedAnswer: { "@type": "Answer", text: i.a },
        }))),
      }),
    }],
  }),
  component: FaqPage,
});

function FaqPage() {
  const [open, setOpen] = useState<string | null>("0-0");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-12 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="eyebrow mb-3">FAQ</div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Frequently Asked Questions</h1>
          <p className="mt-3 text-muted-foreground">Answers about pricing, delivery, payments and accounts.</p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-10">
          {FAQS.map((cat, ci) => (
            <div key={cat.category}>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-primary">{cat.category}</h2>
              <div className="space-y-3">
                {cat.items.map((f, i) => {
                  const key = `${ci}-${i}`;
                  const isOpen = open === key;
                  return (
                    <div key={key} className={`overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)] transition-all ${isOpen ? "border-primary/50" : "border-border"}`}>
                      <button
                        onClick={() => setOpen(isOpen ? null : key)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center gap-3 px-5 py-4 text-left"
                      >
                        <span className="flex-1 text-sm font-semibold">{f.q}</span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      <div className={`grid transition-all ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="overflow-hidden">
                          <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">Still have questions?</p>
          <Link to="/support" className="mt-3 inline-flex items-center gap-2 rounded-2xl gold-gradient px-5 h-10 text-sm font-bold text-primary-foreground shadow-[var(--shadow-gold)]">
            Contact support <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
