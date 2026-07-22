import { useEffect, useState } from "react";
import { listWithdrawalEvents } from "@/lib/agent.functions";
import { Loader2, History } from "lucide-react";

type Event = {
  id: string; withdrawal_id: string; actor_id: string | null;
  from_status: string | null; to_status: string;
  admin_note: string | null; created_at: string;
};

const dot: Record<string, string> = {
  pending: "bg-amber-500",
  approved: "bg-blue-500",
  paid: "bg-emerald-500",
  rejected: "bg-destructive",
};

export function WithdrawalAuditLog({ withdrawalId }: { withdrawalId: string }) {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await listWithdrawalEvents({ data: { withdrawalId } });
        setEvents(rows as any);
      } catch (e: any) { setError(e?.message ?? "Failed to load audit log"); }
    })();
  }, [withdrawalId]);

  if (error) return <div className="text-xs text-destructive px-4 py-3">{error}</div>;
  if (!events) return <div className="px-4 py-3 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading history…</div>;
  if (events.length === 0) return <div className="px-4 py-3 text-xs text-muted-foreground">No history yet.</div>;

  return (
    <div className="px-4 py-3">
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <History className="h-3 w-3" /> Audit log
      </div>
      <ol className="relative border-l border-border pl-4 space-y-3">
        {events.map(e => (
          <li key={e.id} className="relative">
            <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-card ${dot[e.to_status] ?? "bg-muted-foreground"}`} />
            <div className="text-xs">
              <div className="font-semibold capitalize">
                {e.from_status ? <>Status changed <span className="text-muted-foreground">{e.from_status}</span> → <span className="text-foreground">{e.to_status}</span></> : <>Marked <span className="text-foreground">{e.to_status}</span></>}
              </div>
              {e.admin_note && <div className="text-muted-foreground mt-0.5">Note: {e.admin_note}</div>}
              <div className="text-[10px] text-muted-foreground mt-1">{new Date(e.created_at).toLocaleString()}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
