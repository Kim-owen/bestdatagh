import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Code2, KeyRound, Zap, CheckCircle2, Copy, Server, CreditCard, Send, ShieldCheck, ListOrdered } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/developers")({
  head: () => ({
    meta: [
      { title: "SwiftData Reseller REST API Documentation — Bestdata" },
      { name: "description", content: "SwiftData Reseller REST API — purchase data bundles programmatically across all Ghana networks (Yello/MTN, AirtelTigo iShare, AirtelTigo Bigtime, Telecel)." },
      { property: "og:title", content: "SwiftData Reseller REST API" },
      { property: "og:description", content: "Automated Ghana data bundle reseller REST API." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/developers" }],
  }),
  component: DevPage,
});

function DevPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const base = typeof window !== "undefined" ? window.location.origin : "https://ghana-data-hub-gold.vercel.app";

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Header />
      <main className="mx-auto max-w-[1000px] w-full px-4 sm:px-6 py-10 md:py-14">
        {/* Header Badge */}
        <div className="eyebrow mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs">
          <Code2 className="h-4 w-4" /> SwiftData Reseller REST API v1
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight font-display">
          API Documentation
        </h1>
        <p className="mt-3 text-muted-foreground text-sm md:text-base max-w-3xl leading-relaxed">
          SwiftData Reseller REST API — purchase data bundles programmatically across all Ghana networks. Build automated data reselling into your app, site, or Telegram/WhatsApp bots.
        </p>

        {/* Quick Reference Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card icon={KeyRound} title="1. Generate API Key" body={<>Generate your API key from <a href="/account/api-keys" className="text-primary font-bold underline">My API Keys</a> in your account dashboard.</>} />
          <Card icon={Zap} title="2. Top up Wallet Balance" body={<>Top up your reseller API balance via MoMo directly to unlock instant automated fulfillment.</>} />
          <Card icon={Send} title="3. Automate Data Delivery" body={<>Send <code>POST /v1/buy-data</code> requests to trigger instant automated data delivery.</>} />
        </div>

        {/* Base URL Banner */}
        <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-primary">API Base URL</div>
            <div className="mt-1 text-sm font-mono font-bold text-foreground break-all">
              {base}/api/v1
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(`${base}/api/v1`, "base")}
            className="shrink-0 flex items-center gap-1.5 rounded-xl gold-gradient px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            {copiedSection === "base" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedSection === "base" ? "Copied Base URL" : "Copy Base URL"}
          </button>
        </div>

        {/* Authentication Section */}
        <Section title="Authentication">
          <p className="text-sm text-muted-foreground">Every request requires your API key in the <code>Authorization</code> header.</p>
          <CodeBlock
            id="auth"
            code={`Authorization: Bearer sk_live_your_api_key\nContent-Type: application/json`}
            onCopy={copyToClipboard}
            copiedId={copiedSection}
          />
        </Section>

        {/* Supported Networks Table */}
        <Section title="Supported Networks">
          <p className="text-sm text-muted-foreground mb-3">Use these exact network IDs in package and order requests:</p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="px-4 py-3">Network ID</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                <tr>
                  <td className="px-4 py-3 font-mono font-bold text-primary">yello</td>
                  <td className="px-4 py-3 font-bold">Yello</td>
                  <td className="px-4 py-3 text-muted-foreground">MTN Ghana Data Bundles</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono font-bold text-primary">at_ishare</td>
                  <td className="px-4 py-3 font-bold">AirtelTigo iShare</td>
                  <td className="px-4 py-3 text-muted-foreground">AirtelTigo iShare Non-expiry Bundles</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono font-bold text-primary">at_bigtime</td>
                  <td className="px-4 py-3 font-bold">AirtelTigo Bigtime</td>
                  <td className="px-4 py-3 text-muted-foreground">AirtelTigo Bigtime Packages</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono font-bold text-primary">telecel</td>
                  <td className="px-4 py-3 font-bold">Telecel</td>
                  <td className="px-4 py-3 text-muted-foreground">Telecel Ghana (Vodafone) Bundles</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* Endpoints */}

        {/* 1. Health Check */}
        <EndpointSection
          method="GET"
          path="/api/v1/health"
          title="Health Check"
          description="Returns API operational status and supported network IDs. No balance required."
          curl={`curl -X GET "${base}/api/v1/health"`}
          response={`{\n  "success": true,\n  "status": "operational",\n  "timestamp": "2026-07-23T00:45:00.000Z",\n  "networks": ["yello", "at_ishare", "at_bigtime", "telecel"]\n}`}
          onCopy={copyToClipboard}
          copiedId={copiedSection}
          sectionId="health"
        />

        {/* 2. Check Balance */}
        <EndpointSection
          method="GET"
          path="/api/v1/balance"
          title="Get Wallet Balance"
          description="Returns your current API reseller wallet balance in GHS."
          curl={`curl -X GET "${base}/api/v1/balance" \\\n  -H "Authorization: Bearer sk_live_your_api_key"`}
          response={`{\n  "success": true,\n  "balance": 150.00,\n  "currency": "GHS"\n}`}
          onCopy={copyToClipboard}
          copiedId={copiedSection}
          sectionId="balance"
        />

        {/* 3. List Packages */}
        <EndpointSection
          method="GET"
          path="/api/v1/packages"
          title="List Available Packages"
          description="Returns all active data packages with network IDs, labels, prices, and validity."
          curl={`curl -X GET "${base}/api/v1/packages"`}
          response={`{\n  "success": true,\n  "networks": [\n    { "id": "yello", "label": "Yello" },\n    { "id": "at_ishare", "label": "AirtelTigo iShare" },\n    { "id": "at_bigtime", "label": "AirtelTigo Bigtime" },\n    { "id": "telecel", "label": "Telecel" }\n  ],\n  "packages": [\n    {\n      "network": "yello",\n      "network_label": "Yello",\n      "size_gb": 1,\n      "price": 4.50,\n      "validity": "Non expiry"\n    }\n  ]\n}`}
          onCopy={copyToClipboard}
          copiedId={copiedSection}
          sectionId="packages"
        />

        {/* 4. Buy Data */}
        <EndpointSection
          method="POST"
          path="/api/v1/buy-data"
          title="Buy Data Bundle"
          description="Purchase a data bundle for a Ghana phone number. Deducts from your API balance instantly."
          curl={`curl -X POST "${base}/api/v1/buy-data" \\\n  -H "Authorization: Bearer sk_live_your_api_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "phone": "0241234567",\n    "network": "yello",\n    "size_gb": 1,\n    "reference": "custom-ref-12345"\n  }'`}
          response={`{\n  "success": true,\n  "order": {\n    "reference": "ORD-ABC123XYZ",\n    "phone": "0241234567",\n    "network": "yello",\n    "network_label": "Yello",\n    "size_gb": 1,\n    "amount": 4.50,\n    "status": "completed"\n  }\n}`}
          onCopy={copyToClipboard}
          copiedId={copiedSection}
          sectionId="buydata"
        />

        {/* 5. Verify Number */}
        <EndpointSection
          method="POST"
          path="/api/v1/verify-number"
          title="Verify Phone Number(s)"
          description="Check whether one or more phones are active and ready to receive data."
          curl={`curl -X POST "${base}/api/v1/verify-number" \\\n  -H "Authorization: Bearer sk_live_your_api_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "phone": "0241234567"\n  }'`}
          response={`{\n  "success": true,\n  "checked": 1,\n  "verified": 1,\n  "unverified": 0,\n  "results": [\n    {\n      "phone": "0241234567",\n      "valid": true,\n      "verified": true,\n      "status": "verified",\n      "message": "Number is active on network and ready to receive data"\n    }\n  ]\n}`}
          onCopy={copyToClipboard}
          copiedId={copiedSection}
          sectionId="verifynumber"
        />

        {/* 6. List Orders */}
        <EndpointSection
          method="GET"
          path="/api/v1/orders"
          title="List API Orders"
          description="Returns your API reseller orders. Supports ?limit=50&offset=0 query parameters."
          curl={`curl -X GET "${base}/api/v1/orders?limit=50&offset=0" \\\n  -H "Authorization: Bearer sk_live_your_api_key"`}
          response={`{\n  "success": true,\n  "orders": [\n    {\n      "reference": "ORD-ABC123XYZ",\n      "phone": "0241234567",\n      "network": "yello",\n      "network_label": "Yello",\n      "size_gb": 1,\n      "amount": 4.50,\n      "status": "completed",\n      "created_at": "2026-07-23T12:00:00.000Z"\n    }\n  ]\n}`}
          onCopy={copyToClipboard}
          copiedId={copiedSection}
          sectionId="listorders"
        />

        {/* 7. Get Order Status */}
        <EndpointSection
          method="GET"
          path="/api/v1/orders/{reference}"
          title="Get Order Details"
          description="Get a single order by its reference. Poll until status is completed or failed."
          curl={`curl -X GET "${base}/api/v1/orders/ORD-ABC123XYZ" \\\n  -H "Authorization: Bearer sk_live_your_api_key"`}
          response={`{\n  "success": true,\n  "order": {\n    "reference": "ORD-ABC123XYZ",\n    "phone": "0241234567",\n    "network": "telecel",\n    "network_label": "Telecel",\n    "size_gb": 1,\n    "amount": 4.20,\n    "status": "completed"\n  }\n}`}
          onCopy={copyToClipboard}
          copiedId={copiedSection}
          sectionId="getorder"
        />

        {/* Error Codes Section */}
        <Section title="Error Codes">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <ErrorCard code="401" title="Unauthorized" desc="Missing, invalid, or revoked API key." />
            <ErrorCard code="400" title="Bad Request" desc="Invalid phone number, missing network, or insufficient balance." />
            <ErrorCard code="404" title="Not Found" desc="Order or endpoint not found." />
            <ErrorCard code="500" title="Server Error" desc="Internal error (retry with exponential backoff)." />
          </div>
        </Section>
      </main>
      <Footer />
    </div>
  );
}

function Card({ icon: Icon, title, body }: { icon: any; title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:border-primary/40 transition-colors">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-2 text-sm font-black">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{body}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 border-t border-border/50 pt-8">
      <h2 className="text-xl md:text-2xl font-black font-display tracking-tight">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EndpointSection({
  method,
  path,
  title,
  description,
  curl,
  response,
  onCopy,
  copiedId,
  sectionId,
}: {
  method: "GET" | "POST";
  path: string;
  title: string;
  description: string;
  curl: string;
  response: string;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  sectionId: string;
}) {
  return (
    <div className="mt-10 rounded-3xl border border-border/80 bg-card p-6 md:p-8 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-xl font-mono text-xs font-black uppercase ${
              method === "POST" ? "bg-amber-500/15 text-amber-500 border border-amber-500/20" : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
            }`}
          >
            {method}
          </span>
          <span className="font-mono text-sm font-bold text-foreground">{path}</span>
        </div>
        <h3 className="text-sm font-extrabold text-muted-foreground">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>

      <div className="space-y-3 pt-2">
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-muted-foreground mb-1.5">
            <span>cURL Request Example</span>
            <button
              onClick={() => onCopy(curl, `${sectionId}-curl`)}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              {copiedId === `${sectionId}-curl` ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedId === `${sectionId}-curl` ? "Copied" : "Copy cURL"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-2xl border border-border bg-muted/60 p-4 text-xs font-mono leading-relaxed text-foreground">
            <code>{curl}</code>
          </pre>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-muted-foreground mb-1.5">
            <span>Response JSON</span>
            <button
              onClick={() => onCopy(response, `${sectionId}-res`)}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              {copiedId === `${sectionId}-res` ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedId === `${sectionId}-res` ? "Copied" : "Copy JSON"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-2xl border border-border bg-slate-950 p-4 text-xs font-mono leading-relaxed text-emerald-400">
            <code>{response}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ code, title, desc }: { code: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="font-mono text-base font-black text-destructive">{code}</div>
      <div className="text-xs font-bold text-foreground mt-0.5">{title}</div>
      <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{desc}</div>
    </div>
  );
}

function CodeBlock({
  id,
  code,
  onCopy,
  copiedId,
}: {
  id: string;
  code: string;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  return (
    <div className="relative mt-3">
      <pre className="overflow-x-auto rounded-2xl border border-border bg-card p-4 text-xs font-mono leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => onCopy(code, id)}
        className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-muted/80 px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        {copiedId === id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copiedId === id ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
