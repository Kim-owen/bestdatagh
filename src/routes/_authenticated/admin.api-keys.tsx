import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListApiKeys, adminToggleApiKey, adminDeleteApiKey, adminGenerateApiKeyForUser } from "@/lib/admin.functions";
import { useState } from "react";
import { KeyRound, Plus, Trash2, CheckCircle2, XCircle, Copy, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/api-keys")({ component: KeysPage });

function KeysPage() {
  const list = useServerFn(adminListApiKeys);
  const toggleKey = useServerFn(adminToggleApiKey);
  const deleteKey = useServerFn(adminDeleteApiKey);
  const generateKey = useServerFn(adminGenerateApiKeyForUser);
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [keyLabel, setKeyLabel] = useState("");
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["adminApiKeys"], queryFn: () => list() });

  const toggleMutation = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggleKey({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminApiKeys"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteKey({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminApiKeys"] }),
  });

  const generateMutation = useMutation({
    mutationFn: () => generateKey({ data: { userId: targetUserId, label: keyLabel || "Admin Key" } }),
    onSuccess: (res) => {
      setNewRawKey(res.rawKey);
      qc.invalidateQueries({ queryKey: ["adminApiKeys"] });
    },
  });

  const copyRawKey = () => {
    if (newRawKey) {
      navigator.clipboard.writeText(newRawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" /> Reseller API Keys Management
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage developer API keys, toggle active states, or issue new reseller credentials.
          </p>
        </div>

        <button
          onClick={() => {
            setModalOpen(true);
            setNewRawKey(null);
          }}
          className="self-start sm:self-auto flex items-center gap-2 rounded-2xl gold-gradient px-4 py-2.5 text-xs font-black text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" /> Issue New API Key
        </button>
      </div>

      {/* API Keys Table */}
      <div className="overflow-x-auto rounded-3xl border border-border/80 bg-card shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-black tracking-wider">
            <tr>
              <th className="p-3.5">User ID</th>
              <th className="p-3.5">Label</th>
              <th className="p-3.5">Key Prefix</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Last Used</th>
              <th className="p-3.5">Created</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading && (
              <tr>
                <td className="p-8 text-center text-muted-foreground" colSpan={7}>
                  Loading API keys…
                </td>
              </tr>
            )}
            {!isLoading && (data ?? []).length === 0 && (
              <tr>
                <td className="p-8 text-center text-muted-foreground" colSpan={7}>
                  No reseller API keys generated yet.
                </td>
              </tr>
            )}
            {(data ?? []).map((k: any) => (
              <tr key={k.id} className="hover:bg-muted/40 transition-colors">
                <td className="p-3.5 font-mono text-[11px] font-bold text-foreground">
                  {k.user_id.slice(0, 12)}…
                </td>
                <td className="p-3.5 font-extrabold text-foreground">{k.label}</td>
                <td className="p-3.5 font-mono text-[11px] font-bold text-primary">{k.key_prefix}…</td>
                <td className="p-3.5">
                  <button
                    onClick={() => toggleMutation.mutate({ id: k.id, active: !k.active })}
                    disabled={toggleMutation.isPending}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                      k.active
                        ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {k.active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {k.active ? "Active" : "Revoked"}
                  </button>
                </td>
                <td className="p-3.5 text-[11px] text-muted-foreground font-medium">
                  {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}
                </td>
                <td className="p-3.5 text-[11px] text-muted-foreground font-medium">
                  {new Date(k.created_at).toLocaleDateString()}
                </td>
                <td className="p-3.5 text-right">
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this API key?")) {
                        deleteMutation.mutate(k.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Generate API Key Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-black font-display tracking-tight flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Issue API Key
            </h2>

            {!newRawKey ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-foreground block mb-1">Target User ID</label>
                  <input
                    type="text"
                    placeholder="Enter Supabase User ID (UUID)…"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Key Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Production Web Hook Key"
                    value={keyLabel}
                    onChange={(e) => setKeyLabel(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-border hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => generateMutation.mutate()}
                    disabled={!targetUserId || generateMutation.isPending}
                    className="px-4 py-2 rounded-xl gold-gradient text-xs font-black text-primary-foreground shadow-md"
                  >
                    {generateMutation.isPending ? "Generating…" : "Generate Key"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-500 font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> API Key Generated Successfully!
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Copy this key now. It will <strong>never be displayed again</strong>!
                </p>

                <div className="relative">
                  <pre className="overflow-x-auto rounded-xl border border-border bg-background p-3 text-xs font-mono font-bold text-foreground break-all">
                    <code>{newRawKey}</code>
                  </pre>
                  <button
                    onClick={copyRawKey}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl gold-gradient px-4 py-2 text-xs font-black text-primary-foreground"
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied to Clipboard!" : "Copy API Key"}
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-border text-xs font-bold hover:bg-muted"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
