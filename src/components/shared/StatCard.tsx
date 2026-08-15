import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  href?: string;
  tone?: "default" | "success" | "danger" | "warning";
  className?: string;
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export function StatCard({ icon: Icon, label, value, sublabel, href, tone = "default", className }: StatCardProps) {
  const body = (
    <div
      className={cn(
        "group rounded-3xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-hover",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-2xl", toneClasses[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 font-display text-2xl font-black tracking-tight text-foreground">{value}</div>
      {(sublabel || href) && (
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{sublabel}</span>
          {href && (
            <span className="inline-flex shrink-0 items-center gap-0.5 font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              View <ChevronRight className="h-3 w-3" />
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link to={href as any} className="block">
        {body}
      </Link>
    );
  }
  return body;
}
