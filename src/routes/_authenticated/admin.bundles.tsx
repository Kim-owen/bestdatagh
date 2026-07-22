import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListBundles, adminSaveBundle, adminDeleteBundle } from "@/lib/admin.functions";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/bundles")({ component: BundlesPage });

const empty = { network: "MTN", size_label: "", size_mb: 1024, price_ghs: 0, validity: "90 days", popular: false, active: true, sort_order: 100 };

function BundlesPage() {
  const list = useServerFn(adminListBundles);
  const save = useServerFn(adminSaveBundle);
  const del = useServerFn(adminDeleteBundle);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["adminBundles"], queryFn: () => list() });
  const [editing, setEditing] = useState<any>(null);
  const m = useMutation({ mutationFn: (v: any) => save({ data: v }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["adminBundles"] }); setEditing(null); } });
  const dm = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["adminBundles"] }) });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Bundles</h1>
        <button onClick={() => setEditing(empty)} className="inline-flex items-center gap-2 rounded-lg gold-gradient px-4 py-2 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" /> New bundle</button>
      </div>

      {editing && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <h2 className="font-bold">{editing.id ? "Edit" : "New"} bundle</h2>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="text-xs">Network<select value={editing.network} onChange={(e) => setEditing({ ...editing, network: e.target.value })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"><option>MTN</option><option>Telecel</option><option>AirtelTigo</option></select></label>
            <label className="text-xs">Size label<input value={editing.size_label} onChange={(e) => setEditing({ ...editing, size_label: e.target.value })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm" /></label>
            <label className="text-xs">Size MB<input type="number" value={editing.size_mb} onChange={(e) => setEditing({ ...editing, size_mb: +e.target.value })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm" /></label>
            <label className="text-xs">Price GHS<input type="number" step="0.01" value={editing.price_ghs} onChange={(e) => setEditing({ ...editing, price_ghs: +e.target.value })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm" /></label>
            <label className="text-xs">Validity<input value={editing.validity} onChange={(e) => setEditing({ ...editing, validity: e.target.value })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm" /></label>
            <label className="text-xs">Sort<input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm" /></label>
            <label className="text-xs flex items-center gap-2 pt-5"><input type="checkbox" checked={editing.popular} onChange={(e) => setEditing({ ...editing, popular: e.target.checked })} /> Popular</label>
            <label className="text-xs flex items-center gap-2 pt-5"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
          </div>
          <div className="mt-4 flex gap-2">
            <button disabled={m.isPending} onClick={() => m.mutate(editing)} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Save</button>
            <button onClick={() => setEditing(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>
            <th className="p-3">Network</th><th className="p-3">Size</th><th className="p-3">Price</th><th className="p-3">Validity</th><th className="p-3">Flags</th><th className="p-3">Actions</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td className="p-4" colSpan={6}>Loading…</td></tr>}
            {(data ?? []).map((b: any) => (
              <tr key={b.id} className="border-t border-border">
                <td className="p-3 font-semibold">{b.network}</td>
                <td className="p-3">{b.size_label}</td>
                <td className="p-3">₵{Number(b.price_ghs).toFixed(2)}</td>
                <td className="p-3 text-xs">{b.validity}</td>
                <td className="p-3 text-xs">{b.popular && "★ "}{!b.active && "hidden"}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => setEditing(b)} className="rounded border border-border px-3 py-1 text-xs font-semibold hover:bg-muted">Edit</button>
                  <button onClick={() => confirm("Delete?") && dm.mutate(b.id)} className="rounded border border-border px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
