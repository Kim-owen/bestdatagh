import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  adminListUsers,
  adminGetUserDetails,
  adminSetRole,
  adminResetUserPassword,
  adminLockUserAccount,
  adminAdjustUserWallet,
  adminSendUserNotification,
} from "@/lib/admin.functions";
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
  Unlock,
  Wallet,
  Plus,
  Minus,
  Bell,
  MessageSquare,
  Send,
  FileText,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  ExternalLink,
  Phone,
  Mail,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const listUsersFn = useServerFn(adminListUsers);
  const getUserDetailsFn = useServerFn(adminGetUserDetails);
  const setRoleFn = useServerFn(adminSetRole);
  const resetPasswordFn = useServerFn(adminResetUserPassword);
  const lockAccountFn = useServerFn(adminLockUserAccount);
  const adjustWalletFn = useServerFn(adminAdjustUserWallet);
  const sendNotificationFn = useServerFn(adminSendUserNotification);

  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  // Modals state
  const [resetModalUser, setResetModalUser] = useState<any | null>(null);
  const [detailModalUserId, setDetailModalUserId] = useState<string | null>(null);
  const [adjustWalletUser, setAdjustWalletUser] = useState<any | null>(null);
  const [notifyModalUser, setNotifyModalUser] = useState<any | null>(null);

  // Form states
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustReason, setAdjustReason] = useState<string>("");

  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [sendSms, setSendSms] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: usersList, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => listUsersFn(),
  });

  const { data: userDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ["adminUserDetails", detailModalUserId],
    queryFn: () => getUserDetailsFn({ data: { userId: detailModalUserId! } }),
    enabled: !!detailModalUserId,
  });

  const roleMutation = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "agent" | "user"; grant: boolean }) =>
      setRoleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminUsers"] }),
  });

  const lockMutation = useMutation({
    mutationFn: (v: { userId: string; lock: boolean }) => lockAccountFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      if (detailModalUserId) qc.invalidateQueries({ queryKey: ["adminUserDetails", detailModalUserId] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, pass }: { userId: string; pass: string }) => {
      setSuccessMsg("");
      setErrorMsg("");
      return resetPasswordFn({ data: { userId, newPassword: pass } });
    },
    onSuccess: (res) => {
      setSuccessMsg(res?.message || "Password updated successfully!");
      setNewPassword("");
      setTimeout(() => {
        setSuccessMsg("");
        setResetModalUser(null);
      }, 1800);
    },
    onError: (err: any) => setErrorMsg(err.message || "Failed to reset password"),
  });

  const adjustWalletMutation = useMutation({
    mutationFn: async () => {
      setSuccessMsg("");
      setErrorMsg("");
      const amt = Number(adjustAmount);
      return adjustWalletFn({
        data: {
          userId: adjustWalletUser.id,
          amountGhs: amt,
          type: adjustType,
          reason: adjustReason,
        },
      });
    },
    onSuccess: (res) => {
      setSuccessMsg(`Wallet balance updated! New Balance: GH₵ ${res.newBalance.toFixed(2)}`);
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      if (detailModalUserId) qc.invalidateQueries({ queryKey: ["adminUserDetails", detailModalUserId] });
      setTimeout(() => {
        setSuccessMsg("");
        setAdjustWalletUser(null);
        setAdjustAmount("");
        setAdjustReason("");
      }, 1800);
    },
    onError: (err: any) => setErrorMsg(err.message || "Failed to adjust wallet balance"),
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      setSuccessMsg("");
      setErrorMsg("");
      return sendNotificationFn({
        data: {
          userId: notifyModalUser.id,
          title: notifyTitle,
          body: notifyBody,
          sendSms,
        },
      });
    },
    onSuccess: (res) => {
      setSuccessMsg(`Notification sent successfully! ${res.smsSent ? "(SMS Dispatched 📱)" : ""}`);
      setTimeout(() => {
        setSuccessMsg("");
        setNotifyModalUser(null);
        setNotifyTitle("");
        setNotifyBody("");
        setSendSms(false);
      }, 1800);
    },
    onError: (err: any) => setErrorMsg(err.message || "Failed to send notification"),
  });

  const users = usersList ?? [];

  const filteredUsers = useMemo(() => {
    return users.filter((u: any) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.display_name || "").toLowerCase().includes(q) ||
        (u.phone || "").includes(q) ||
        (u.id || "").toLowerCase().includes(q);

      const matchesRole =
        filterRole === "all" ||
        (filterRole === "admin" && u.roles?.includes("admin")) ||
        (filterRole === "agent" && u.roles?.includes("agent")) ||
        (filterRole === "locked" && u.is_locked);

      return matchesSearch && matchesRole;
    });
  }, [users, search, filterRole]);

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
      {/* Top Header & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary mb-1">
            <Users className="h-4 w-4" /> Comprehensive User Control Suite
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-foreground tracking-tight">
            User Accounts Directory ({users.length})
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View profiles, credit/debit balances, lock security states, and dispatch direct alerts.
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

      {/* Filter & Search Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by email, name, phone, or User ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card pl-10 pr-4 py-3 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {[
            { key: "all", label: "All Users" },
            { key: "agent", label: "Agents Only" },
            { key: "admin", label: "Admins Only" },
            { key: "locked", label: "Locked Accounts" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterRole(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                filterRole === tab.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-3xl border border-border/80 bg-card shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-black uppercase tracking-wider">
            <tr>
              <th className="p-4">User Details</th>
              <th className="p-4">Roles</th>
              <th className="p-4">Wallet Balance</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground font-medium">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                  Loading user directory…
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground font-medium">
                  No matching user accounts found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u: any) => {
                const isAdmin = (u.roles ?? []).includes("admin");
                const isAgent = (u.roles ?? []).includes("agent");

                return (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <span>{u.email || "No Email"}</span>
                        {u.phone && (
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                            {u.phone}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
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

                    <td className="p-4 font-mono font-black text-emerald-400">
                      GH₵ {Number(u.balance_ghs || 0).toFixed(2)}
                    </td>

                    <td className="p-4">
                      {u.is_locked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-[10px] font-black uppercase text-rose-400">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400">
                          <ShieldCheck className="h-3 w-3" /> Active
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end flex-wrap gap-1.5">
                        {/* Inspect Full Profile & Ledger */}
                        <button
                          onClick={() => setDetailModalUserId(u.id)}
                          className="p-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-all"
                          title="Inspect User Ledger & Stats"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Adjust Wallet Balance */}
                        <button
                          onClick={() => {
                            setAdjustWalletUser(u);
                            setAdjustAmount("");
                            setAdjustReason("");
                            setSuccessMsg("");
                            setErrorMsg("");
                          }}
                          className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                          title="Credit/Debit Wallet"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                        </button>

                        {/* Lock / Unlock Account */}
                        <button
                          disabled={lockMutation.isPending}
                          onClick={() => lockMutation.mutate({ userId: u.id, lock: !u.is_locked })}
                          className={`p-2 rounded-xl border transition-all ${
                            u.is_locked
                              ? "border-rose-500/40 bg-rose-500/20 text-rose-400"
                              : "border-border bg-background hover:bg-muted text-muted-foreground"
                          }`}
                          title={u.is_locked ? "Unlock User Account" : "Lock User Account"}
                        >
                          {u.is_locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        </button>

                        {/* Direct Notification & SMS */}
                        <button
                          onClick={() => {
                            setNotifyModalUser(u);
                            setNotifyTitle("");
                            setNotifyBody("");
                            setSuccessMsg("");
                            setErrorMsg("");
                          }}
                          className="p-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all"
                          title="Send Direct Push Notification / SMS"
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </button>

                        {/* Password Reset */}
                        <button
                          onClick={() => {
                            setResetModalUser(u);
                            setNewPassword("");
                            setSuccessMsg("");
                            setErrorMsg("");
                          }}
                          className="p-2 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                          title="Reset User Password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>

                        {/* Toggle Roles */}
                        <button
                          disabled={roleMutation.isPending}
                          onClick={() =>
                            roleMutation.mutate({ userId: u.id, role: "admin", grant: !isAdmin })
                          }
                          className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                            isAdmin
                              ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                              : "border-border bg-background hover:bg-muted text-foreground"
                          }`}
                        >
                          {isAdmin ? "-Admin" : "+Admin"}
                        </button>

                        <button
                          disabled={roleMutation.isPending}
                          onClick={() =>
                            roleMutation.mutate({ userId: u.id, role: "agent", grant: !isAgent })
                          }
                          className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                            isAgent
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                              : "border-border bg-background hover:bg-muted text-foreground"
                          }`}
                        >
                          {isAgent ? "-Agent" : "+Agent"}
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

      {/* 1. INSPECT USER DETAILS & LEDGER MODAL */}
      {detailModalUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-2xl space-y-6">
            <button
              onClick={() => setDetailModalUserId(null)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {loadingDetails ? (
              <div className="py-12 text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                Fetching full user ledger & activity stats…
              </div>
            ) : userDetails ? (
              <div className="space-y-6">
                {/* Header Profile Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
                  <div>
                    <h2 className="text-xl font-black font-display text-foreground flex items-center gap-2">
                      {userDetails.profile?.display_name || "User Profile"}
                      {userDetails.wallet?.is_locked && (
                        <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                          Locked
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono">{userDetails.profile?.email}</p>
                    {userDetails.profile?.phone && (
                      <p className="text-xs text-primary font-bold mt-0.5">Phone: {userDetails.profile.phone}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setAdjustWalletUser({ id: userDetails.profile?.id || detailModalUserId, email: userDetails.profile?.email });
                        setDetailModalUserId(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl gold-gradient px-3 py-2 text-xs font-black text-primary-foreground shadow-md"
                    >
                      <Wallet className="h-3.5 w-3.5" /> Adjust Balance
                    </button>
                  </div>
                </div>

                {/* Lifetime Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-border/80 bg-background p-4 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Wallet Balance
                    </span>
                    <div className="text-lg font-black text-emerald-400 font-mono">
                      GH₵ {Number(userDetails.wallet?.balance_ghs || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-background p-4 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Total Deposits LTV
                    </span>
                    <div className="text-lg font-black text-amber-400 font-mono">
                      GH₵ {userDetails.stats.totalDepositsGhs.toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-background p-4 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Total Bundle Spend
                    </span>
                    <div className="text-lg font-black text-sky-400 font-mono">
                      GH₵ {userDetails.stats.totalOrdersSpendGhs.toFixed(2)} ({userDetails.stats.totalOrdersCount} Orders)
                    </div>
                  </div>
                </div>

                {/* Store Settings if Agent */}
                {userDetails.storeSettings && (
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-1 text-xs">
                    <div className="font-extrabold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" /> Agent Storefront: {userDetails.storeSettings.store_name}
                    </div>
                    <div className="font-mono text-muted-foreground">
                      Slug: /store/{userDetails.storeSettings.slug}
                    </div>
                  </div>
                )}

                {/* Wallet Transactions Ledger */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-primary">
                    Recent Wallet Transactions ({userDetails.transactions.length})
                  </h3>
                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-border bg-background divide-y divide-border/50 text-xs">
                    {userDetails.transactions.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No wallet transactions logged.</div>
                    ) : (
                      userDetails.transactions.map((tx: any) => (
                        <div key={tx.id} className="p-3 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-foreground">{tx.description || tx.type}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{tx.reference} · {new Date(tx.created_at).toLocaleString()}</div>
                          </div>
                          <div className={`font-mono font-black ${Number(tx.amount_ghs) > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {Number(tx.amount_ghs) > 0 ? "+" : ""}GH₵ {Number(tx.amount_ghs).toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 2. MANUAL WALLET CREDIT / DEBIT MODAL */}
      {adjustWalletUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-2xl space-y-5">
            <button
              onClick={() => setAdjustWalletUser(null)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center text-emerald-400 shadow-md">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black font-display tracking-tight text-foreground">
                  Adjust Wallet Balance
                </h2>
                <p className="text-xs text-muted-foreground">
                  Manual Credit or Debit for <span className="font-bold text-foreground">{adjustWalletUser.email}</span>
                </p>
              </div>
            </div>

            {successMsg ? (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center space-y-2 text-emerald-400">
                <CheckCircle2 className="h-8 w-8 mx-auto" />
                <div className="text-sm font-black">{successMsg}</div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!adjustAmount || !adjustReason) return;
                  adjustWalletMutation.mutate();
                }}
                className="space-y-4"
              >
                {errorMsg && (
                  <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-3 flex items-center gap-2 text-xs font-bold text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("credit")}
                    className={`py-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                      adjustType === "credit"
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 ring-2 ring-emerald-500/30"
                        : "border-border/80 bg-background text-muted-foreground"
                    }`}
                  >
                    <Plus className="h-4 w-4" /> Credit (+)
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType("debit")}
                    className={`py-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                      adjustType === "debit"
                        ? "border-rose-500 bg-rose-500/15 text-rose-400 ring-2 ring-rose-500/30"
                        : "border-border/80 bg-background text-muted-foreground"
                    }`}
                  >
                    <Minus className="h-4 w-4" /> Debit (-)
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Adjustment Amount (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 50.00"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Audit Reason Note (Required)</label>
                  <input
                    type="text"
                    placeholder="e.g. Refund for failed order #BD-98124"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustWalletUser(null)}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-xs font-bold text-foreground hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustWalletMutation.isPending || !adjustAmount || !adjustReason}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl gold-gradient py-3 text-xs font-black text-primary-foreground shadow-lg hover:scale-[1.01] active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {adjustWalletMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Executing Adjustment…
                      </>
                    ) : (
                      "Confirm & Apply Adjustment"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3. DIRECT NOTIFICATION & SMS MODAL */}
      {notifyModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-2xl space-y-5">
            <button
              onClick={() => setNotifyModalUser(null)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 grid place-items-center text-amber-400 shadow-md">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black font-display tracking-tight text-foreground">
                  Send Direct Alert
                </h2>
                <p className="text-xs text-muted-foreground">
                  In-App Notification & optional SMS for <span className="font-bold text-foreground">{notifyModalUser.email}</span>
                </p>
              </div>
            </div>

            {successMsg ? (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center space-y-2 text-emerald-400">
                <CheckCircle2 className="h-8 w-8 mx-auto" />
                <div className="text-sm font-black">{successMsg}</div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!notifyTitle || !notifyBody) return;
                  sendNotificationMutation.mutate();
                }}
                className="space-y-4"
              >
                {errorMsg && (
                  <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-3 flex items-center gap-2 text-xs font-bold text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Notification Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Account Notice / Agent Update"
                    value={notifyTitle}
                    onChange={(e) => setNotifyTitle(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Message Body</label>
                  <textarea
                    rows={3}
                    placeholder="Enter notification message..."
                    value={notifyBody}
                    onChange={(e) => setNotifyBody(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    className="rounded h-4 w-4 accent-primary"
                  />
                  <span>Also dispatch SMS to user's phone ({notifyModalUser.phone || "No phone number"})</span>
                </label>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setNotifyModalUser(null)}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-xs font-bold text-foreground hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendNotificationMutation.isPending || !notifyTitle || !notifyBody}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl gold-gradient py-3 text-xs font-black text-primary-foreground shadow-lg hover:scale-[1.01] active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {sendNotificationMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Dispatching Alert…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Send Notification
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 4. ADMIN RESET PASSWORD MODAL */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
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

            {successMsg ? (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center space-y-2 text-emerald-400">
                <CheckCircle2 className="h-8 w-8 mx-auto" />
                <div className="text-sm font-black">{successMsg}</div>
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
                {errorMsg && (
                  <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-3 flex items-center gap-2 text-xs font-bold text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
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
