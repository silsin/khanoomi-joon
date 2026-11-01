/**
 * Budget banners (بنرهای بودجه) — the homepage price-range tiles.
 * Admin-editable list: add / remove / rename / recolor, stored as JSON in `settings`.
 */

export interface BudgetBanner {
  range: string;  // big 3D number on the tile (e.g. "+15")
  label: string;  // caption under the tile
  href: string;   // where the tile links
  color: string;  // base color of the tile, 6/3-digit hex
}

export const BUDGET_BANNERS_SETTING_KEY = "budget_banners_json";

export const BUDGET_MAX_ITEMS = 12;

export const DEFAULT_BUDGET_BANNERS: BudgetBanner[] = [
  { range: "+15",  label: "بالای ۱۵ میلیون تومان",   href: "/products", color: "#c0392b" },
  { range: "8-15", label: "از ۸ تا ۱۵ میلیون تومان", href: "/products", color: "#c0392b" },
  { range: "3-8",  label: "از ۳ تا ۸ میلیون تومان",  href: "/products", color: "#c0392b" },
  { range: "1-3",  label: "از ۱ تا ۳ میلیون تومان",  href: "/products", color: "#c0392b" },
];

/** Preset palette — every pick keeps the gold number readable on top. */
export const BUDGET_COLOR_PRESETS: { label: string; color: string }[] = [
  { label: "قرمز",     color: "#c0392b" },
  { label: "زرشکی",    color: "#a4133c" },
  { label: "نارنجی",    color: "#d35400" },
  { label: "سبز",      color: "#1e8449" },
  { label: "فیروزه‌ای", color: "#0e7c7b" },
  { label: "سرمه‌ای",   color: "#1f4e79" },
  { label: "بنفش",     color: "#7d3c98" },
  { label: "ذغالی",    color: "#2c3e50" },
];

/** Accept only real hex colors; anything else falls back. */
function normColor(v: unknown, fallback: string): string {
  const s = String(v ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase();
  return fallback;
}

/**
 * Parse stored JSON into a safe list.
 * - valid list (including an empty one — «hide the section») passes through
 * - garbage / missing value → defaults
 */
export function parseBudgetBanners(raw: unknown): BudgetBanner[] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try { list = JSON.parse(raw); } catch { list = null; }
  }
  if (!Array.isArray(list)) return DEFAULT_BUDGET_BANNERS.map(b => ({ ...b }));

  const out: BudgetBanner[] = [];
  for (const it of list) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const range = String(o.range ?? "").trim().slice(0, 8);
    const label = String(o.label ?? "").trim().slice(0, 80);
    if (!range && !label) continue;
    out.push({
      range,
      label: label || range,
      href: String(o.href ?? "").trim().slice(0, 300) || "/products",
      color: normColor(o.color, "#c0392b"),
    });
    if (out.length >= BUDGET_MAX_ITEMS) break;
  }
  return out;
}

export function serializeBudgetBanners(list: BudgetBanner[]): string {
  return JSON.stringify(
    list.slice(0, BUDGET_MAX_ITEMS).map(b => ({
      range: String(b.range ?? "").trim().slice(0, 8),
      label: String(b.label ?? "").trim().slice(0, 80),
      href: String(b.href ?? "").trim() || "/products",
      color: normColor(b.color, "#c0392b"),
    })),
  );
}

/* ── color math for the tile gradient / tints ──────────────────── */

function toRgb(hex: string): [number, number, number] {
  const h = normColor(hex, "#c0392b").slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Mix toward white (pct > 0) or black (pct < 0); pct in [-100, 100]. */
export function shadeColor(hex: string, pct: number): string {
  const [r, g, b] = toRgb(hex);
  const t = Math.max(-100, Math.min(100, pct)) / 100;
  const f = (c: number) => Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t));
  return `#${[f(r), f(g), f(b)].map(c => c.toString(16).padStart(2, "0")).join("")}`;
}

/** hex + alpha → rgba() string. */
export function alphaColor(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}
