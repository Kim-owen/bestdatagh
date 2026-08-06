import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { adminSendBroadcastSms, adminTriggerWeAreLiveSms, adminSaveDailySmsSchedule } from "@/lib/admin.functions";
import { Send, MessageSquare, Users, CheckCircle2, AlertTriangle, Zap, Clock, Sparkles, ExternalLink, Phone, ShieldCheck, Check } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/broadcast")({
  component: AdminBroadcastPage,
});

const NOTIFICATION_TEMPLATES = [
  {
    id: "we_are_live",
    title: "🚀 We Are Live Announcement",
    badge: "Official Live",
    content: "🚀 WE ARE LIVE! Order instant MTN, Telecel & AT data bundles on BestData Ghana. Buy online: {site_url} | WhatsApp: {whatsapp_url} | Support: {support_phone}",
  },
  {
    id: "fast_delivery",
    title: "⚡ Instant Automated Delivery",
    badge: "Operational",
    content: "⚡ Automated Fast Delivery is ACTIVE for all data bundles! Top up agent wallet or order now: {site_url} | Support: {support_phone}",
  },
  {
    id: "agent_bonus",
    title: "📢 Reseller Agent Bonus Offer",
    badge: "Agent Special",
    content: "📢 ATTENTION AGENTS: Special bundle prices & wallet bonuses are active today! Order & top up here: {site_url}/agent | Support: {support_phone}",
  },
  {
    id: "maintenance",
    title: "⚠️ Provider Gateway Maintenance",
    badge: "Maintenance",
    content: "⚠️ BestData Notice: Provider gateway undergoing brief maintenance. Normal automated dispatch resumes shortly. Support: {support_phone}",
  },
  {
    id: "weekend_promo",
    title: "🎁 Weekend Special Discount",
    badge: "Promo",
    content: "🎁 Weekend Data Special: Cheap MTN & Telecel packages available now! Order online: {site_url} | Support: {support_phone}",
  },
];

function AdminBroadcastPage() {
  const sendBroadcast = useServerFn(adminSendBroadcastSms);
  const triggerWeAreLive = useServerFn(adminTriggerWeAreLiveSms);
  const saveSchedule = useServerFn(adminSaveDailySmsSchedule);

  const [audience, setAudience] = useState<"all" | "agents" | "custom">("agents");
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);

  // Links & Schedule Configuration State
  const [siteUrl, setSiteUrl] = useState("https://bestdatagh.shop");
  const [whatsappUrl, setWhatsappUrl] = useState("https://whatsapp.com/channel/0029Vb87LlELdQebZ0K7n51E");
  const [supportPhone, setSupportPhone] = useState("0551234567");
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [slot7amEnabled, setSlot7amEnabled] = useState(true);
  const [slot9amEnabled, setSlot9amEnabled] = useState(true);
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => sendBroadcast({ data: { audience, recipients, message } }),
    onSuccess: (res) => {
      setResult(res);
      setMessage("");
    },
  });

  const triggerLiveMut = useMutation({
    mutationFn: () => triggerWeAreLive({ data: { siteUrl, whatsappUrl, supportPhone, audience: audience === "custom" ? "agents" : audience } }),
    onSuccess: (res) => {
      setResult(res);
    },
  });

  const saveScheduleMut = useMutation({
    mutationFn: () =>
      saveSchedule({
        data: {
          enabled: scheduleEnabled,
          slot7am: slot7amEnabled,
          slot9am: slot9amEnabled,
          siteUrl,
          whatsappUrl,
          supportPhone,
          customTemplate: message || undefined,
        },
      }),
    onSuccess: (res) => {
      setScheduleNotice(res.message);
      setTimeout(() => setScheduleNotice(null), 5000);
    },
  });

  const applyTemplate = (tplContent: string) => {
    const formatted = tplContent
      .replace(/\{site_url\}/g, siteUrl)
      .replace(/\{whatsapp_url\}/g, whatsappUrl)
      .replace(/\{support_phone\}/g, supportPhone);
    setMessage(formatted);
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> SMS Broadcast & Announcement Engine
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Dispatch instant promotional announcements or schedule daily morning broadcasts (7:00 AM & 9:00 AM GMT).
          </p>
        </div>

        <button
          type="button"
          onClick={() => triggerLiveMut.mutate()}
          disabled={triggerLiveMut.isPending}
          className="inline-flex items-center gap-2 rounded-2xl gold-gradient px-5 py-3 text-xs font-black text-primary-foreground shadow-lg hover:scale-[1.02] active:scale-[.98] transition-all disabled:opacity-50 shrink-0"
        >
          <Sparkles className={`h-4 w-4 ${triggerLiveMut.isPending ? "animate-spin" : ""}`} />
          <span>{triggerLiveMut.isPending ? "Dispatching..." : "🚀 Trigger 'We Are Live' SMS"}</span>
        </button>
      </div>

      {result && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-3 text-emerald-400 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <div>Broadcast Sent Successfully!</div>
            <div className="text-[11px] opacity-80 mt-0.5">
              Dispatched to {result.sentCount} out of {result.totalCount} recipients.
            </div>
            {result.messageText && (
              <div className="text-[11px] font-mono mt-1 text-slate-300 bg-black/20 p-2 rounded-xl border border-white/10">
                {result.messageText}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preset Notification Templates */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Notification Preset Templates
          </h2>
          <span className="text-[11px] text-muted-foreground">Click any preset to pre-fill message</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {NOTIFICATION_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applyTemplate(tpl.content)}
              className="p-4 rounded-2xl border border-border bg-background text-left hover:border-primary hover:bg-primary/5 transition-all group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{tpl.title}</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black">{tpl.badge}</span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground line-clamp-2">
                {tpl.content
                  .replace(/\{site_url\}/g, siteUrl)
                  .replace(/\{whatsapp_url\}/g, whatsappUrl)
                  .replace(/\{support_phone\}/g, supportPhone)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Daily Morning Automated SMS Scheduler (7 AM & 9 AM GMT) */}
      <div className="rounded-3xl border border-amber-500/30 bg-slate-900 text-slate-100 p-6 md:p-8 space-y-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider">
              <Clock className="h-4 w-4" /> Daily Morning SMS Scheduler (7:00 AM & 9:00 AM GMT)
            </div>
            <p className="text-xs text-slate-300">
              Automatically dispatches daily morning "We Are Live" notifications to active agents every morning.
            </p>
          </div>

          <button
            type="button"
            onClick={() => saveScheduleMut.mutate()}
            disabled={saveScheduleMut.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition-all shadow-md shrink-0 disabled:opacity-50"
          >
            <ShieldCheck className={`h-4 w-4 ${saveScheduleMut.isPending ? "animate-spin" : ""}`} />
            <span>{saveScheduleMut.isPending ? "Saving..." : "Save Schedule Settings"}</span>
          </button>
        </div>

        {scheduleNotice && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-mono text-emerald-400 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <span>{scheduleNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5 text-amber-400" /> Site URL Link
            </label>
            <input
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2 text-xs font-mono text-white outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-sky-400" /> WhatsApp Channel Link
            </label>
            <input
              type="text"
              value={whatsappUrl}
              onChange={(e) => setWhatsappUrl(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2 text-xs font-mono text-white outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-emerald-400" /> Support Number
            </label>
            <input
              type="text"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2 text-xs font-mono text-white outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/10 text-xs font-bold">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="rounded border-white/20 bg-slate-950 text-amber-400 focus:ring-amber-400 h-4 w-4"
            />
            <span>Enable Daily Morning SMS Scheduler</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={slot7amEnabled}
              onChange={(e) => setSlot7amEnabled(e.target.checked)}
              className="rounded border-white/20 bg-slate-950 text-amber-400 focus:ring-amber-400 h-4 w-4"
            />
            <span>7:00 AM GMT Slot</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={slot9amEnabled}
              onChange={(e) => setSlot9amEnabled(e.target.checked)}
              className="rounded border-white/20 bg-slate-950 text-amber-400 focus:ring-amber-400 h-4 w-4"
            />
            <span>9:00 AM GMT Slot</span>
          </label>
        </div>
      </div>

      {/* Broadcast Dispatch Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 space-y-6 shadow-sm"
      >
        <div className="space-y-3">
          <label className="text-xs font-black uppercase tracking-wider text-primary">Target Audience</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setAudience("agents")}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                audience === "agents" ? "border-primary bg-primary/10 text-primary font-bold shadow-sm" : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <Users className="h-5 w-5 mb-2" />
              <div className="text-xs font-extrabold">Active Agents</div>
              <div className="text-[10px] opacity-70">Approved Resellers</div>
            </button>

            <button
              type="button"
              onClick={() => setAudience("all")}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                audience === "all" ? "border-primary bg-primary/10 text-primary font-bold shadow-sm" : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <MessageSquare className="h-5 w-5 mb-2" />
              <div className="text-xs font-extrabold">All Customers</div>
              <div className="text-[10px] opacity-70">Recent Order Buyers</div>
            </button>

            <button
              type="button"
              onClick={() => setAudience("custom")}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                audience === "custom" ? "border-primary bg-primary/10 text-primary font-bold shadow-sm" : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <Send className="h-5 w-5 mb-2" />
              <div className="text-xs font-extrabold">Custom Numbers</div>
              <div className="text-[10px] opacity-70">Comma Separated</div>
            </button>
          </div>
        </div>

        {audience === "custom" && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Phone Numbers</label>
            <input
              type="text"
              placeholder="0244123456, 0209876543"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs font-mono outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-foreground">SMS Content (TxtConnect)</label>
            <span className="font-mono text-muted-foreground">{message.length}/160 characters</span>
          </div>
          <textarea
            rows={5}
            placeholder="e.g. BestData Notice: MTN network maintenance tonight from 12am to 2am. Automated delivery will resume at 2:05am."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background p-4 text-xs font-medium outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        {mut.error && (
          <div className="text-xs font-bold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> {(mut.error as Error).message}
          </div>
        )}

        <button
          disabled={mut.isPending || !message.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-2xl gold-gradient py-3.5 text-xs font-black text-primary-foreground shadow-md hover:scale-[1.01] active:scale-95 disabled:opacity-50 transition-all"
        >
          <Send className="h-4 w-4" /> {mut.isPending ? "Dispatching Broadcast…" : "Send SMS Broadcast Now"}
        </button>
      </form>
    </div>
  );
}
