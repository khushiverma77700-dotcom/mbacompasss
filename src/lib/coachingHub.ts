import { locationMatches } from "./filterHelpers";

export type CoachingHub = { path: string; title: string; description: string; h1: string; city?: string; state?: string; aliases?: string[]; mode?: string; exam?: string };

export const coachingModes: Record<string, string> = { online: "Online", offline: "Offline", classroom: "Offline", hybrid: "Hybrid", weekend: "Hybrid", "crash-course": "Hybrid", "self-paced": "Online" };
export const coachingExams = ["cat", "xat", "gmat", "gre", "snap", "nmat", "cmat", "mat", "iift", "tissnet", "mica", "ipmat"];

export function matchesCoachingHub(row: any, hub?: CoachingHub): boolean {
  if (!hub) return true;
  if (hub.city && !locationMatches(row.city, hub.city, hub.aliases)) return false;
  if (hub.state && String(row.state || "").trim().toLowerCase() !== hub.state.trim().toLowerCase()) return false;
  if (hub.mode && String(row.mode || "").trim().toLowerCase() !== hub.mode.toLowerCase()) return false;
  if (hub.exam && !matchesCoachingExam(row, hub.exam)) return false;
  return true;
}

export function matchesCoachingExam(row: any, exam: string): boolean {
  const text = [row.name, row.categories?.name, row.categories?.slug, ...(row.courses || []).map((course: any) => course.name), ...(Array.isArray(row.specializations) ? row.specializations : [])].join(" ");
  const code = exam.toLowerCase() === "mica" ? "micat" : exam;
  return new RegExp(`\\b${code.replace(/[^a-z0-9]/gi, "")}\\b`, "i").test(text);
}