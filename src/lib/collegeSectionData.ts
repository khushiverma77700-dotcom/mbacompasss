/** Normalize legacy structured lists at the display boundary; never alter saved facts. */
const namedLists = new Set(['facilities', 'recruiters', 'accreditations']);
export function normalizeCollegeSectionData(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, any> = { ...value };
  for (const [key, raw] of Object.entries(result)) {
    if (namedLists.has(key)) {
      const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[,;\n|]+/) : [];
      result[key] = items.flatMap((item) => {
        if (typeof item === 'string' && item.trim()) return [{ name: item.trim() }];
        if (item && typeof item === 'object' && !Array.isArray(item)) return [item];
        return [];
      });
    } else if (['aspects', 'sectors', 'rankings', 'scholarships', 'faculty', 'steps', 'eligibility', 'courses', 'reviews', 'ratings', 'questions'].includes(key)) {
      result[key] = Array.isArray(raw) ? raw.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) : [];
    }
  }
  return result;
}