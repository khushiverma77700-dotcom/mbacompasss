/** Recurrence helpers for the Day Planner. */
export type Recurrence = "none" | "daily" | "weekdays" | "weekly" | "custom";

export const RECURRENCE_OPTIONS: { value: Recurrence; label: string; hint: string }[] = [
  { value: "none",     label: "One-time",          hint: "Single task on the chosen date" },
  { value: "daily",    label: "Every day",         hint: "Repeats every day" },
  { value: "weekdays", label: "Weekdays (Mon–Fri)",hint: "Skips weekends" },
  { value: "weekly",   label: "Weekly",            hint: "Pick days of the week" },
  { value: "custom",   label: "Custom days",       hint: "Pick specific weekdays" },
];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const addDays = (date: string, days: number) => {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export const fmtFullDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

/** "daily" / "weekdays" / "weekly: Mon, Wed" / "" */
export function describeRecurrence(rec: Recurrence, days: number[] = []): string {
  if (!rec || rec === "none") return "";
  if (rec === "daily") return "Every day";
  if (rec === "weekdays") return "Mon–Fri";
  const sel = days.slice().sort((a, b) => a - b).map((d) => WEEKDAY_LABELS[d]).join(", ");
  return sel ? `Weekly · ${sel}` : "Weekly";
}
