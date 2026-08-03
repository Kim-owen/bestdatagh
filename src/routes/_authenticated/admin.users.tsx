import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { adminListUsers, adminSetRole, adminResetUserPassword } from "@/lib/admin.functions";
import {
  Users,
  Search,
  KeyRound,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const listUsersFn = useServerFn(adminListUsers);
  const setRoleFn = useServerFn(adminSetRole);
  const resetPasswordFn = useServerFn(adminResetUserPassword);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [resetModalUser, setResetModalUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState("");
  const [resetErrorMsg, setResetErrorMsg] = useState("");

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => listUsersFn(),
  });

  const roleMutation = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "agent" | "user"; grant: boolean }) =>
      setRoleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminUsers"] }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, pass }: { userId: string; pass: string }) => {
      setResetSuccessMsg("");
      setResetErrorMsg("");
      return resetPasswordFn({ data: { userId, newPassword: pass } });
    },
    onSuccess: (res) => {
      setResetSuccessMsg(res?.message || "Password updated successfully!");
      setNewPassword("");
      setTimeout(() => {
        setResetSuccessMsg("");
        setResetModalUser(null);
      }, 1800);
    },
    onError: (err: any) => {
      setResetErrorMsg(err.message || "Failed to reset password");
    },
  });

  const usersList = data ?? [];

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return usersList;
    const q = search.toLowerCase().trim();
    return usersList.filter(
      (u: any) =>
        (u.email || "").toLowerCase().includes(q) ||
        (u.display_name || "").toLowerCase().includes(q) ||
        (u.id || "").toLowerCase().includes(q)
    );
  }, [usersList, search]);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let res = "";
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(res);
    setShowPassword(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary mb-1">
            <Users className="h-4 w-4" /> User Management & Security
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-foreground tracking-tight">
            User Accounts ({usersList.length})
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage roles, view profiles, and perform administrative password resets.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Refresh List
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by email, name, or User ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-border bg-card pl-10 pr-4 py-3 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-3xl border border-border/80 bg-card shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-black uppercase tracking-wider">
            <tr>
              <th className="p-4">User Info</th>
              <th className="p-4">Roles</th>
              <th className="p-4">Joined Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground font-medium">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                  Loading user directory…
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground font-medium">
                  No matching users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u: any) => {
                const isAdmin = (u.roles ?? []).includes("admin");
                const isAgent = (u.roles ?? []).includes("agent");

                return (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-foreground">{u.email || "No Email"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {u.display_name ? u.display_name : "Unnamed Profile"} ·{" "}
                        <span className="font-mono text-[10px] text-muted-foreground/70">{u.id}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(u.roles ?? []).length === 0 ? (
                          <span className="rounded-lg bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                            User
                          </span>
                        ) : (
                          (u.roles ?? []).map((r: string) => (
                            <span
                              key={r}
                              className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                                r === "admin"
                                  ? "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                                  : r === "agent"
                                  ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {r}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-muted-foreground font-mono text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Admin Password Reset Button */}
                        <button
                          onClick={() => {
                            setResetModalUser(u);
                            setNewPassword("");
                            setResetSuccessMsg("");
                            setResetErrorMsg("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-extrabold text-primary hover:bg-primary/20 transition-all"
                          title="Reset user password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>Reset Password</span>
                        </button>

                        {/* Toggle Admin Role */}
                        <button
                          disabled={roleMutation.isPending}
                          onClick={() =>
                            roleMutation.mutate({ userId: u.id, role: "admin", grant: !isAdmin })
                          }
                          className={`rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-all ${
                            isAdmin
                              ? "border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                              : "border-border bg-background hover:bg-muted text-foreground"
                          }`}
                        >
                          {isAdmin ? "Revoke Admin" : "Make Admin"}
                        </button>

                        {/* Toggle Agent Role */}
                        <button
                          disabled={roleMutation.isPending}
                          onClick={() =>
                            roleMutation.mutate({ userId: u.id, role: "agent", grant: !isAgent })
                          }
                          className={`rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-all ${
                            isAgent
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                              : "border-border bg-background hover:bg-muted text-foreground"
                          }`}
                        >
                          {isAgent ? "Revoke Agent" : "Make Agent"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Admin Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-2xl space-y-5">
            <button
              onClick={() => setResetModalUser(null)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="h-10 w-10 rounded-2xl bg-primary/15 border border-primary/30 grid place-items-center text-primary shadow-md">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black font-display tracking-tight text-foreground">
                  Reset Password
                </h2>
                <p className="text-xs text-muted-foreground">
                  Set a new password for <span className="font-bold text-foreground">{resetModalUser.email}</span>
                </p>
              </div>
            </div>

            {resetSuccessMsg ? (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center space-y-2 text-emerald-400">
                <CheckCircle2 className="h-8 w-8 mx-auto" />
                <div className="text-sm font-black">{resetSuccessMsg}</div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newPassword.length < 6) return;
                  resetPasswordMutation.mutate({ userId: resetModalUser.id, pass: newPassword });
                }}
                className="space-y-4"
              >
                {resetErrorMsg && (
                  <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-3 flex items-center gap-2 text-xs font-bold text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{resetErrorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <label>New Password</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-extrabold text-primary hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" /> Generate Strong Password
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                      required
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-400 font-bold flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>
                    This overrides the user's current password immediately using Supabase Service Role Admin auth.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-xs font-bold text-foreground hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetPasswordMutation.isPending || newPassword.length < 6}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl gold-gradient py-3 text-xs font-black text-primary-foreground shadow-lg hover:scale-[1.01] active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {resetPasswordMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving Password…
                      </>
                    ) : (
                      "Confirm & Update Password"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
