import { isValid, parse } from "date-fns";

export function parseHomepageDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // Calendar dates close at midnight in India, not at UTC midnight.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T23:59:59.999+05:30`);
    return isValid(date) ? date : null;
  }
  const direct = new Date(value);
  if (isValid(direct) && direct.getFullYear() > 2000) return direct;
  for (const format of ["dd MMM yyyy", "MMM dd, yyyy", "dd MMMM yyyy", "MMMM dd, yyyy"]) {
    const date = parse(value, format, new Date());
    if (isValid(date) && date.getFullYear() > 2000) {
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return new Date(`${iso}T23:59:59.999+05:30`);
    }
  }
  return null;
}

type ExamDates = { name: string; slug: string; exam_date: string | null; registration_deadline: string | null };
export function upcomingHomepageExams<T extends ExamDates>(rows: T[], mode: "registration" | "exam", now = new Date()): T[] {
  const time = (row: T) => parseHomepageDate(mode === "registration" ? row.registration_deadline : row.exam_date)?.getTime() ?? Infinity;
  return rows.filter((row) => {
    if (!row.name?.trim() || !row.slug?.trim()) return false;
    const deadline = parseHomepageDate(row.registration_deadline);
    const exam = parseHomepageDate(row.exam_date);
    if (deadline && deadline < now) return false;
    if (exam && exam < now) return false;
    return mode === "exam" || !!deadline;
  }).sort((a, b) => time(a) - time(b) || a.name.localeCompare(b.name));
}

/** Overlapping admission tracks can be active in the same month. */
export function activeAdmissionPhases(now = new Date()): number[] {
  const month = Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "numeric" }).format(now));
  const windows = [[1, 4], [5, 7], [8, 9], [10, 12], [1, 3], [4, 6]];
  return windows.flatMap(([start, end], index) => month >= start && month <= end ? [index] : []);
}