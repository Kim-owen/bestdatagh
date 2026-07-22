import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listActiveBundles } from "@/lib/public-bundles.functions";
import { createBulkOrder } from "@/lib/bulk.functions";
import { useState, useMemo } from "react";
import { Upload, Plus, Trash2, FileSpreadsheet, Send } from "lucide-react";

export const Route = createFileRoute("/bulk")({
  head: () => ({
    meta: [
      { title: "Bulk Data Purchase — Bestdata" },
      { name: "description", content: "Send data bundles to many recipients at once. Upload a CSV or add numbers manually." },
      { property: "og:title", content: "Bulk Data Purchase — Bestdata" },
      { property: "og:description", content: "Deliver data to many recipients in one order. CSV or manual entry." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/bulk" }],
  }),
  component: BulkPage,
});

type Row = { phone: string; bundle_id: string };

function BulkPage() {
  const listBundles = useServerFn(listActiveBundles);
  const submit = useServerFn(createBulkOrder);
  const { data: bundles = [] } = useQuery({ queryKey: ["activeBundles"], queryFn: () => listBundles() });
  const [rows, setRows] = useState<Row[]>([{ phone: "", bundle_id: "" }]);
  const [defaultBundle, setDefaultBundle] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const total = useMemo(() => {
    const map = new Map(bundles.map((b: any) => [b.id, Number(b.price_ghs)]));
    return rows.reduce((s, r) => s + (map.get(r.bundle_id) ?? 0), 0);
  }, [rows, bundles]);

  const validRows = rows.filter((r) => r.phone.trim() && r.bundle_id);

  const m = useMutation({
    mutationFn: () => submit({ data: { items: validRows.map((r) => ({ bundle_id: r.bundle_id, recipient_phone: r.phone.trim() })), source: "bulk" } }),
    onSuccess: (r) => setResult(r),
  });

  function onCsv(f: File) {
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const bundleMap = new Map<string, string>();
      bundles.forEach((b: any) => bundleMap.set(`${b.network.toLowerCase()}|${b.size_label.toLowerCase()}`, b.id));
      const out: Row[] = [];
      for (const line of lines) {
        if (/phone/i.test(line) && /network|bundle/i.test(line)) continue;
        const [phone, network, size] = line.split(",").map((c) => c.trim());
        if (!phone) continue;
        let bundle_id = defaultBundle;
        if (network && size) {
          const key = `${network.toLowerCase()}|${size.toLowerCase()}`;
          bundle_id = bundleMap.get(key) ?? defaultBundle;
        }
        out.push({ phone, bundle_id });
      }
      if (out.length === 0) { setCsvError("No valid rows found in CSV."); return; }
      setRows(out);
    };
    reader.readAsText(f);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-10">
        <div className="eyebrow mb-3">Bulk purchase</div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Send data to many recipients at once</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">Upload a CSV (<code>phone,network,size</code>) or add rows manually. One payment, many deliveries. You must be signed in to submit.</p>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-muted">
                  <Upload className="h-4 w-4" /> Upload CSV
                  <input type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])} />
                </label>
                <a className="inline-flex items-center gap-2 text-sm text-primary hover:underline" href="data:text/csv;charset=utf-8,phone,network,size%0A0241234567,MTN,2GB%0A0501112222,Telecel,5GB" download="bulk-sample.csv"><FileSpreadsheet className="h-4 w-4" /> Sample CSV</a>
                <div className="ml-auto flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Default bundle:</span>
                  <select value={defaultBundle} onChange={(e) => setDefaultBundle(e.target.value)} className="rounded border border-border bg-background px-2 py-1 text-sm">
                    <option value="">—</option>
                    {bundles.map((b: any) => <option key={b.id} value={b.id}>{b.network} {b.size_label} · ₵{Number(b.price_ghs).toFixed(2)}</option>)}
                  </select>
                </div>
              </div>
              {csvError && <div className="mt-2 text-xs text-destructive">{csvError}</div>}
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left"><tr>
                  <th className="p-3 w-10">#</th><th className="p-3">Phone</th><th className="p-3">Bundle</th><th className="p-3"></th>
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-3 text-muted-foreground">{i+1}</td>
                      <td className="p-3"><input value={r.phone} onChange={(e) => setRows((rs) => rs.map((x,j)=>j===i?{...x,phone:e.target.value}:x))} placeholder="0241234567" className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm" /></td>
                      <td className="p-3">
                        <select value={r.bundle_id} onChange={(e) => setRows((rs) => rs.map((x,j)=>j===i?{...x,bundle_id:e.target.value}:x))} className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm">
                          <option value="">Select…</option>
                          {bundles.map((b: any) => <option key={b.id} value={b.id}>{b.network} {b.size_label} · ₵{Number(b.price_ghs).toFixed(2)}</option>)}
                        </select>
                      </td>
                      <td className="p-3"><button onClick={() => setRows((rs) => rs.filter((_,j)=>j!==i))} className="rounded border border-border p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 border-t border-border">
                <button onClick={() => setRows((rs) => [...rs, { phone: "", bundle_id: defaultBundle }])} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted"><Plus className="h-4 w-4" /> Add row</button>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-card p-5 h-fit sticky top-20">
            <h2 className="font-bold">Order summary</h2>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Recipients</span><span className="font-semibold">{validRows.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-extrabold text-lg">₵{total.toFixed(2)}</span></div>
            </div>
            <button disabled={m.isPending || validRows.length === 0} onClick={() => m.mutate()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl gold-gradient px-4 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-gold)] disabled:opacity-50">
              <Send className="h-4 w-4" /> {m.isPending ? "Submitting…" : "Submit bulk order"}
            </button>
            {m.error && <p className="mt-2 text-xs text-destructive">{(m.error as Error).message}</p>}
            {result && (
              <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <div className="font-bold">Order created</div>
                <div className="mt-1 text-xs">Reference: <code>{result.reference}</code></div>
                <div className="text-xs">Total: ₵{Number(result.total).toFixed(2)} · {result.count} recipients</div>
                <Link to="/track-order" className="mt-2 inline-block text-xs text-primary underline">Track this order</Link>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">Not signed in? <Link to="/auth" search={{ tab: "login", next: "/bulk" }} className="text-primary underline">Log in</Link> to submit bulk orders.</p>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
