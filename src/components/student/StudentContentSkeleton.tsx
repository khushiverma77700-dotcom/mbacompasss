/**
 * Skeleton placeholder rendered inside StudentLayout's <Outlet /> while a
 * lazy student page chunk (StudentOverview, StudentMocks, etc.) is still
 * downloading. The StudentLayout chrome (top bar + sidebar) is already
 * mounted, so this only needs to fill the inner main-content area.
 *
 * Avoids the blank-white gap users were seeing on cold dashboard loads
 * while the recharts-heavy StudentOverview chunk hydrated.
 */
export default function StudentContentSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto animate-in fade-in duration-200">
      <div className="space-y-2">
        <div className="h-7 w-56 bg-muted/40 rounded-[0.25rem] animate-pulse" />
        <div className="h-4 w-80 bg-muted/30 rounded-[0.25rem] animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
        <div className="h-64 bg-muted/25 rounded-xl animate-pulse" />
        <div className="h-64 bg-muted/25 rounded-xl animate-pulse" />
      </div>
      <div className="h-80 bg-muted/20 rounded-xl animate-pulse" />
    </div>
  );
}
