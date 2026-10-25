import type { DehydratedState, QueryClient } from "@tanstack/react-query";

// Only build-time public data is refreshed; never invalidate private workspaces.
const PUBLIC_KEYS = new Set([
  "college", "college-sections", "programme-courses", "article", "exam-page", "institute_full",
  "colleges", "institutes", "exams-listing", "blog-articles", "public-freebies", "comparison-courses",
  "mocks-landing-settings", "popular-exams-countdown", "testimonials", "success-stories-featured",
  "comparisons-with-articles", "home-freebies", "top-ranked-colleges", "categories-homepage",
  "home-latest-articles", "homepage-news", "exam-deadlines-ticker", "homepage-college-application-deadlines", "site_settings",
]);
const snapshots = new WeakMap<QueryClient, Map<string, number>>();
export const PUBLIC_SNAPSHOT_MAX_AGE_MS = 5 * 60 * 1000;

export function registerPublicSnapshot(client: QueryClient, state: DehydratedState) {
  snapshots.set(client, new Map(state.queries
    .filter((query) => PUBLIC_KEYS.has(String(query.queryKey[0])))
    .map((query) => [query.queryHash, query.state.dataUpdatedAt])));
}

/** Refresh mounted snapshot queries once, retaining initial HTML while fetching. */
export async function refreshPublicSnapshot(client: QueryClient): Promise<boolean> {
  const pending = snapshots.get(client);
  if (!pending?.size) return false;
  const active = client.getQueryCache().getAll().filter((query) => {
    const savedAt = pending.get(query.queryHash);
    if (savedAt === undefined || !query.isActive()) return false;
    // Fresh SSR data needs no duplicate network read. Keep it registered so a
    // later navigation can refresh it once it crosses the freshness boundary.
    return Date.now() - savedAt >= PUBLIC_SNAPSHOT_MAX_AGE_MS;
  });
  if (!active.length) return false;
  await Promise.all(active.map(async (query) => {
    // A loader may already have fetched newer data before the shell mounted.
    if (query.state.dataUpdatedAt <= (pending.get(query.queryHash) ?? 0)) {
      await client.refetchQueries({ queryKey: query.queryKey, exact: true, type: "active" });
    }
    if (query.state.status === "success" && !query.state.error) pending.delete(query.queryHash);
  }));
  return true;
}