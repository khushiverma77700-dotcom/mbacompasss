/**
 * Aggressive route prefetcher for the Student LMS.
 *
 * Once the student is inside the dashboard we know they will almost certainly
 * navigate between Overview, Mocks, Performance, Day Planner, Notifications,
 * Profile, etc. Downloading those page chunks ahead of time (during browser
 * idle slices) makes every subsequent tab switch effectively instant — the
 * lazy() chunk is already in the module cache by the time React asks for it.
 *
 * Vite splits one chunk per dynamic import target path, so calling the same
 * `import("@/pages/student/...")` here reuses the chunk that `lazy()` in
 * App.tsx will request later.
 */

// Map of "route prefix" → loader. Hover/touch handlers in nav components look
// up the most specific match and fire the loader. Idle prefetch fires them all.
const loaders: Array<{ match: (path: string) => boolean; load: () => Promise<unknown> }> = [
  { match: (p) => p === "/student" || p === "/", load: () => import("@/pages/student/StudentOverview") },
  { match: (p) => p.startsWith("/student/mocks"), load: () => import("@/pages/student/StudentMocks") },
  { match: (p) => p.startsWith("/student/buy-mocks"), load: () => import("@/pages/student/StudentBuyMocks") },
  { match: (p) => p.startsWith("/student/performance"), load: () => import("@/pages/student/StudentPerformance") },
  { match: (p) => p.startsWith("/student/all-india-rank"), load: () => import("@/pages/student/StudentPerformX") },
  { match: (p) => p.startsWith("/student/weak-areas"), load: () => import("@/pages/student/StudentWeakAreas") },
  { match: (p) => p.startsWith("/student/strength-areas"), load: () => import("@/pages/student/StudentStrengthAreas") },
  { match: (p) => p.startsWith("/student/goals"), load: () => import("@/pages/student/StudentGoals") },
  { match: (p) => p.startsWith("/student/tools"), load: () => import("@/pages/student/StudentTools") },
  { match: (p) => p.startsWith("/student/profile"), load: () => import("@/pages/student/StudentProfile") },
  { match: (p) => p.startsWith("/student/install"), load: () => import("@/pages/student/StudentInstall") },
  { match: (p) => p.startsWith("/student/rewards"), load: () => import("@/pages/student/StudentRewards") },
  { match: (p) => p.startsWith("/student/day-planner"), load: () => import("@/pages/student/StudentDayPlanner") },
  { match: (p) => p.startsWith("/student/planner-performance"), load: () => import("@/pages/student/StudentPlannerPerformance") },
  { match: (p) => p.startsWith("/student/leaderboard"), load: () => import("@/pages/student/StudentLeaderboard") },
  { match: (p) => p.startsWith("/student/notifications"), load: () => import("@/pages/student/StudentNotifications") },
  { match: (p) => p.startsWith("/student/orders"), load: () => import("@/pages/student/StudentOrders") },
  { match: (p) => p.startsWith("/student/deep-analysis"), load: () => import("@/pages/student/StudentDeepAnalysis") },
  { match: (p) => p.startsWith("/student/daily-test"), load: () => import("@/pages/student/StudentDailyTest") },
  { match: (p) => p.startsWith("/student/mocks/attempted"), load: () => import("@/pages/student/StudentAttempts") },
  { match: (p) => p.startsWith("/student/support"), load: () => import("@/pages/student/StudentSupport") },
  { match: (p) => p.startsWith("/student/personalized-hub"), load: () => import("@/pages/student/StudentPersonalizedHub") },
  { match: (p) => p.startsWith("/student/sop-review"), load: () => import("@/pages/student/StudentSOPReview") },
  { match: (p) => p.startsWith("/student/vocabulary"), load: () => import("@/pages/student/vocabulary/StudentVocabularyHub") },
  { match: (p) => p.startsWith("/student/formulas"), load: () => import("@/pages/student/formulas/StudentFormulaBook").catch(() => undefined) },
];

const fired = new Set<string>();
const safe = (key: string, fn: () => Promise<unknown>) => {
  if (fired.has(key)) return;
  fired.add(key);
  fn().catch(() => { fired.delete(key); });
};

/** Prefetch the chunk for a given path. Cheap, deduped, swallows errors. */
export function preloadStudentRoute(path: string) {
  const entry = loaders.find((l) => l.match(path));
  if (!entry) return;
  safe(path, entry.load);
}

/** Prefetch every student-page chunk during browser idle time. */
export function preloadAllStudentRoutes() {
  if (typeof window === "undefined") return;
  const w = window as any;
  const schedule: (cb: () => void) => number =
    w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 400));

  // Stagger so we don't saturate the network with 20+ parallel chunk requests.
  loaders.forEach((entry, i) => {
    schedule(() => safe(`__all__${i}`, entry.load));
  });
}
