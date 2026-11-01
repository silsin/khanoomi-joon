/**
 * Shared helpers for the product `images` / `videos` columns, both stored as
 * JSON string arrays in SQLite.
 */

/** Parse a JSON media column into a clean string array (never throws). */
export function parseMedia(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
  } catch {
    return [];
  }
}

/** First URL in a media column, or null. */
export function firstMedia(raw: string | null | undefined): string | null {
  return parseMedia(raw)[0] ?? null;
}
