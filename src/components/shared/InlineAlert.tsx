import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type InlineAlertVariant = "success" | "error" | "warning" | "info";

const CONFIG: Record<InlineAlertVariant, { icon: LucideIcon; classes: string }> = {
  success: { icon: CheckCircle2, classes: "border-success/20 bg-success/10 text-success" },
  error: { icon: XCircle, classes: "border-destructive/20 bg-destructive/10 text-destructive" },
  warning: {
    icon: AlertTriangle,
    classes: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  info: { icon: Info, classes: "border-primary/20 bg-primary/10 text-primary" },
};

export interface InlineAlertProps {
  variant?: InlineAlertVariant;
  children: React.ReactNode;
  className?: string;
}

export function InlineAlert({ variant = "info", children, className }: InlineAlertProps) {
  const { icon: Icon, classes } = CONFIG[variant];
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-2xl border p-3 text-xs font-medium animate-in fade-in",
        classes,
        className,
      )}
      role={variant === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
