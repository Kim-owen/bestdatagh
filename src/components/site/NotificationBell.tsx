import { Bell, Check, CheckCheck, CheckCircle2, ShoppingBag, Wallet, AlertTriangle, ArrowUpRight, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listMyNotifications, markNotificationRead } from "@/lib/agent.functions";

type Note = { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string };

function getNoteIcon(type: string) {
  switch (type) {
    case "order_delivered":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
    case "order_paid":
      return <ShoppingBag className="h-4 w-4 text-blue-500 shrink-0" />;
    case "wallet_deposit":
      return <Wallet className="h-4 w-4 text-purple-500 shrink-0" />;
    case "order_failed":
    case "withdrawal_rejected":
      return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    case "withdrawal_approved":
    case "withdrawal_paid":
      return <ArrowUpRight className="h-4 w-4 text-emerald-400 shrink-0" />;
    default:
      return <Bell className="h-4 w-4 text-primary shrink-0" />;
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  const ref = useRef<HTMLDivElement>(null);

  const listMyNotificationsFn = useServerFn(listMyNotifications);
  const markNotificationReadFn = useServerFn(markNotificationRead);

  // Request native OS/Desktop push notification permissions on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  async function load() {
    try {
      const res = await listMyNotificationsFn();
      if (Array.isArray(res)) {
        const notes = res as Note[];
        setItems(notes);

        // Detect new unread notifications that haven't been shown to the user yet
        for (const n of notes) {
          if (!n.read && !seenIdsRef.current.has(n.id)) {
            seenIdsRef.current.add(n.id);

            // Skip showing popup popovers on initial page refresh
            if (!isFirstLoadRef.current) {
              // 1. Show interactive Sonner toast
              toast(n.title, {
                description: n.body || undefined,
                icon: getNoteIcon(n.type),
              });

              // 2. Trigger native OS Desktop Web Push Notification (works even if tab is in background)
              if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                try {
                  const desktopNote = new Notification(n.title, {
                    body: n.body || undefined,
                    icon: "/favicon.ico",
                    tag: n.id,
                  });
                  desktopNote.onclick = () => {
                    window.focus();
                    if (n.link) window.location.href = n.link;
                  };
                } catch {}
              }
            }
          }
        }
        if (isFirstLoadRef.current) isFirstLoadRef.current = false;
      }
    } catch {}
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 12_000); // 12-second live notification polling
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => {
      clearInterval(t);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const unread = items.filter((i) => !i.read).length;

  async function markOne(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
    try {
      await markNotificationReadFn({ data: { id } });
    } catch {}
  }

  async function markAll() {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    try {
      await markNotificationReadFn({ data: { all: true } });
    } catch {}
  }

  function enableDesktopPush() {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          toast.success("Desktop Outbound Push Notifications enabled!");
        } else {
          toast.error("Permission denied. Please enable notifications in your browser settings.");
        }
      });
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        aria-label={`Notifications, ${unread} unread`}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-border/80 bg-card hover:bg-muted/80 transition-all shadow-xs"
      >
        <Bell className="h-4 w-4 text-foreground/80" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground animate-pulse shadow-sm">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Notifications Pro</span>
            </div>
            <div className="flex items-center gap-2">
              {typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted" && (
                <button
                  onClick={enableDesktopPush}
                  title="Enable Desktop OS Push Notifications"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 hover:underline bg-amber-500/10 px-2 py-0.5 rounded-full"
                >
                  <Volume2 className="h-3 w-3" /> Enable OS Push
                </button>
              )}
              {unread > 0 && (
                <button onClick={markAll} className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border/40">
            {items.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <div className="text-xs font-bold text-muted-foreground">You're all caught up!</div>
                <div className="text-[10px] text-muted-foreground/70 mt-0.5">Order updates, bundle deliveries, and wallet top-ups will appear here.</div>
              </div>
            ) : (
              items.map((n) => {
                const Body = (
                  <div className={`p-3.5 hover:bg-muted/50 transition-colors ${n.read ? "opacity-60 bg-card" : "bg-primary/5"}`}>
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{getNoteIcon(n.type)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="text-xs font-bold text-foreground line-clamp-1">{n.title}</div>
                          {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        {n.body && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.body}</div>}
                        <div className="text-[10px] text-muted-foreground/60 mt-1 font-medium">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                      {!n.read && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markOne(n.id);
                          }}
                          aria-label="Mark read"
                          className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} to={n.link as any} onClick={() => markOne(n.id)}>
                    {Body}
                  </Link>
                ) : (
                  <div key={n.id}>{Body}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
