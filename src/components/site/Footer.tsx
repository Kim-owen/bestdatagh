import { Link } from "@tanstack/react-router";
import { Logo } from "./Header";

const COLS = [
  {
    heading: "Quick Links",
    links: [
      ["Buy Data", "/buy-data"],
      ["Track Order", "/track-order"],
      ["Become a Reseller", "/reseller"],
      ["Get Your Own Website", "/website"],
      ["Blog", "/blog"],
      ["Reviews", "/reviews"],
      ["FAQ", "/faq"],
    ],
  },
  {
    heading: "Networks",
    links: [
      ["MTN Data Bundles", "/buy-data?network=MTN"],
      ["Telecel Data Bundles", "/buy-data?network=Telecel"],
      ["AirtelTigo Data Bundles", "/buy-data?network=AirtelTigo"],
      ["Cheapest Data Bundles", "/buy-data"],
    ],
  },
  {
    heading: "Buy Data",
    links: [
      ["All Bundle Sizes", "/buy-data"],
      ["MTN Bundles (90-day)", "/buy-data?network=MTN"],
      ["Telecel Bundles (non-expiry)", "/buy-data?network=Telecel"],
      ["AirtelTigo Bundles (non-expiry)", "/buy-data?network=AirtelTigo"],
      ["Cheapest Bundles", "/buy-data"],
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/60 backdrop-blur-lg pb-24 lg:pb-14 pt-16">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Logo />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Ghana's premier wholesale and retail data hub. Instant MTN, Telecel & AirtelTigo bundle deliveries with Mobile Money.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              All Systems Operational
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.heading}>
              <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary">{col.heading}</h4>
              <ul className="space-y-2">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-xs font-semibold text-foreground/75 hover:text-primary transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary">Support & Security</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="mailto:support@bestdata.com" className="font-semibold text-foreground/75 hover:text-primary transition-colors">support@bestdata.com</a></li>
              <li><Link to="/support" className="font-semibold text-foreground/75 hover:text-primary transition-colors">24/7 Support Desk</Link></li>
              <li className="text-muted-foreground pt-1 leading-relaxed">Secured with 256-bit SSL encryption via Paystack gateway.</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/60 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">© 2026 Bestdata Ghana. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="rounded-md border border-border px-2 py-0.5 font-bold">MTN MoMo</span>
              <span className="rounded-md border border-border px-2 py-0.5 font-bold">Telecel Cash</span>
              <span className="rounded-md border border-border px-2 py-0.5 font-bold">AirtelTigo Money</span>
              <span className="rounded-md border border-border px-2 py-0.5 font-bold">Paystack</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

