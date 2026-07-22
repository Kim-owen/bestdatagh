import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyApiKeys, createMyApiKey, revokeMyApiKey } from "@/lib/api-keys.functions";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — Bestdata" }, { name: "robots", content: "noindex" }] }),
  component: MyKeys,
});

function MyKeys() {
  const list = useServerFn(listMyApiKeys);
  const create = useServerFn(createMyApiKey);
  const revoke = useServerFn(revokeMyApiKey);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["myApiKeys"], queryFn: () => list() });
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const cm = useMutation({
    mutationFn: () => create({ data: { label } }),
    onSuccess: (r: any) => { setNewKey(r.key); setLabel(""); qc.invalidateQueries({ queryKey: ["myApiKeys"] }); },
  });
  const rm = useMutation({ mutationFn: (id: string) => revoke({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["myApiKeys"] }) });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[900px] px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2"><KeyRound className="h-7 w-7 text-primary" /> API Keys</h1>
        <p className="mt-2 text-sm text-muted-foreground">Use these keys to buy data bundles programmatically. See <Link to="/developers" className="text-primary underline">API docs</Link>.</p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <label className="text-xs font-semibold">Create new key</label>
          <div className="mt-2 flex gap-2">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Production server" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <button disabled={cm.isPending || label.length < 2} onClick={() => cm.mutate()} className="inline-flex items-center gap-2 rounded-lg gold-gradient px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4" /> Generate</button>
          </div>
          {newKey && (
            <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="text-xs font-semibold text-primary">Copy this key now — it will not be shown again.</div>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-background px-2 py-1.5 text-xs">{newKey}</code>
                <button onClick={() => { navigator.clipboard.writeText(newKey); }} className="rounded border border-border p-1.5"><Copy className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left"><tr>
              <th className="p-3">Label</th><th className="p-3">Prefix</th><th className="p-3">Last used</th><th className="p-3">Active</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {(data ?? []).map((k: any) => (
                <tr key={k.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{k.label}</td>
                  <td className="p-3 font-mono text-xs">{k.key_prefix}…</td>
                  <td className="p-3 text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "—"}</td>
                  <td className="p-3">{k.active ? "yes" : "revoked"}</td>
                  <td className="p-3 text-right">
                    {k.active && <button onClick={() => confirm("Revoke this key?") && rm.mutate(k.id)} className="rounded border border-border p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </td>
                </tr>
              ))}
              {data && data.length === 0 && <tr><td className="p-6 text-center text-muted-foreground" colSpan={5}>No API keys yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
}
