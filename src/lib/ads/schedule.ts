/** Smart delivery must respect both the booked schedule and the goal deadline. */
export function smartDeliverySchedule(endAt?: string | null, goalEndAt?: string | null) {
  const deadlines = [endAt, goalEndAt].filter((value): value is string => !!value);
  const end_at = deadlines.sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;
  return { end_at, pacing: end_at ? "even" as const : "asap" as const };
}