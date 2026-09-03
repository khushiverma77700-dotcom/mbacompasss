import BRAND_LOGO_URL from "@/assets/brandLogo";

/**
 * Lightweight skeleton of the StudentLayout shell.
 *
 * Used as the Suspense fallback for the StudentLayout chunk so that on a
 * cold load the user immediately sees the dashboard chrome (top bar,
 * sidebar, card grid) instead of a blank white screen for several seconds
 * while the JS bundle downloads.
 */
export default function StudentShellFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50/40 via-white to-blue-50/30 dark:from-background dark:via-background dark:to-background">
      <div className="fixed top-0 left-0 right-0 z-30 bg-card/95 backdrop-blur border-b border-border h-14 flex items-center px-4 gap-2">
        <div className="h-8 w-8 rounded-lg overflow-hidden bg-white ring-1 ring-sky-100 grid place-items-center">
          <img src={BRAND_LOGO_URL} alt="MBA Compass" className="h-full w-full object-contain"  loading="lazy" decoding="async" />
        </div>
        <div className="text-sm font-semibold">MBA Compass</div>
      </div>
      <div className="flex pt-14">
        <aside className="hidden lg:block w-72 shrink-0 border-r border-border bg-card/80 h-[calc(100vh-3.5rem)]">
          <div className="p-4 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-9 rounded-md bg-muted/40 animate-pulse" />
            ))}
          </div>
        </aside>
        <main className="flex-1 p-4 sm:p-6">
          <div className="space-y-4 max-w-5xl">
            <div className="h-8 w-64 bg-muted/40 rounded-[0.25rem] animate-pulse" />
            <div className="h-4 w-80 bg-muted/30 rounded-[0.25rem] animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-muted/25 rounded-xl animate-pulse mt-4" />
          </div>
        </main>
      </div>
    </div>
  );
}
