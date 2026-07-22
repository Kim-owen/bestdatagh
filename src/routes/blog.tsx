import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ArrowRight, Calendar } from "lucide-react";

export type Post = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  date: string;
  readMinutes: number;
  body: { heading?: string; paragraphs?: string[]; list?: string[]; ordered?: string[] }[];
};

export const POSTS: Post[] = [
  {
    slug: "pay-bills-online-ghana-mobile-money",
    category: "Bill Payments",
    title: "How to Pay Bills Online in Ghana With Mobile Money",
    excerpt: "Pay ECG, Ghana Water, DSTV and GoTV online with Mobile Money from your phone. Here is exactly what you need and how long it takes.",
    date: "Jul 11, 2026",
    readMinutes: 5,
    body: [
      { paragraphs: [
        "Paying bills in Ghana used to mean queuing at an ECG office or a bank. In 2026, almost every household bill — electricity, water, DSTV, GoTV, StarTimes, school fees — can be paid in under a minute from a mobile phone using MTN MoMo, Telecel Cash or AT Money.",
        "This guide walks through exactly what you need, which channel to use for each bill, and how long the credit actually takes to reflect.",
      ]},
      { heading: "What you need", list: [
        "A Mobile Money wallet with enough balance (plus a small buffer for the fee).",
        "The account or meter number for the bill you're paying.",
        "A working data connection — 20 MB is enough for the whole flow.",
      ]},
      { heading: "ECG (Electricity)", paragraphs: [
        "For post-paid ECG bills, dial your MoMo short code, pick Pay Bill → Utilities → ECG Postpaid, and enter your account number. For pre-paid meters, use ECG Prepaid and enter the 11-digit meter number. Tokens usually arrive by SMS within 2 minutes.",
      ]},
      { heading: "Ghana Water (GWCL)", paragraphs: [
        "Pay Bill → Utilities → Ghana Water, enter the account number printed on your last bill, and pay. GWCL updates its systems in real time, so the payment reflects instantly in most regions.",
      ]},
      { heading: "DSTV, GoTV, StarTimes", paragraphs: [
        "All three accept Mobile Money via the Pay Bill menu on MTN, Telecel and AT. Enter your smartcard/IUC number, choose the package, and pay. Reconnection is usually automatic within 5 minutes.",
      ]},
      { heading: "Bestdata + bill payments", paragraphs: [
        "While you're topping up, don't forget data. Bestdata sells MTN, Telecel and AirtelTigo bundles well below the direct network rate, and you pay with the same MoMo wallet — no separate app, no signup.",
      ]},
    ],
  },
  {
    slug: "at-bigtime-data-bundles-ghana",
    category: "AirtelTigo",
    title: "AT BigTime Data Bundles in Ghana Explained",
    excerpt: "AT BigTime data bundles explained: what AirtelTigo BigTime is, who it suits, and a cheaper way to keep an AT line loaded with data.",
    date: "Jul 11, 2026",
    readMinutes: 4,
    body: [
      { paragraphs: [
        "AT BigTime is AirtelTigo's flagship non-expiry data offer. Unlike weekly or monthly bundles, BigTime data sits on your line until you use it — perfect for people who don't stream every day and hate losing unused MB at the end of the month.",
      ]},
      { heading: "How BigTime works", ordered: [
        "Dial *567# on an AT line, choose Data → BigTime.",
        "Pick a bundle size (from 500 MB up to 100 GB).",
        "Confirm with Mobile Money or airtime.",
        "The bundle stays valid until it's fully consumed.",
      ]},
      { heading: "Who BigTime suits", list: [
        "Light users who only browse a few times a week.",
        "Second SIMs used mostly for WhatsApp and calls.",
        "Travellers who don't want a bundle expiring while they're away.",
      ]},
      { heading: "The cheaper way", paragraphs: [
        "Buying BigTime directly from AT works, but Bestdata sells the same AirtelTigo data — with the same non-expiry behaviour — at prices up to 40% lower. Same delivery to the same line, no code memorisation, just pick a size and pay.",
      ]},
    ],
  },
  {
    slug: "buy-data-for-ghana-from-abroad",
    category: "Diaspora",
    title: "How to Buy Data for Ghana From Abroad",
    excerpt: "A simple guide for the diaspora: buy data for Ghana from abroad, pay with your card, and have the bundle land on your family phone in minutes.",
    date: "Jul 11, 2026",
    readMinutes: 4,
    body: [
      { paragraphs: [
        "Sending airtime and data to family back home is one of the most common diaspora spends. The problem: most Ghanaian networks won't let a foreign card pay directly, and third-party sites often add 20–30% in fees.",
        "Bestdata was built to fix that. You pay with any Visa or Mastercard, in your local currency, and the recipient's line in Ghana gets the data — usually within 5 minutes.",
      ]},
      { heading: "The full process", ordered: [
        "Open bestdata and go to Buy Data.",
        "Pick the network (MTN, Telecel or AirtelTigo).",
        "Choose a bundle size and enter the recipient's Ghana phone number.",
        "Pay with your card — the Paystack checkout handles currency conversion automatically.",
        "You get an email receipt; the recipient gets an SMS confirmation.",
      ]},
      { heading: "Tips from other diaspora customers", list: [
        "Save the recipient's number in your browser so future top-ups take 20 seconds.",
        "For students, monthly 20 GB MTN bundles work out cheapest per GB.",
        "Non-expiry Telecel and AT bundles are great for grandparents — no need to remember to renew.",
      ]},
    ],
  },
  {
    slug: "mtn-data-bundle-prices-ghana-2026",
    category: "MTN",
    title: "MTN Data Bundle Prices in Ghana — 2026",
    excerpt: "A running list of MTN Ghana data bundle prices and validity, and how Bestdata prices compare.",
    date: "Jul 09, 2026",
    readMinutes: 5,
    body: [
      { paragraphs: [
        "MTN Ghana updates its data bundle pricing roughly every quarter. Below is the current line-up for 2026, along with the discounted Bestdata price for the same bundle.",
      ]},
      { heading: "Current MTN prices (90-day validity)", list: [
        "1 GB — MTN direct GHS 6.00 · Bestdata GHS 4.15",
        "2 GB — MTN direct GHS 12.00 · Bestdata GHS 8.15",
        "3 GB — MTN direct GHS 17.00 · Bestdata GHS 12.15",
        "5 GB — MTN direct GHS 27.00 · Bestdata GHS 19.15",
        "10 GB — MTN direct GHS 50.00 · Bestdata GHS 37.15",
        "20 GB — MTN direct GHS 95.00 · Bestdata GHS 71.15",
        "50 GB — MTN direct GHS 230.00 · Bestdata GHS 172.15",
      ]},
      { heading: "Why Bestdata is cheaper", paragraphs: [
        "Bestdata buys data in bulk from MTN's dealer channel and passes the wholesale rate on to you. The bundle that lands on your line is exactly the same MTN data — same speed, same 90-day validity, same LTE/5G access.",
      ]},
      { heading: "How to top up", paragraphs: [
        "Head to the Buy Data page, pick MTN, choose your size, enter the phone number and pay with MoMo or card. Delivery is usually under 5 minutes.",
      ]},
    ],
  },
  {
    slug: "telecel-non-expiry-bundles",
    category: "Telecel",
    title: "Why Telecel Bundles Don't Expire",
    excerpt: "Telecel non-expiry bundles are one of the best deals in Ghana. Here's how to buy them cheaper on Bestdata.",
    date: "Jul 05, 2026",
    readMinutes: 3,
    body: [
      { paragraphs: [
        "When Vodafone Ghana rebranded to Telecel in 2023, one of the changes customers loved most was the introduction of true non-expiry data bundles. Buy 10 GB today, use it over 3 months — Telecel doesn't wipe the balance at the end of a validity window.",
      ]},
      { heading: "Who this is for", list: [
        "Households where one Telecel line is the backup / MiFi router.",
        "Small businesses that batch their data usage.",
        "Anyone who has been burned by MTN's 90-day expiry on unused GB.",
      ]},
      { heading: "Bestdata prices vs. Telecel direct", list: [
        "5 GB — Telecel direct GHS 50 · Bestdata GHS 38",
        "10 GB — Telecel direct GHS 90 · Bestdata GHS 71",
        "20 GB — Telecel direct GHS 175 · Bestdata GHS 137",
        "50 GB — Telecel direct GHS 400 · Bestdata GHS 320",
      ]},
    ],
  },
  {
    slug: "how-paystack-mobile-money-works",
    category: "Guides",
    title: "How Paystack Mobile Money Works",
    excerpt: "A short explainer of Paystack's Mobile Money flow — what happens after you tap 'Pay' on Bestdata.",
    date: "Jul 02, 2026",
    readMinutes: 3,
    body: [
      { paragraphs: [
        "Paystack is the payment processor Bestdata uses for Mobile Money and card checkouts. Here's what actually happens in the ~15 seconds after you tap Pay.",
      ]},
      { heading: "The Mobile Money flow", ordered: [
        "You enter your phone number and pick your network on the Paystack checkout.",
        "Paystack sends a payment request to your MoMo wallet.",
        "Your phone buzzes with an authorisation prompt — enter your MoMo PIN.",
        "Paystack confirms the payment and calls Bestdata's webhook.",
        "Bestdata triggers the bundle order with the network. Delivery typically completes within 5 minutes.",
      ]},
      { heading: "Is it safe?", paragraphs: [
        "Yes. Paystack is PCI DSS Level 1 certified — the same standard used by major banks. Your PIN never leaves your phone, and Bestdata never sees your card or wallet PIN.",
      ]},
      { heading: "What if it fails?", paragraphs: [
        "If the payment fails, no money leaves your wallet. If the payment succeeds but the bundle doesn't arrive within 12 hours, contact support with your Order ID — failed deliveries are automatically refunded.",
      ]},
    ],
  },
];

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog & Guides — Bestdata" },
      { name: "description", content: "Ghana data bundle tips, guides and news from the Bestdata team. Learn about MTN, Telecel and AirtelTigo bundles, Mobile Money payments and more." },
      { name: "keywords", content: "Ghana data bundles, MTN data, Telecel bundles, AirtelTigo, Mobile Money, Paystack, Bestdata blog" },
      { property: "og:title", content: "Blog & Guides — Bestdata" },
      { property: "og:description", content: "Ghana data bundle tips, guides and news from the Bestdata team." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Bestdata" },
      { property: "og:url", content: "/blog" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Blog & Guides — Bestdata" },
      { name: "twitter:description", content: "Ghana data bundle tips, guides and news from the Bestdata team." },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "Bestdata Blog",
        description: "Ghana data bundle tips, guides and news from the Bestdata team.",
        url: "/blog",
        blogPost: POSTS.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title,
          description: p.excerpt,
          datePublished: p.date,
          articleSection: p.category,
          url: `/blog/${p.slug}`,
        })),
      }),
    }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1152px] px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-2xl">
          <div className="eyebrow mb-3">From the blog</div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Data bundle tips & guides</h1>
          <p className="mt-3 text-muted-foreground">Straightforward reads on Ghana data bundles, payments and getting the most from your line.</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {POSTS.map((p) => (
            <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="group relative block overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] hover:-translate-y-1 hover:shadow-[var(--shadow-hover)] transition-all">
              <div className="absolute inset-x-0 top-0 h-[2px] gold-gradient" />
              <span className="inline-block rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">{p.category}</span>
              <h2 className="mt-3 text-base font-bold leading-snug line-clamp-2 group-hover:text-primary">{p.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {p.date}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary">Read <ArrowRight className="h-3.5 w-3.5" /></span>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
