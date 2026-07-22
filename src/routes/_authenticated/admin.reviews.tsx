import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListReviews, adminDeleteReview } from "@/lib/admin.functions";
import { Trash2, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reviews")({ component: RevPage });

function RevPage() {
  const list = useServerFn(adminListReviews);
  const del = useServerFn(adminDeleteReview);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["adminReviews"], queryFn: () => list() });
  const m = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["adminReviews"] }) });
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Reviews</h1>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && <div className="text-muted-foreground">Loading…</div>}
        {(data ?? []).map((r: any) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">{r.name} <span className="ml-2 text-xs text-muted-foreground">{r.target_type}/{r.target_id}</span></div>
              <div className="flex items-center gap-2">
                <div className="flex">{Array.from({length:5}).map((_,i)=>(<Star key={i} className={`h-3.5 w-3.5 ${i<r.rating?"fill-primary text-primary":"text-muted-foreground"}`} />))}</div>
                <button onClick={() => confirm("Delete review?") && m.mutate(r.id)} className="rounded border border-border p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <p className="mt-2 text-sm text-foreground/90">{r.message}</p>
            <div className="mt-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
