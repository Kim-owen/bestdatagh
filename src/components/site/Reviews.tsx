import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Loader2 } from "lucide-react";

type Review = {
  id: string;
  name: string;
  rating: number;
  message: string;
  created_at: string;
};

type Props = {
  targetType: "site" | "blog" | "network";
  targetId?: string;
  heading?: string;
  subheading?: string;
};

function StarRow({ value, onChange, size = 20, interactive = false }: { value: number; onChange?: (n: number) => void; size?: number; interactive?: boolean }) {
  return (
    <div className="inline-flex items-center gap-1" role={interactive ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(n)}
          className={`${interactive ? "hover:scale-110 transition-transform" : "cursor-default"} p-0.5`}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          aria-checked={interactive ? value === n : undefined}
          role={interactive ? "radio" : undefined}
        >
          <Star
            className={n <= value ? "fill-primary text-primary" : "text-muted-foreground/40"}
            style={{ width: size, height: size }}
          />
        </button>
      ))}
    </div>
  );
}

export function Reviews({ targetType, targetId = "site", heading = "Reviews", subheading }: Props) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("id,name,rating,message,created_at")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setReviews((data as Review[]) ?? []);
    else setReviews([]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [targetType, targetId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const trimmedName = name.trim();
    const trimmedMsg = message.trim();
    if (trimmedName.length < 1 || trimmedName.length > 80) return setError("Please enter your name (max 80 chars).");
    if (trimmedMsg.length < 3 || trimmedMsg.length > 1000) return setError("Review must be 3–1000 characters.");
    if (rating < 1 || rating > 5) return setError("Pick a star rating.");
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      target_type: targetType,
      target_id: targetId,
      name: trimmedName,
      rating,
      message: trimmedMsg,
    });
    setSubmitting(false);
    if (error) {
      setError("Could not submit review. Please try again.");
      return;
    }
    setSuccess(true);
    setName("");
    setMessage("");
    setRating(5);
    load();
  };

  const avg = reviews && reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{heading}</h2>
        {subheading && <p className="mt-2 text-muted-foreground">{subheading}</p>}
        {reviews && reviews.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <StarRow value={Math.round(avg)} />
            <span>{avg.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={80}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            aria-label="Your name"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rating</span>
            <StarRow value={rating} onChange={setRating} interactive />
          </div>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Share your experience with Bestdata…"
          maxLength={1000}
          rows={4}
          className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          aria-label="Your review"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">{message.length}/1000 · Instant, no login required</div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-2xl gold-gradient px-5 h-10 text-sm font-bold text-primary-foreground shadow-[var(--shadow-gold)] disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit review
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {success && <p className="mt-3 text-sm text-primary">Thanks — your review is live.</p>}
      </form>

      <div className="mt-8 space-y-4">
        {reviews === null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…</div>
        )}
        {reviews && reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">No reviews yet — be the first!</p>
        )}
        {reviews?.map((r) => (
          <article key={r.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-bold">{r.name}</div>
                <StarRow value={r.rating} size={14} />
              </div>
              <time className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </time>
            </div>
            <p className="mt-3 text-sm text-foreground/90 whitespace-pre-line">{r.message}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
