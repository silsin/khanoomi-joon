/**
 * Category showcase (ویترین دسته‌بندی) — the big image tiles on the homepage
 * («مشاهده همه انگشتر», «مشاهده همه بچه‌گانه», …).
 * Admin-editable: grid columns, tile width/height, gap, grayscale toggle and
 * the ordered list of tiles (which categories, optional title/image override).
 * Stored as JSON under the `settings` key `category_showcase_json`.
 */

export interface CategoryShowcaseItem {
  category_id: string; // category shown by this tile
  title: string;       // empty = category name
  image: string;       // empty = category banner image
  href: string;        // empty = /products?category=<id>
}

export interface CategoryShowcaseConfig {
  columns: number;             // grid columns on desktop (1–6)
  item_width: number;          // tile width in px, 0 = auto (fill column)
  item_height: number;         // tile height in px
  gap: number;                 // space between tiles in px
  grayscale: boolean;          // render tiles black & white (default off)
  items: CategoryShowcaseItem[]; // empty = show all categories (first SHOWCASE_MAX_ITEMS)
}

export const CATEGORY_SHOWCASE_SETTING_KEY = "category_showcase_json";

export const SHOWCASE_MAX_ITEMS = 12;
export const SHOWCASE_COLUMNS_MIN = 1;
export const SHOWCASE_COLUMNS_MAX = 6;

export const DEFAULT_CATEGORY_SHOWCASE: CategoryShowcaseConfig = {
  columns: 3,
  item_width: 0,   // auto — tiles fill the grid column
  item_height: 520,
  gap: 14,
  grayscale: false,
  items: [],
};

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Parse stored JSON into a safe config.
 * Garbage / missing value → defaults.
 */
export function parseCategoryShowcase(raw: unknown): CategoryShowcaseConfig {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try { obj = JSON.parse(raw); } catch { obj = null; }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ...DEFAULT_CATEGORY_SHOWCASE, items: [] };
  }
  const o = obj as Record<string, unknown>;

  const items: CategoryShowcaseItem[] = [];
  const seen = new Set<string>();
  if (Array.isArray(o.items)) {
    for (const it of o.items) {
      if (!it || typeof it !== "object") continue;
      const io = it as Record<string, unknown>;
      const cid = String(io.category_id ?? "").trim();
      if (!cid || seen.has(cid)) continue;
      seen.add(cid);
      items.push({
        category_id: cid,
        title: String(io.title ?? "").trim().slice(0, 60),
        image: String(io.image ?? "").trim().slice(0, 500),
        href: String(io.href ?? "").trim().slice(0, 300),
      });
      if (items.length >= SHOWCASE_MAX_ITEMS) break;
    }
  }

  return {
    columns: clampInt(o.columns, SHOWCASE_COLUMNS_MIN, SHOWCASE_COLUMNS_MAX, DEFAULT_CATEGORY_SHOWCASE.columns),
    item_width: clampInt(o.item_width, 0, 800, DEFAULT_CATEGORY_SHOWCASE.item_width),
    item_height: clampInt(o.item_height, 120, 1200, DEFAULT_CATEGORY_SHOWCASE.item_height),
    gap: clampInt(o.gap, 0, 48, DEFAULT_CATEGORY_SHOWCASE.gap),
    grayscale: o.grayscale === true || o.grayscale === "true" || o.grayscale === 1,
    items,
  };
}

export function serializeCategoryShowcase(cfg: Partial<CategoryShowcaseConfig> | null | undefined): string {
  const parsed = parseCategoryShowcase(cfg ? JSON.stringify(cfg) : null);
  return JSON.stringify(parsed);
}
