import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Reveal, SectionHeading } from "./Reveal";

const FAQS = [
  { q: "Is the data here really cheaper than buying directly from MTN, Telecel, or AirtelTigo?", a: "Yes — our prices are genuinely much cheaper than buying direct. Same bundle, same network, far lower price." },
  { q: "How fast is data delivered after I pay?", a: "Delivery is usually fast — most bundles arrive within a few minutes. Delivery times may vary, and in rare cases may take up to a few hours. If a bundle has not arrived after 12 hours, contact support." },
  { q: "How long do my bundles last?", a: "MTN bundles are valid for 90 days. Telecel and AirtelTigo bundles do not expire — your data stays on the line until you use it." },
  { q: "Which payment methods do you accept?", a: "MTN MoMo, Telecel Cash, AirtelTigo Money, Visa, Mastercard, and your wallet — all secured via Paystack." },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <Reveal><SectionHeading eyebrow="FAQ" title="Frequently Asked Questions" subtitle="Quick answers to common questions" /></Reveal>
        <div className="mx-auto mt-10 max-w-2xl space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            const num = String(i + 1).padStart(2, "0");
            return (
              <div key={i} className={`overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)] transition-all ${isOpen ? "border-primary/50 ring-1 ring-primary/20" : "border-border"}`}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/15 text-xs font-bold text-primary">{num}</span>
                  <span className="flex-1 text-sm font-semibold text-foreground">{f.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <div id={`faq-panel-${i}`} className={`grid transition-all ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="pl-14 pr-5 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Link to="/faq" className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-5 h-10 text-sm font-semibold hover:bg-muted">
            View All FAQs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
