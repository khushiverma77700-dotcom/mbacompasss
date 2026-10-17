export type SitemapSubmission = { sitemap_url: string; submitted_on: string };
export type TrackerDay = { date: string; done: number; required: number; status: "complete" | "missed" | "pending" };

/** Calendar date in India, as YYYY-MM-DD. */
export function istDate(d: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** A day is complete only when every current sitemap URL was marked submitted that day. */
export function buildTracker(submissions: SitemapSubmission[], required: string[], today: string, startDate?: string) {
  const byDay = new Map<string, Set<string>>();
  for (const s of submissions) {
    if (!byDay.has(s.submitted_on)) byDay.set(s.submitted_on, new Set());
    byDay.get(s.submitted_on)!.add(s.sitemap_url);
  }
  const earliest = [...byDay.keys()].sort()[0];
  let start = startDate || earliest || today;
  if (start > today) start = today;
  const days: TrackerDay[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const set = byDay.get(d) ?? new Set<string>();
    const done = required.filter(u => set.has(u)).length;
    const complete = required.length > 0 && done >= required.length;
    days.push({ date: d, done, required: required.length, status: complete ? "complete" : d === today ? "pending" : "missed" });
  }
  const completedDays = days.filter(d => d.status === "complete").length;
  const missedDays = days.filter(d => d.status === "missed").length;
  const todaySet = byDay.get(today) ?? new Set<string>();
  const pendingToday = required.filter(u => !todaySet.has(u));
  const counted = completedDays + missedDays;
  const overallProgress = counted ? Math.round((completedDays / counted) * 100) : 0;
  return { days: days.reverse(), completedDays, missedDays, pendingToday, overallProgress };
}
