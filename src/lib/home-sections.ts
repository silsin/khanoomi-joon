/**
 * Homepage section registry — defines the movable sections of the homepage,
 * their Persian labels (shown in the admin layout manager) and default order.
 * The order is persisted in the `settings` table under HOME_SECTIONS_SETTING_KEY
 * as a JSON array of section keys.
 */

export const HOME_SECTIONS_SETTING_KEY = "home_sections_order";

export interface HomeSectionDef {
  key: string;
  label: string;
}

export const HOME_SECTIONS: HomeSectionDef[] = [
  { key: "hero",           label: "اسلایدر اصلی" },
  { key: "trust",          label: "نوار اعتماد" },
  { key: "promo_banners",  label: "بنرهای تبلیغاتی" },
  { key: "categories",     label: "آیکون دسته‌بندی‌ها" },
  { key: "special_offers", label: "پیشنهاد شگفت‌انگیز" },
  { key: "express",        label: "ارسال اکسپرس" },
  { key: "low_wage",       label: "محصولات کم اجرت" },
  { key: "coin",           label: "سکه و آبشده" },
  { key: "favorites",      label: "محصولات محبوب" },
  { key: "new_arrival",    label: "جدیدترین محصولات" },
  { key: "showcase",       label: "ویترین دسته‌بندی" },
  { key: "budget",         label: "بنرهای بودجه" },
  { key: "collections",    label: "کالکشن‌ها" },
  { key: "info",           label: "بلوک‌های اطلاعاتی" },
];

export const DEFAULT_HOME_SECTION_ORDER: string[] = HOME_SECTIONS.map(s => s.key);

const VALID_KEYS = new Set(DEFAULT_HOME_SECTION_ORDER);

/**
 * Parse a raw settings value into a valid section order.
 * - Invalid/duplicate keys are dropped
 * - Registered sections missing from the saved value are appended at the end
 * - Falls back to the default order when the value is missing or malformed
 */
export function parseHomeSectionOrder(raw: string | null | undefined): string[] {
  let keys: string[] = [];
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        keys = parsed.filter((k): k is string => typeof k === "string" && VALID_KEYS.has(k));
      }
    } catch { /* fall through to defaults */ }
  }
  // Dedupe while preserving order
  keys = [...new Set(keys)];
  // Insert any registered sections missing from the saved order at their
  // registry position (before the next already-present section), so newly
  // added sections appear in a sensible spot instead of at the very bottom
  for (const k of DEFAULT_HOME_SECTION_ORDER) {
    if (keys.includes(k)) continue;
    const kIdx = DEFAULT_HOME_SECTION_ORDER.indexOf(k);
    const nextPresent = DEFAULT_HOME_SECTION_ORDER.slice(kIdx + 1).find((d) => keys.includes(d));
    if (nextPresent) keys.splice(keys.indexOf(nextPresent), 0, k);
    else keys.push(k);
  }
  return keys.length ? keys : [...DEFAULT_HOME_SECTION_ORDER];
}
