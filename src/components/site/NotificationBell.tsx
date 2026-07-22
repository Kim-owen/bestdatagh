import { Bell, Check, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { listMyNotifications, markNotificationRead } from "@/lib/agent.functions";

type Note = { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string };

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try { setItems((await listMyNotifications()) as any); } catch {}
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => { clearInterval(t); document.removeEventListener("mousedown", onClick); };
  }, []);

  const unread = items.filter(i => !i.read).length;

  async function markOne(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i));
    try { await markNotificationRead({ data: { id } }); } catch {}
  }
  async function markAll() {
    setItems(prev => prev.map(i => ({ ...i, read: true })));
    try { await markNotificationRead({ data: { all: true } }); } catch {}
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(v => !v); if (!open) load(); }}
        aria-label={`Notifications, ${unread} unread`}
        className="relative grid h-8 w-8 place-items-center rounded-md border border-border bg-card hover:bg-muted">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-sm font-bold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">You're all caught up.</div>
            ) : items.map(n => {
              const Body = (
                <div className={`px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/60 ${n.read ? "opacity-70" : ""}`}>
                  <div className="flex items-start gap-2">
                    <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${n.read ? "bg-muted-foreground/40" : "bg-primary"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>}
                      <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    {!n.read && (
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); markOne(n.id); }}
                        aria-label="Mark read"
                        className="text-muted-foreground hover:text-foreground">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
              return n.link ? (
                <Link key={n.id} to={n.link as any} onClick={() => markOne(n.id)}>{Body}</Link>
              ) : <div key={n.id}>{Body}</div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
