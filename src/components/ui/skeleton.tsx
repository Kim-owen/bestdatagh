import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-slate-800/60 border border-white/5 relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

/**
 * Animated Skeleton Loader for Data Bundle Cards
 */
export function BundleCardSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 space-y-4 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 rounded-2xl" />
          <Skeleton className="h-5 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2 pt-1">
        <Skeleton className="h-8 w-28 rounded-xl" />
        <Skeleton className="h-4 w-36 rounded-lg" />
      </div>
      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
        <Skeleton className="h-6 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-2xl" />
      </div>
    </div>
  );
}

/**
 * Animated Skeleton Loader for Table Rows (Admin Orders, Users, Bundles, Audit Logs)
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-white/5">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="space-y-2">
            <Skeleton className={`h-4 ${i === 0 ? "w-32" : i === 1 ? "w-40" : "w-20"} rounded-lg`} />
            {i < 2 && <Skeleton className="h-3 w-24 rounded-md" />}
          </div>
        </td>
      ))}
    </tr>
  );
}

/**
 * Animated Skeleton Loader for Dashboard Metric Cards
 */
export function StatCardSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 space-y-3 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-8 w-36 rounded-xl" />
      <Skeleton className="h-3 w-44 rounded-md" />
    </div>
  );
}

