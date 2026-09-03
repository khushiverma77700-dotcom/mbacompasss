/**
 * Columnar transport for the big listing queries in the SSR dehydration payload.
 *
 * The colleges listing is ~4.2k rows x 25 fields. Serialized as an array of
 * objects, the *field names* alone repeat 4.2k times — that is over a megabyte
 * of pure key text, on top of the JSON-string escaping the router applies to
 * the dehydrated payload.
 *
 * So we transpose those rows into `{ c: [...columnNames], r: [[...values]] }`
 * for transport and expand them back into the exact same objects on hydrate.
 * This is a pure encoding change: no field is dropped and the rehydrated cache
 * entry is deep-equal to what the client query function would have produced,
 * so components can't tell the difference.
 */

const MARKER = "__cols__";

type PackedRows = {
  [MARKER]: 1;
  /** Column names, in a stable order. */
  c: string[];
  /** One array of values per row, aligned to `c`. */
  r: unknown[][];
};

const isPlainRow = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPackedRows = (value: unknown): value is PackedRows =>
  isPlainRow(value) && (value as Record<string, unknown>)[MARKER] === 1;

/**
 * Transposes an array of uniform row objects. Anything else (empty arrays,
 * non-arrays, arrays of primitives) is returned untouched so this is safe to
 * apply to every dehydrated entry.
 */
export const packRows = (data: unknown): unknown => {
  if (!Array.isArray(data) || data.length === 0) return data;
  if (!data.every(isPlainRow)) return data;

  const cols: string[] = [];
  const seen = new Set<string>();
  for (const row of data) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        cols.push(key);
      }
    }
  }

  const packed: PackedRows = {
    [MARKER]: 1,
    c: cols,
    r: data.map((row) => cols.map((col) => row[col])),
  };
  return packed;
};

/** Inverse of {@link packRows}; passes through anything that isn't packed. */
export const unpackRows = (data: unknown): unknown => {
  if (!isPackedRows(data)) return data;
  return data.r.map((values) => {
    const row: Record<string, unknown> = {};
    data.c.forEach((col, i) => {
      row[col] = values[i];
    });
    return row;
  });
};
