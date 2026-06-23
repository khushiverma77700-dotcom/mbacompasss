/**
 * Generic shimmer skeleton rendered as the Suspense fallback for public
 * pages while their lazy chunk downloads. Replaces the old `null` fallback
 * so users never see a blank white area — they see a layout-matching
 * placeholder that fades into the real content.
 */
export default function PublicPageSkeleton() {
  return (
    <div
      className="container mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-3">
        <div className="h-8 w-2/3 max-w-md rounded bg-muted/40 animate-pulse" />
        <div className="h-4 w-1/2 max-w-sm rounded bg-muted/30 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card/60 overflow-hidden"
          >
            <div className="h-40 bg-muted/30 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-5 w-3/4 rounded bg-muted/40 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-muted/30 animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-muted/30 animate-pulse" />
              <div className="flex gap-2 pt-2">
                <div className="h-8 w-20 rounded bg-muted/30 animate-pulse" />
                <div className="h-8 w-20 rounded bg-muted/30 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
