import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListApiKeys } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/api-keys")({ component: KeysPage });

function KeysPage() {
  const list = useServerFn(adminListApiKeys);
  const { data, isLoading } = useQuery({ queryKey: ["adminApiKeys"], queryFn: () => list() });
  return (
    <div>
      <h1 className="text-2xl font-extrabold">API Keys</h1>
      <p className="mt-1 text-sm text-muted-foreground">All reseller keys across the platform.</p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>
            <th className="p-3">User</th><th className="p-3">Label</th><th className="p-3">Prefix</th><th className="p-3">Active</th><th className="p-3">Last used</th><th className="p-3">Created</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td className="p-4" colSpan={6}>Loading…</td></tr>}
            {(data ?? []).map((k: any) => (
              <tr key={k.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{k.user_id.slice(0,8)}</td>
                <td className="p-3">{k.label}</td>
                <td className="p-3 font-mono text-xs">{k.key_prefix}…</td>
                <td className="p-3">{k.active ? <span className="text-green-600">yes</span> : <span className="text-muted-foreground">no</span>}</td>
                <td className="p-3 text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "—"}</td>
                <td className="p-3 text-xs">{new Date(k.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
