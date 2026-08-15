import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide",
  {
    variants: {
      status: {
        success: "border-success/20 bg-success/10 text-success",
        warning: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        danger: "border-destructive/20 bg-destructive/10 text-destructive",
        info: "border-primary/20 bg-primary/10 text-primary",
        neutral: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { status: "neutral" },
  },
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  dot?: boolean;
}

export function StatusBadge({ className, status, dot = false, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const STATUS_TONE_MAP: Record<string, NonNullable<StatusBadgeProps["status"]>> = {
  delivered: "success",
  completed: "success",
  success: "success",
  approved: "success",
  active: "success",
  paid: "success",
  resolved: "success",
  healthy: "success",
  pending: "warning",
  processing: "warning",
  awaiting: "warning",
  review: "warning",
  failed: "danger",
  rejected: "danger",
  cancelled: "danger",
  canceled: "danger",
  locked: "danger",
  suspended: "danger",
  error: "danger",
  refunded: "info",
  reversed: "info",
};

/** Maps a free-text order/withdrawal/user status string to a StatusBadge tone. */
export function getStatusTone(status?: string | null): NonNullable<StatusBadgeProps["status"]> {
  if (!status) return "neutral";
  return STATUS_TONE_MAP[status.toLowerCase()] ?? "neutral";
}
