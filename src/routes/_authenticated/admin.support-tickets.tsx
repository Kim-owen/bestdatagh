import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListSupportTickets, adminUpdateTicketStatus } from "@/lib/admin.functions";
import { LifeBuoy, CheckCircle2, Clock, PhoneCall, ExternalLink, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/support-tickets")({
  component: AdminSupportDeskPage,
});

function AdminSupportDeskPage() {
  const queryClient = useQueryClient();
  const getTickets = useServerFn(adminListSupportTickets);
  const updateStatus = useServerFn(adminUpdateTicketStatus);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["adminSupportTickets"],
    queryFn: () => getTickets(),
  });

  const mut = useMutation({
    mutationFn: (payload: { ticketId: string; status: "open" | "in_progress" | "resolved" }) =>
      updateStatus({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSupportTickets"] });
    },
  });

  return (
    <div className="space-y-8">
      <div className="border-b border-border/50 pb-4">
        <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-primary" /> Integrated Customer Support Desk
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Manage customer inquiries, order issues, and trigger 1-click WhatsApp support templates.
        </p>
      </div>

      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-medium">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Loading support tickets…</td></tr>
              ) : !tickets || tickets.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No support tickets found.</td></tr>
              ) : (
                tickets.map((t: any) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{t.name}</td>
                    <td className="px-6 py-4 font-mono">{t.phone}</td>
                    <td className="px-6 py-4 max-w-xs truncate">{t.subject}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        t.status === "resolved" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <a
                        href={`https://wa.me/${t.phone.replace(/^0/, "233")}?text=${encodeURIComponent(`Hi ${t.name}, BestData support here regarding: ${t.subject}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>

                      {t.status !== "resolved" && (
                        <button
                          onClick={() => mut.mutate({ ticketId: t.id, status: "resolved" })}
                          className="rounded-xl border border-border bg-background px-3 py-1.5 text-[11px] font-bold hover:bg-muted"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
