import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Omit this column from the mobile stacked-card fallback (e.g. redundant/decorative columns). */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  skeletonRows?: number;
  onRowClick?: (row: T) => void;
  /** Custom mobile card renderer; falls back to a label/value stack of all non-hidden columns. */
  mobileCard?: (row: T) => React.ReactNode;
  className?: string;
}

/**
 * Shared admin/storefront table shell: real <table> on md+ screens, stacked cards on mobile.
 * Replaces the ~12 hand-rolled `overflow-x-auto` <table> blocks across admin/storefront pages,
 * none of which had a mobile fallback.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyState,
  isLoading = false,
  skeletonRows = 5,
  onRowClick,
  mobileCard,
  className,
}: DataTableProps<T>) {
  const showEmpty = !isLoading && data.length === 0;

  return (
    <div className={cn("overflow-hidden rounded-3xl border border-border bg-card", className)}>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn("text-[10px] font-black uppercase tracking-wider text-muted-foreground", col.className)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading &&
              data.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
        {showEmpty && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
            {emptyState ?? "No records found."}
          </div>
        )}
      </div>

      {/* Mobile stacked cards */}
      <div className="divide-y divide-border md:hidden">
        {isLoading &&
          Array.from({ length: skeletonRows }).map((_, i) => (
            <div key={`m-skeleton-${i}`} className="space-y-2 p-4">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        {!isLoading &&
          data.map((row) => (
            <div
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={cn("p-4", onRowClick && "cursor-pointer active:bg-muted/50")}
            >
              {mobileCard
                ? mobileCard(row)
                : (
                  <div className="space-y-1.5">
                    {columns
                      .filter((c) => !c.hideOnMobile)
                      .map((col) => (
                        <div key={col.key} className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-bold uppercase tracking-wide text-muted-foreground">{col.header}</span>
                          <span className="text-right font-medium text-foreground">{col.cell(row)}</span>
                        </div>
                      ))}
                  </div>
                )}
            </div>
          ))}
        {showEmpty && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
            {emptyState ?? "No records found."}
          </div>
        )}
      </div>
    </div>
  );
}
