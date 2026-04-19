/**
 * Compute a shallow field-by-field diff between two listing payloads.
 * Returns an object keyed by changed field name with { old, new }.
 * Skips fields where both sides are equivalent (after JSON-normalising arrays/objects).
 */
export type FieldDiff = Record<string, { old: unknown; new: unknown }>;

const isEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) {
    // treat null/undefined and "" as equal — common when admin row has NULL but form has ""
    const aEmpty = a === null || a === undefined || a === "";
    const bEmpty = b === null || b === undefined || b === "";
    return aEmpty && bEmpty;
  }
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
};

export const computeDiff = (oldData: Record<string, any>, newData: Record<string, any>): FieldDiff => {
  const diff: FieldDiff = {};
  const keys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
  for (const k of keys) {
    const oldVal = oldData?.[k];
    const newVal = newData?.[k];
    if (!isEqual(oldVal, newVal)) {
      diff[k] = { old: oldVal ?? null, new: newVal ?? null };
    }
  }
  return diff;
};

export const formatFieldName = (key: string): string =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
