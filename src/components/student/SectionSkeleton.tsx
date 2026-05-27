import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic dashboard section skeleton — used in place of "Loading…" text
 * across student pages so users always see structured UI, never a bare
 * text label.
 */
export default function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
        {Array.from({ length: rows * 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-xl mt-2" />
    </div>
  );
}
