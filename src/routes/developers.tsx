import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Code2, KeyRound, Zap } from "lucide-react";

export const Route = createFileRoute("/developers")({
  head: () => ({
    meta: [
      { title: "Developer API — Bestdata" },
      { name: "description", content: "REST API to sell MTN, Telecel and AirtelTigo data bundles from your app. Generate an API key and start in minutes." },
      { property: "og:title", content: "Bestdata Developer API" },
      { property: "og:description", content: "REST API for automated data bundle sales in Ghana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/developers" }],
  }),
  component: DevPage,
});

function DevPage() {
  const base = typeof window !== "undefined" ? window.location.origin : "https://bestdata.gh";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[900px] px-4 sm:px-6 py-10">
        <div className="eyebrow mb-3 flex items-center gap-2"><Code2 className="h-4 w-4" /> Developers</div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Bestdata REST API</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">Programmatically list bundles and place orders on behalf of your customers. Perfect for resellers, integrations and internal tools.</p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card icon={KeyRound} title="1. Get a key" body={<>Create an account and generate a key at <a href="/account/api-keys" className="text-primary underline">/account/api-keys</a>.</>} />
          <Card icon={Zap} title="2. List bundles" body={<>Public endpoint — no auth required.</>} />
          <Card icon={Code2} title="3. Create orders" body={<>Send a JSON body with recipients and bundle IDs.</>} />
        </div>

        <Section title="Authentication">
          <p>Send your API key as a Bearer token in the <code>Authorization</code> header. Keys look like <code>bd_live_…</code>.</p>
          <Pre>{`Authorization: Bearer bd_live_xxxxxxxxxxxxxxxxxxxxxxxx`}</Pre>
        </Section>

        <Section title="GET /api/public/v1/bundles">
          <p>Returns all active bundles.</p>
          <Pre>{`curl ${base}/api/public/v1/bundles`}</Pre>
          <Pre>{`{
  "data": [
    { "id": "…", "network": "MTN", "size_label": "2GB", "size_mb": 2048, "price_ghs": "9.50", "validity": "90 days" }
  ]
}`}</Pre>
        </Section>

        <Section title="POST /api/public/v1/orders">
          <p>Create a new order. Up to 500 recipients per request.</p>
          <Pre>{`curl -X POST ${base}/api/public/v1/orders \\
  -H "Authorization: Bearer bd_live_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      { "bundle_id": "uuid-of-mtn-2gb", "recipient_phone": "0241234567" },
      { "bundle_id": "uuid-of-telecel-5gb", "recipient_phone": "0501112222", "quantity": 2 }
    ]
  }'`}</Pre>
          <Pre>{`{
  "data": {
    "id": "…",
    "reference": "BD-XXXXXXXXXX",
    "status": "pending",
    "total_ghs": "38.50",
    "items": [ … ]
  }
}`}</Pre>
        </Section>

        <Section title="Errors">
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li><b>401</b> — missing/invalid/revoked API key</li>
            <li><b>400</b> — invalid payload or unavailable bundle</li>
            <li><b>500</b> — server error (retry with backoff)</li>
          </ul>
        </Section>
      </main>
      <Footer />
    </div>
  );
}

function Card({ icon: Icon, title, body }: { icon: any; title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-2 font-bold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{body}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-10"><h2 className="text-xl font-extrabold">{title}</h2><div className="mt-3 space-y-3 text-sm text-foreground/90">{children}</div></section>;
}
function Pre({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed"><code>{children}</code></pre>;
}
