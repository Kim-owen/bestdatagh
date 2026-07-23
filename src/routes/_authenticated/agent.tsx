import React, { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getAgentDashboard, listMyWithdrawals, requestWithdrawal } from "@/lib/agent.functions";
import { getMyProfile } from "@/lib/profile.functions";
import {
  ArrowLeft, TrendingUp, Wallet, Clock, Package, Store, ExternalLink, Users,
  BanknoteIcon, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight,
  ShieldCheck, Sparkles, ArrowUpRight, DollarSign, BarChart3, RefreshCw
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { WithdrawalAuditLog } from "@/components/site/WithdrawalAuditLog";
import { WalletTopUpModal } from "@/components/site/WalletModal";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/agent")({
  head: () => ({
    meta: [
      { title: "Agent Dashboard — Bestdata" },
      { name: "description", content: "Track your agent storefront performance, orders, commissions, and payout requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgentDashboard,
});

type Data = Awaited<ReturnType<typeof getAgentDashboard>>;
type Withdrawal = {
  id: string; amount_ghs: number | string; method: string; destination: string; notes: string | null;
  status: "pending"|"approved"|"paid"|"rejected"; admin_note: string | null; processed_at: string | null; created_at: string;
};

function AgentDashboard() {
  const nav = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  async function refresh() {
    const [d, w] = await Promise.all([getAgentDashboard(), listMyWithdrawals()]);
    setData(d);
    setWithdrawals(w as any);
  }

  useEffect(() => {
    (async () => {
      try {
        const prof = await getMyProfile();
        const roles = prof.roles ?? [];
        if (!roles.includes("agent") && !roles.includes("admin")) { nav({ to: "/agents" }); return; }
        await refresh();
      } catch (e: any) {
        setError(e?.message ?? "Failed to load agent dashboard");
      } finally { setLoading(false); }
    })();
  }, [nav]);

  const totals = useMemo(() => {
    const paid = withdrawals.filter(w => w.status === "paid").reduce((s, w) => s + Number(w.amount_ghs), 0);
    const pendingReq = withdrawals.filter(w => w.status === "pending" || w.status === "approved").reduce((s, w) => s + Number(w.amount_ghs), 0);
    const earned = data?.stats.commissionEarned ?? 0;
    const available = Math.max(0, earned - paid - pendingReq);
    return { paid, pendingReq, available };
  }, [withdrawals, data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary animate-spin">
          <Loader2 className="h-6 w-6" />
        </div>
        <span className="text-xs font-bold text-muted-foreground">Loading Agent Workspace…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center gap-3">
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-center max-w-md">
          <XCircle className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="text-base font-extrabold text-destructive mt-3">Access Error</h2>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <Link to="/agents" className="mt-4 inline-flex rounded-xl gold-gradient px-4 py-2 text-xs font-bold text-primary-foreground">
            Apply for Agent Access
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const s = data.stats;
  const chartData = [...data.monthly].reverse().map(m => ({ ...m, label: formatMonthShort(m.month) }));

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background Ambient Spheres / Dynamic Media Theme */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute bottom-1/3 left-10 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <Header />

      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 md:py-14 space-y-10 relative z-10">
        {/* Top Agent Banner */}
        <div className="rounded-3xl border border-border/80 bg-card/80 p-6 md:p-8 backdrop-blur-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-black text-emerald-500">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified Agent
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-black text-primary">
                ⚡ {data.rate}% Wholesale Commission
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black font-display tracking-tight">Agent Dashboard & Analytics</h1>
            <p className="text-xs font-semibold text-muted-foreground">
              Track real-time bundle sales, earnings, withdrawal requests, and storefront operations.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setWalletModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs font-black text-black shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <Wallet className="h-4 w-4" /> Top Up Wallet
            </button>
            <Link
              to="/agents"
              className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-background px-4 py-2.5 text-xs font-extrabold hover:bg-muted active:scale-95 transition-all shadow-sm"
            >
              <Store className="h-4 w-4 text-primary" /> Public Storefront
            </Link>
            <Link
              to="/bulk"
              className="inline-flex items-center gap-2 rounded-2xl gold-gradient px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-[0_4px_16px_-2px_hsl(243_85%_62%_/_0.5)] hover:scale-105 active:scale-95 transition-all"
            >
              <Users className="h-4 w-4" /> Bulk Resell Tool
            </Link>
          </div>
        </div>

        {/* Storefront Link Sharing & Media Customization Suite */}
        <AgentShareAndBrandingSuite />

        {/* Hero Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            icon={Wallet}
            label="Total Commission Earned"
            value={`GH₵ ${s.commissionEarned.toFixed(2)}`}
            sub={`Available: GH₵ ${totals.available.toFixed(2)}`}
            tone="gold"
          />
          <StatCard
            icon={Clock}
            label="Pending Commission"
            value={`GH₵ ${s.commissionPending.toFixed(2)}`}
            sub="Awaiting order delivery"
            tone="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="Delivered Sales Revenue"
            value={`GH₵ ${s.revenue.toFixed(2)}`}
            sub="Gross volume"
            tone="emerald"
          />
          <StatCard
            icon={Package}
            label="Orders Delivered"
            value={`${s.deliveredOrders} / ${s.totalOrders}`}
            sub={`${s.pendingOrders} in progress`}
            tone="indigo"
          />
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Commission Earnings Trend" subtitle="Last 6 months performance">
            {chartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gCom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(243, 85%, 62%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(243, 85%, 62%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontWeight: 700 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`GH₵ ${Number(v).toFixed(2)}`, "Commission"]} />
                  <Area type="monotone" dataKey="commission" stroke="hsl(243, 85%, 62%)" strokeWidth={3} fill="url(#gCom)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Monthly Sales & Orders" subtitle="Volume vs Gross Revenue (GH₵)">
            {chartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontWeight: 700 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontWeight: 700 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Bar dataKey="orders" name="Orders" fill="hsl(243, 85%, 62%)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="revenue" name="Revenue (GH₵)" fill="hsl(160, 84%, 39%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Withdrawals Hub */}
        <WithdrawalSection
          available={totals.available}
          paid={totals.paid}
          pendingReq={totals.pendingReq}
          withdrawals={withdrawals}
          onSubmitted={refresh}
        />

        {/* Monthly Table */}
        <section className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
            <div>
              <h2 className="text-base font-extrabold font-display">Monthly Performance Breakdown</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Historical commission and revenue records</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              Last 6 Months
            </span>
          </div>

          {data.monthly.length === 0 ? (
            <EmptyRow text="No delivered orders recorded yet — share your agent link or buy in bulk." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="text-left px-6 py-3.5">Month</th>
                    <th className="text-right px-6 py-3.5">Delivered Orders</th>
                    <th className="text-right px-6 py-3.5">Total Revenue</th>
                    <th className="text-right px-6 py-3.5">Commission Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data.monthly.map((m) => (
                    <tr key={m.month} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-bold">{formatMonth(m.month)}</td>
                      <td className="px-6 py-4 text-right font-extrabold">{m.orders}</td>
                      <td className="px-6 py-4 text-right font-extrabold">GH₵ {m.revenue.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-black text-emerald-500 font-display">GH₵ {m.commission.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent Orders */}
        <section className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
            <div>
              <h2 className="text-base font-extrabold font-display">Recent Agent Orders</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Live order dispatches & customer references</p>
            </div>
            <Link to="/track-order" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              Track Order Status <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.recentOrders.length === 0 ? (
            <EmptyRow text="No orders recorded yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="text-left px-6 py-3.5">Order Ref</th>
                    <th className="text-left px-6 py-3.5">Date & Time</th>
                    <th className="text-left px-6 py-3.5">Items Count</th>
                    <th className="text-left px-6 py-3.5">Dispatch Status</th>
                    <th className="text-right px-6 py-3.5">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data.recentOrders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-primary">{o.reference}</td>
                      <td className="px-6 py-4 text-muted-foreground font-semibold">
                        {new Date(o.created_at).toLocaleDateString()} {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 font-bold">{o.order_items?.length ?? 0} pkg</td>
                      <td className="px-6 py-4"><StatusPill status={o.status} /></td>
                      <td className="px-6 py-4 text-right font-black font-display">GH₵ {Number(o.total_ghs).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <WalletTopUpModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />

      <Footer />
    </div>
  );
}

/* ============ Payout / Withdrawal Section ============ */
function WithdrawalSection({
  available, paid, pendingReq, withdrawals, onSubmitted
}: {
  available: number; paid: number; pendingReq: number; withdrawals: Withdrawal[]; onSubmitted: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("MTN MoMo");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok"|"err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      await requestWithdrawal({ data: { amount_ghs: Number(amount), method, destination, notes } });
      setMsg({ type: "ok", text: "Payout request submitted! Processing typically completes within 24 hours." });
      setAmount("");
      setDestination("");
      setNotes("");
      await onSubmitted();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Failed to submit payout request." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
      {/* Payout Table Card */}
      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
            <h2 className="text-base font-extrabold flex items-center gap-2 font-display">
              <BanknoteIcon className="h-5 w-5 text-emerald-500" /> Payout Requests & History
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              {withdrawals.length} Records
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 p-5 border-b border-border/40 bg-card/50">
            <MiniStat label="Available Balance" value={`GH₵ ${available.toFixed(2)}`} tone="emerald" />
            <MiniStat label="Under Review" value={`GH₵ ${pendingReq.toFixed(2)}`} tone="amber" />
            <MiniStat label="Total Paid Out" value={`GH₵ ${paid.toFixed(2)}`} tone="primary" />
          </div>

          {withdrawals.length === 0 ? (
            <EmptyRow text="No payout requests submitted yet." />
          ) : (
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground sticky top-0 border-b border-border/40">
                  <tr>
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">Method</th>
                    <th className="text-left px-5 py-3">Destination</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-right px-5 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {withdrawals.map((w) => {
                    const isOpen = expanded === w.id;
                    return (
                      <React.Fragment key={w.id}>
                        <tr
                          className="hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => setExpanded(isOpen ? null : w.id)}
                        >
                          <td className="px-5 py-3.5 text-muted-foreground font-bold whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              {new Date(w.created_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-bold">{w.method}</td>
                          <td className="px-5 py-3.5 font-mono text-xs">{w.destination}</td>
                          <td className="px-5 py-3.5">
                            <PayoutStatus status={w.status} />
                            {w.admin_note && <div className="mt-1 text-[11px] text-muted-foreground max-w-[200px] truncate">Note: {w.admin_note}</div>}
                          </td>
                          <td className="px-5 py-3.5 text-right font-black font-display">GH₵ {Number(w.amount_ghs).toFixed(2)}</td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-muted/20">
                            <td colSpan={5} className="p-4">
                              <WithdrawalAuditLog withdrawalId={w.id} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payout Request Form */}
      <form onSubmit={submit} className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 space-y-5 shadow-lg h-fit backdrop-blur-xl">
        <div>
          <h3 className="text-lg font-black font-display">Request Commission Payout</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Min. GH₵ 10.00 · Available to withdraw: <span className="font-extrabold text-emerald-500">GH₵ {available.toFixed(2)}</span>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5">Withdrawal Amount (GH₵)</label>
            <input
              type="number"
              min="10"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-xs font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="100.00"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5">Payout Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-xs font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-all"
            >
              <option>MTN MoMo</option>
              <option>Telecel Cash</option>
              <option>AirtelTigo Money (AT)</option>
              <option>Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5">Destination Phone / Account Number</label>
            <input
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-xs font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="024 123 4567"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5">Optional Notes / Reference</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-xs font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="Add any specific payout instructions..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || available < 10}
          className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient px-4 py-3.5 text-xs font-extrabold text-primary-foreground shadow-[0_4px_16px_-2px_hsl(243_85%_62%_/_0.5)] hover:scale-[1.01] active:scale-[.98] disabled:opacity-60 transition-all"
        >
          {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Submitting Request…</>) : (<>Submit Payout Request</>)}
        </button>

        {msg && (
          <div className={`text-xs rounded-2xl p-3.5 font-bold flex items-center gap-2 ${
            msg.type === "ok" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}>
            {msg.type === "ok" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}
      </form>
    </section>
  );
}

/* ============ Helper Components ============ */
const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  fontSize: "12px",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
};

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
        <div>
          <h3 className="text-base font-extrabold font-display">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[280px] grid place-items-center text-xs font-semibold text-muted-foreground">
      No sales records available yet.
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "emerald"|"amber"|"primary" }) {
  const toneMap = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    primary: "border-primary/30 bg-primary/10 text-primary",
  };

  return (
    <div className={`rounded-2xl border p-3.5 transition-all ${toneMap[tone ?? "primary"]}`}>
      <div className="text-[10px] font-black uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 text-base font-black font-display">{value}</div>
    </div>
  );
}

function PayoutStatus({ status }: { status: Withdrawal["status"] }) {
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    pending:  { cls: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: Clock, label: "Pending" },
    approved: { cls: "bg-blue-500/15 text-blue-500 border-blue-500/30", icon: CheckCircle2, label: "Approved" },
    paid:     { cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: CheckCircle2, label: "Paid" },
    rejected: { cls: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle, label: "Rejected" },
  };
  const m = map[status];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${m.cls}`}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}

function StatCard({
  icon: Icon, label, value, sub, tone
}: {
  icon: any; label: string; value: string; sub?: string; tone?: "gold"|"blue"|"emerald"|"indigo"
}) {
  const tones = {
    gold: "border-amber-500/30 bg-amber-500/5 text-amber-500",
    blue: "border-blue-500/30 bg-blue-500/5 text-blue-500",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-500",
    indigo: "border-primary/30 bg-primary/5 text-primary",
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-sm hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className={`grid h-10 w-10 place-items-center rounded-2xl border ${tones[tone ?? "indigo"]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 text-3xl font-black tracking-tight font-display text-foreground">{value}</div>
      {sub && <div className="mt-1.5 text-xs font-semibold text-muted-foreground">{sub}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    delivered: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    processing: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    failed: "bg-destructive/15 text-destructive border-destructive/30",
    refunded: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider capitalize ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-6 py-10 text-center text-xs font-bold text-muted-foreground">{text}</div>;
}

/* ============ Storefront Sharing & Custom Video Theme Suite ============ */
import { Share2, Copy, Check, QrCode, Video, Sliders, MessageSquare } from "lucide-react";

function AgentShareAndBrandingSuite() {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [activeMediaTheme, setActiveMediaTheme] = useState("cyber-gold");
  const [customNotice, setCustomNotice] = useState("⚡ Welcome to my official Bestdata agent store! Enjoy discounted MTN, Telecel & AT bundles delivered instantly.");
  const [savedNotice, setSavedNotice] = useState(false);

  const rawUrl = typeof window !== "undefined" ? `${window.location.origin}/agents` : "https://bestdata.gh/agents";
  const shareUrl = `${rawUrl}?store=agent-pro`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(`Buy cheap MTN, Telecel & AirtelTigo data bundles directly from my official Bestdata agent store! ⚡ Fast delivery.\n\n👇 Click here to order:\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function handleSaveNotice(e: React.FormEvent) {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Unique Storefront Link & Social Suite */}
      <div className="lg:col-span-7 rounded-3xl border border-border/80 bg-card p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[11px] font-black text-primary uppercase tracking-wider">
              <Share2 className="h-3.5 w-3.5" /> Unique Storefront Link
            </div>
            <h2 className="text-xl font-black font-display tracking-tight mt-2">Share Your Reseller Link</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Share your custom link with customers on WhatsApp, TikTok, Instagram or in your shop to earn up to 10% on every order.
            </p>
          </div>

          <button
            onClick={() => setShowQR(!showQR)}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-2xl border border-border/80 bg-muted/30 px-3.5 py-2 text-xs font-extrabold hover:bg-muted transition-all"
          >
            <QrCode className="h-4 w-4 text-primary" /> {showQR ? "Hide QR" : "Show QR Code"}
          </button>
        </div>

        {/* Copy Bar */}
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/80 p-2 shadow-inner">
          <input
            readOnly
            value={shareUrl}
            className="w-full bg-transparent px-3 text-xs font-mono font-bold text-foreground outline-none select-all"
          />
          <button
            onClick={copyLink}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl gold-gradient px-4 py-2 text-xs font-extrabold text-primary-foreground hover:scale-105 active:scale-95 transition-all"
          >
            {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Link</>}
          </button>
        </div>

        {/* Social Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={shareWhatsApp}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-xs font-extrabold text-emerald-500 hover:bg-emerald-500/25 transition-all"
            >
              <MessageSquare className="h-4 w-4" /> Share on WhatsApp
            </button>
            <button
              onClick={() => setShowQR(!showQR)}
              className="sm:hidden inline-flex items-center gap-1.5 rounded-2xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs font-extrabold"
            >
              <QrCode className="h-4 w-4 text-primary" /> QR Code
            </button>
          </div>

          <span className="text-[11px] font-bold text-muted-foreground">
            ⚡ Directs customers straight to your reseller portal
          </span>
        </div>

        {/* QR Code Visual Overlay */}
        {showQR && (
          <div className="rounded-2xl border border-border bg-muted/30 p-5 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto grid h-36 w-36 place-items-center rounded-2xl border border-primary/40 bg-white p-3 shadow-md">
              {/* SVG QR Code Simulation */}
              <div className="grid grid-cols-5 gap-1.5 w-full h-full p-1 bg-black rounded-lg">
                <div className="bg-white rounded-sm col-span-2 row-span-2" />
                <div className="bg-white rounded-sm col-start-4 col-span-2 row-span-2" />
                <div className="bg-white rounded-sm row-start-4 col-span-2 row-span-2" />
                <div className="bg-white rounded-sm col-start-3 row-start-3" />
                <div className="bg-white rounded-sm col-start-5 row-start-5" />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-extrabold font-display">Scan QR Code to Open Storefront</h4>
              <p className="text-[11px] text-muted-foreground">Print or display in your shop for walk-in customers.</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Storefront Background Video & Custom Branding Theme */}
      <div className="lg:col-span-5 rounded-3xl border border-border/80 bg-card p-6 md:p-8 space-y-5 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-black text-emerald-500 uppercase tracking-wider">
            <Video className="h-3.5 w-3.5" /> Media Reel Theme
          </div>
          <h2 className="text-xl font-black font-display tracking-tight mt-2">Background Media Reel</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select the hero background theme shown to customers on your storefront.
          </p>
        </div>

        {/* Theme Picker */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "cyber-gold", label: "Cyber Gold", color: "bg-gradient-to-br from-amber-500/20 to-primary/20" },
            { id: "ghana-glow", label: "Ghana Glow", color: "bg-gradient-to-br from-red-500/20 via-amber-500/20 to-emerald-500/20" },
            { id: "matrix-stream", label: "Matrix Reel", color: "bg-gradient-to-br from-emerald-500/20 to-teal-500/20" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveMediaTheme(t.id)}
              className={`rounded-2xl border p-3 text-left transition-all ${
                activeMediaTheme === t.id
                  ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/30"
                  : "border-border/80 bg-background/50 hover:bg-muted/40"
              }`}
            >
              <div className={`h-8 w-full rounded-xl ${t.color} border border-white/20 mb-2`} />
              <div className="text-[11px] font-extrabold">{t.label}</div>
            </button>
          ))}
        </div>

        {/* Custom Notice Form */}
        <form onSubmit={handleSaveNotice} className="space-y-3 pt-2">
          <label className="block text-xs font-bold">Storefront Banner Announcement</label>
          <textarea
            value={customNotice}
            onChange={(e) => setCustomNotice(e.target.value)}
            rows={2}
            className="w-full rounded-2xl border border-border/80 bg-background/80 px-4 py-2.5 text-xs font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-all"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-extrabold hover:bg-muted transition-all"
          >
            {savedNotice ? <><Check className="h-4 w-4 text-emerald-500" /> Saved Banner!</> : <><Sliders className="h-4 w-4 text-primary" /> Lock In Custom Branding</>}
          </button>
        </form>
      </div>
    </div>
  );
}

function formatMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function formatMonthShort(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
}


