export const TOOL_SLUGS = ["cat-score-calculator", "roi-calculator", "profile-analyzer", "college-finder", "college-shortlister", "iim-waitlist-movement"] as const;
/** Keep existing regional /colleges/* hubs distinct from school details. */
export function publicPath(path: string): string {
  const start = path.search(/[?#]/);
  const base = start < 0 ? path : path.slice(0, start);
  const suffix = start < 0 ? "" : path.slice(start);
  if (!base) return path;
  if (base === "/exams") return `/exam${suffix}`;
  if (base.startsWith("/exams/")) return `/exam/${base.slice(7)}${suffix}`;
  if (base === "/tools/predictor") return `/tools/college-shortlister${suffix}`;
  if (TOOL_SLUGS.some((slug) => base === `/${slug}`)) return `/tools${base}${suffix}`;
  return path;
}