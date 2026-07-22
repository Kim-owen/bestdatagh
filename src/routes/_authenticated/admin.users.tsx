import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListUsers, adminSetRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({ component: UsersPage });

function UsersPage() {
  const list = useServerFn(adminListUsers);
  const setRole = useServerFn(adminSetRole);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["adminUsers"], queryFn: () => list() });
  const m = useMutation({
    mutationFn: (v: { userId: string; role: "admin"|"agent"|"user"; grant: boolean }) => setRole({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminUsers"] }),
  });
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Users</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>
            <th className="p-3">Email</th><th className="p-3">Name</th><th className="p-3">Roles</th><th className="p-3">Joined</th><th className="p-3">Actions</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td className="p-4" colSpan={5}>Loading…</td></tr>}
            {(data ?? []).map((u: any) => {
              const isAdmin = u.roles?.includes("admin");
              const isAgent = u.roles?.includes("agent");
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.display_name}</td>
                  <td className="p-3">{(u.roles ?? []).map((r: string) => <span key={r} className="mr-1 rounded bg-muted px-2 py-0.5 text-xs">{r}</span>)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button disabled={m.isPending} onClick={() => m.mutate({ userId: u.id, role: "admin", grant: !isAdmin })} className="rounded-md border border-border px-3 py-1 text-xs font-semibold hover:bg-muted">
                        {isAdmin ? "Revoke admin" : "Make admin"}
                      </button>
                      <button disabled={m.isPending} onClick={() => m.mutate({ userId: u.id, role: "agent", grant: !isAgent })} className="rounded-md border border-border px-3 py-1 text-xs font-semibold hover:bg-muted">
                        {isAgent ? "Revoke agent" : "Make agent"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
