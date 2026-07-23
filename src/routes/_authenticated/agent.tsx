import React, { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getAgentDashboard, listMyWithdrawals, requestWithdrawal, sweepCommissionToWallet } from "@/lib/agent.functions";
import { getMyProfile } from "@/lib/profile.functions";
import {
  ArrowLeft, TrendingUp, Wallet, Clock, Package, Store, ExternalLink, Users,
  BanknoteIcon, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight,
  ShieldCheck, Sparkles, ArrowUpRight, DollarSign, BarChart3, RefreshCw,
  Search, Filter, Zap, Server, Download, Printer, Receipt, Trophy, Star, UserPlus, Plus
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { WithdrawalAuditLog } from "@/components/site/WithdrawalAuditLog";
import { WalletTopUpModal } from "@/components/site/WalletModal";
import { AgentReceiptModal } from "@/components/site/AgentReceiptModal";
import { StatCardSkeleton, TableRowSkeleton } from "@/components/ui/skeleton";
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
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<any | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const filteredRecentOrders = useMemo(() => {
    if (!data?.recentOrders) return [];
    return data.recentOrders.filter((o: any) => {
      const item = (o.order_items && o.order_items[0]) || {};
      const matchesSearch =
        !orderSearch ||
        o.reference.toLowerCase().includes(orderSearch.toLowerCase()) ||
        (item.recipient_phone || "").includes(orderSearch);

      const net = (item.network || "").toLowerCase();
      const matchesNetwork =
        networkFilter === "all" ||
        (networkFilter === "mtn" && (net.includes("mtn") || net.includes("yello"))) ||
        (networkFilter === "telecel" && (net.includes("telecel") || net.includes("voda"))) ||
        (networkFilter === "airtel" && (net.includes("at") || net.includes("airtel") || net.includes("ishare") || net.includes("bigtime")));

      const matchesStatus = statusFilter === "all" || o.status === statusFilter;

      return matchesSearch && matchesNetwork && matchesStatus;
    });
  }, [data?.recentOrders, orderSearch, networkFilter, statusFilter]);

  const totals = useMemo(() => {
    const paid = withdrawals.filter((w) => w.status === "paid").reduce((s, w) => s + Number(w.amount_ghs), 0);
    const pendingReq = withdrawals.filter((w) => w.status === "pending" || w.status === "approved").reduce((s, w) => s + Number(w.amount_ghs), 0);
    const earned = data?.stats.commissionEarned ?? 0;
    const available = Math.max(0, earned - paid - pendingReq);
    return { paid, pendingReq, available };
  }, [withdrawals, data]);

  const tierInfo = useMemo(() => {
    const count = data?.stats.deliveredOrders ?? 0;
    if (count >= 500) return { name: "💎 Diamond Agent", color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30", target: 1000, margin: "12%" };
    if (count >= 150) return { name: "🥇 Gold VIP Agent", color: "text-amber-400 bg-amber-500/15 border-amber-500/30", target: 500, margin: "10%" };
    if (count >= 50) return { name: "🥈 Silver Agent", color: "text-slate-300 bg-slate-500/15 border-slate-500/30", target: 150, margin: "7%" };
    return { name: "🥉 Bronze Agent", color: "text-amber-600 bg-amber-600/15 border-amber-600/30", target: 50, margin: "5%" };
  }, [data?.stats.deliveredOrders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
        <Header />
        <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </main>
        <Footer />
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

  function exportCSV() {
    if (!filteredRecentOrders || filteredRecentOrders.length === 0) return;
    const headers = ["Reference", "Date", "Recipient Phone", "Network", "Package Size", "Total (GHS)", "Status"];
    const rows = filteredRecentOrders.map((o) => {
      const item = (o.order_items && o.order_items[0]) || {};
      return [
        `"${o.reference}"`,
        `"${new Date(o.created_at).toLocaleString()}"`,
        `"${item.recipient_phone || 'N/A'}"`,
        `"${item.network || 'MTN'}"`,
        `"${item.size_label || 'Data Package'}"`,
        `"${Number(o.total_ghs).toFixed(2)}"`,
        `"${o.status}"`,
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bestdata_agent_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background Ambient Spheres */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute bottom-1/3 left-10 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <Header />

      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 md:py-14 space-y-10 relative z-10">
        {/* Admin-style Top Agent Banner */}
        <div className="rounded-3xl border border-border/80 bg-card/80 p-6 md:p-8 backdrop-blur-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-black text-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                GATEWAY OPERATIONAL
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase ${tierInfo.color}`}>
                <Trophy className="h-3.5 w-3.5" /> {tierInfo.name} ({tierInfo.margin} Margin)
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black font-display tracking-tight">Agent Workspace & Operations</h1>
            <p className="text-xs font-semibold text-muted-foreground">
              Monitor customer purchases, wholesale margins, instant payouts, and store branding.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => refresh()}
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-extrabold hover:bg-muted active:scale-95 transition-all shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" /> Refresh Data
            </button>
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
              <Store className="h-4 w-4 text-primary" /> Storefront
            </Link>
            <Link
              to="/bulk"
              className="inline-flex items-center gap-2 rounded-2xl gold-gradient px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <Users className="h-4 w-4" /> Bulk Resell
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
            sub={`Available Payout: GH₵ ${totals.available.toFixed(2)}`}
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
            sub="Gross storefront volume"
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

        {/* Custom Retail Price Configurator */}
        <AgentCustomPriceConfigurator />

        {/* Saved Customer Directory (Mini-CRM) */}
        <CustomerDirectory />

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

        {/* Recent Orders with Search, Filters, CSV Export & Receipts */}
        <section className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xl space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
            <div>
              <h2 className="text-lg font-extrabold font-display flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" /> Live Customer Orders & Resells
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time order dispatches, receipts & export</p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-500 hover:bg-emerald-500/20 transition-all"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>

              {/* Network Filter */}
              <select
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value)}
                className="rounded-2xl border border-border/80 bg-background/80 px-3 py-2 text-xs font-bold outline-none focus:border-primary"
              >
                <option value="all">All Networks</option>
                <option value="mtn">MTN</option>
                <option value="telecel">Telecel</option>
                <option value="airtel">AirtelTigo</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-border/80 bg-background/80 px-3 py-2 text-xs font-bold outline-none focus:border-primary"
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search reference or phone..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full rounded-2xl border border-border/80 bg-background/80 pl-9 pr-4 py-2 text-xs font-semibold outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left px-5 py-3.5">Order Ref & Date</th>
                  <th className="text-left px-5 py-3.5">Recipient & Package</th>
                  <th className="text-left px-5 py-3.5">Items</th>
                  <th className="text-left px-5 py-3.5">Live Status</th>
                  <th className="text-right px-5 py-3.5">Total Amount</th>
                  <th className="text-center px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {filteredRecentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs font-bold text-muted-foreground">
                      No agent orders match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecentOrders.map((o: any) => {
                    const item = (o.order_items && o.order_items[0]) || {};
                    return (
                      <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-4 font-bold text-primary">
                          <div>{o.reference}</div>
                          <div className="text-[10px] text-muted-foreground font-sans mt-0.5">
                            {new Date(o.created_at).toLocaleDateString()} {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-sans">
                          <div className="font-bold text-foreground font-mono">{item.recipient_phone || "Store Order"}</div>
                          <div className="text-[11px] text-muted-foreground">{item.size_label || "Data Bundle"} · {item.network || "MTN"}</div>
                        </td>
                        <td className="px-5 py-4 font-bold font-sans">{o.order_items?.length ?? 1} package</td>
                        <td className="px-5 py-4 font-sans">
                          <StatusPill status={o.status} />
                        </td>
                        <td className="px-5 py-4 text-right font-black text-emerald-500 font-display">
                          GH₵ {Number(o.total_ghs).toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-center font-sans">
                          <button
                            onClick={() => setSelectedReceiptOrder(o)}
                            className="inline-flex items-center gap-1 rounded-xl bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-extrabold text-primary hover:bg-primary/20 transition-all"
                          >
                            <Receipt className="h-3 w-3" /> Receipt
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <AgentReceiptModal
        order={selectedReceiptOrder}
        isOpen={!!selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
        agentRate={data.rate}
      />

      <WalletTopUpModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />

      <Footer />
    </div>
  );
}

/* ============ Customer Directory Component (Mini-CRM) ============ */
function CustomerDirectory() {
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; phone: string; network: string }>>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("bestdata_agent_contacts");
      return saved ? JSON.parse(saved) : [
        { id: "1", name: "Ama Serwaa", phone: "0241234567", network: "MTN" },
        { id: "2", name: "Kwame Mensah", phone: "0509876543", network: "Telecel" },
      ];
    } catch {
      return [];
    }
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("MTN");

  function addContact(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone) return;
    const next = [...contacts, { id: String(Date.now()), name, phone, network }];
    setContacts(next);
    localStorage.setItem("bestdata_agent_contacts", JSON.stringify(next));
    setName("");
    setPhone("");
  }

  function removeContact(id: string) {
    const next = contacts.filter(c => c.id !== id);
    setContacts(next);
    localStorage.setItem("bestdata_agent_contacts", JSON.stringify(next));
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 space-y-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div>
          <h3 className="text-lg font-extrabold font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Saved Customer Directory (Mini-CRM)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Quick re-order data for frequent clients</p>
        </div>
        <span className="text-xs font-black bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
          {contacts.length} Saved Contacts
        </span>
      </div>

      <form onSubmit={addContact} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          required
          placeholder="Client Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-2xl border border-border/80 bg-background px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary"
        />
        <input
          required
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-2xl border border-border/80 bg-background px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary font-mono"
        />
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          className="rounded-2xl border border-border/80 bg-background px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary"
        >
          <option>MTN</option>
          <option>Telecel</option>
          <option>AirtelTigo</option>
        </select>
        <button
          type="submit"
          className="rounded-2xl gold-gradient px-4 py-2.5 text-xs font-black text-primary-foreground hover:scale-105 transition-all"
        >
          + Save Contact
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {contacts.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border/80 bg-background/50 p-3.5 flex items-center justify-between gap-2 hover:border-primary/50 transition-all">
            <div>
              <div className="font-extrabold text-xs text-foreground">{c.name}</div>
              <div className="text-[11px] font-mono text-muted-foreground">{c.phone} · <span className="text-primary font-bold">{c.network}</span></div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                to="/bulk"
                className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-extrabold text-emerald-500 hover:bg-emerald-500/30 transition-all"
              >
                Send Data
              </Link>
              <button
                onClick={() => removeContact(c.id)}
                className="rounded-xl p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
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
  const [sweeping, setSweeping] = useState(false);
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

  async function handleSweep() {
    if (!amount || Number(amount) < 1) {
      setMsg({ type: "err", text: "Enter a valid amount to sweep to your main wallet (Min GH₵ 1.00)." });
      return;
    }
    setSweeping(true);
    setMsg(null);
    try {
      const res = await sweepCommissionToWallet({ data: { amount_ghs: Number(amount) } });
      setMsg({ type: "ok", text: `Successfully swept GH₵ ${res.amount_ghs.toFixed(2)} to your main wallet balance!` });
      setAmount("");
      await onSubmitted();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Failed to sweep commission." });
    } finally {
      setSweeping(false);
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
              min="1"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={submitting || available < 10}
            className="flex items-center justify-center gap-2 rounded-2xl gold-gradient px-4 py-3 text-xs font-extrabold text-primary-foreground shadow-md hover:scale-[1.01] active:scale-[.98] disabled:opacity-60 transition-all"
          >
            {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Requesting...</>) : (<>MoMo Payout</>)}
          </button>

          <button
            type="button"
            onClick={handleSweep}
            disabled={sweeping || available < 1}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-4 py-3 text-xs font-black text-black shadow-md hover:scale-[1.01] active:scale-[.98] disabled:opacity-60 transition-all"
          >
            {sweeping ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sweeping...</>) : (<><Zap className="h-4 w-4" /> Sweep to Wallet (0 Fee)</>)}
          </button>
        </div>

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

/* ============ Agent Custom Price Configurator Component ============ */
function AgentCustomPriceConfigurator() {
  const [bundles, setBundles] = useState<any[]>([]);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("bestdata_agent_custom_prices");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { listActiveBundles } = await import("@/lib/public-bundles.functions");
        const b = await listActiveBundles();
        setBundles(b);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  function handlePriceChange(id: string, value: string) {
    const val = Number(value);
    setCustomPrices((prev) => ({ ...prev, [id]: val }));
  }

  function savePrices(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      localStorage.setItem("bestdata_agent_custom_prices", JSON.stringify(customPrices));
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-[10px] font-black uppercase text-amber-500">
            <DollarSign className="h-3.5 w-3.5" /> Retail Price Manager
          </div>
          <h3 className="text-xl font-black font-display tracking-tight mt-1">Set Your Storefront Customer Prices</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure custom selling prices for your public storefront. Your profit margin per sale is calculated automatically.
          </p>
        </div>

        <button
          onClick={savePrices}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-2xl gold-gradient px-5 py-2.5 text-xs font-black text-primary-foreground shadow-md hover:scale-105 transition-all"
        >
          {savedMsg ? <><Check className="h-4 w-4" /> Prices Saved!</> : <><Sliders className="h-4 w-4" /> Save Custom Prices</>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["MTN", "Telecel", "AirtelTigo"].map((net) => {
          const netBundles = bundles.filter((b) => b.network === net);
          return (
            <div key={net} className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="font-black text-xs uppercase tracking-wider text-foreground">{net} Packages</span>
                <span className="text-[10px] text-muted-foreground font-bold">{netBundles.length} Bundles</span>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {netBundles.map((b) => {
                  const wholesaleCost = Number(b.agent_price_ghs ?? (b.price_ghs * 0.95));
                  const defaultPrice = Number(b.price_ghs);
                  const currentPrice = Math.max(wholesaleCost, customPrices[b.id] ?? defaultPrice);
                  const profit = Math.max(0, currentPrice - wholesaleCost);

                  return (
                    <div key={b.id} className="rounded-xl border border-border/60 bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span>{b.size_label}</span>
                        <span className="text-[11px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          Admin Base: GH₵ {wholesaleCost.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">GH₵</span>
                          <input
                            type="number"
                            step="0.5"
                            min={wholesaleCost}
                            value={currentPrice}
                            onChange={(e) => handlePriceChange(b.id, e.target.value)}
                            className="w-full rounded-xl border border-border bg-background pl-11 pr-3 py-1.5 text-xs font-mono font-bold text-foreground outline-none focus:border-primary"
                          />
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-black text-emerald-500 font-mono">+GH₵ {profit.toFixed(2)}</div>
                          <div className="text-[9px] text-muted-foreground font-bold">Your Profit</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
