/** Indian application date-only deadlines close at the end of the stated IST day. */
const DAY = 86_400_000;
const IST = 19_800_000;

export function deadlineTimestamp(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  // Admin saves date-only deadlines as midnight UTC; treat those as the whole IST day.
  const midnightUtc = raw.match(/^(\d{4}-\d{2}-\d{2})[T ]00:00:00(?:\.0+)?(?:Z|\+00(?::?00)?)$/);
  if (midnightUtc) return Date.parse(`${midnightUtc[1]}T23:59:59.999+05:30`);
  const time = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59.999+05:30` : raw);
  return Number.isFinite(time) ? time : null;
}

export function deadlineDays(value: string | null | undefined, now = Date.now()): number | null {
  const target = deadlineTimestamp(value);
  if (target === null) return null;
  return Math.floor((target + IST) / DAY) - Math.floor((now + IST) / DAY);
}

export function countdownParts(value: string | null | undefined, now: number) {
  const target = deadlineTimestamp(value);
  if (target === null) return null;
  const remaining = Math.max(0, target - now);
  return {
    days: Math.floor(remaining / DAY),
    hours: Math.floor((remaining % DAY) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    seconds: Math.floor((remaining % 60_000) / 1_000),
    expired: target <= now,
  };
}

export function compareRecommendations(
  a: { recommendation_priority: number; name: string },
  b: { recommendation_priority: number; name: string },
) {
  return (a.recommendation_priority ?? 0) - (b.recommendation_priority ?? 0) || a.name.localeCompare(b.name);
}

export function reorderRecommendations<T>(rows: T[], index: number, direction: -1 | 1): T[] {
  const next = [...rows];
  const row = next[index];
  const target = next[index + direction];
  if (!row || !target) return next;
  next[index] = target;
  next[index + direction] = row;
  return next;
}