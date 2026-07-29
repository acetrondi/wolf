export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

function normalize(value: unknown, seen: WeakSet<object>): JsonValue | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "object" && typeof value !== "function") return undefined;

  const reference = value as object;
  if (seen.has(reference)) return undefined;
  seen.add(reference);

  if (Array.isArray(value)) {
    const result = value.map((item) => normalize(item, seen) ?? null);
    seen.delete(reference);
    return result;
  }

  const result: { [key: string]: JsonValue } = {};
  for (const [key, item] of Object.entries(value)) {
    const normalized = normalize(item, seen);
    if (normalized !== undefined) result[key] = normalized;
  }
  seen.delete(reference);
  return result;
}

/** Convert unknown editor/action data into a plain JSON value without executable values. */
export function normalizeJson(value: unknown): JsonValue | undefined {
  return normalize(value, new WeakSet<object>());
}
