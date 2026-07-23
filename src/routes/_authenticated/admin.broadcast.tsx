import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { adminSendBroadcastSms } from "@/lib/admin.functions";
import { Send, MessageSquare, Users, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/broadcast")({
  component: AdminBroadcastPage,
});

function AdminBroadcastPage() {
  const sendBroadcast = useServerFn(adminSendBroadcastSms);
  const [audience, setAudience] = useState<"all" | "agents" | "custom">("agents");
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);

  const mut = useMutation({
    mutationFn: () => sendBroadcast({ data: { audience, recipients, message } }),
    onSuccess: (res) => {
      setResult(res);
      setMessage("");
    },
  });

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="border-b border-border/50 pb-4">
        <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" /> SMS Broadcast & Announcement Engine
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Send instant promotional or maintenance SMS notifications via TxtConnect Gateway.
        </p>
      </div>

      {result && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-3 text-emerald-400 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <div>Broadcast Sent Successfully!</div>
            <div className="text-[11px] opacity-80 mt-0.5">Dispatched to {result.sentCount} out of {result.totalCount} recipients.</div>
          </div>
        </div>
      )}

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
