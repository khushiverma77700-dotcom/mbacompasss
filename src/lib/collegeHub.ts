export const collegeLocationSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function locationColleges<T extends { city?: string | null; state?: string | null }>(colleges: T[], kind: "city" | "state", slug: string): T[] {
  return colleges.filter(college => collegeLocationSlug(college[kind] || "") === slug);
}