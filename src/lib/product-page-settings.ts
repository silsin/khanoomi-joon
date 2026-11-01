/**
 * «صفحه محصول» settings — everything the product detail page needs beyond the
 * product row itself: the free gift options offered above the buy box, the
 * packaging line used in the specs table and the site-wide FAQ accordion.
 * Persisted in the `settings` table under PRODUCT_PAGE_SETTING_KEY as one JSON
 * object (same pattern as guide-pages-settings.ts) so the admin edits it in one
 * place and the storefront reads it with the rest of /api/admin/settings.
 */

export interface ProductFaqItem {
  q: string;
  a: string;
}

export interface ProductPageSettings {
  /** Gift pack choices (first entry is the default selection). */
  packs: string[];
  /** Free postcard occasions — the UI adds the «نمی‌خواهم» option itself. */
  postcards: string[];
  /** Value shown in the «بسته بندی» row of the specs table. */
  packaging: string;
  /** FAQ accordion shown under the reviews section. */
  faq: ProductFaqItem[];
}

export const PRODUCT_PAGE_SETTING_KEY = "product_page_json";

/** Option meaning “no postcard” — kept out of the editable list. */
export const NO_POSTCARD_LABEL = "نمی‌خواهم";

export const DEFAULT_PRODUCT_PAGE_SETTINGS: ProductPageSettings = {
  packs: ["پک بزرگسال", "پک کودک دخترانه", "پک کودک پسرانه", "بدون پک"],
  postcards: [
    "تولدت مبارک",
    "عید نوروز مبارک",
    "شب یلدا مبارک",
    "سالگرد ازدواج",
    "روز مادر مبارک",
    "روز دختر مبارک",
    "ولنتاین مبارک",
    "روز زن مبارک",
  ],
  packaging: "پک خانوم جون، شیک و کادویی",
  faq: [
    {
      q: "هزینه ارسال چقدر است؟",
      a: "ارسال به سراسر ایران انجام می‌شود و هزینه آن بر اساس آدرس شما در مرحله ثبت سفارش محاسبه می‌گردد.",
    },
    {
      q: "امکان خرید اقساطی وجود دارد؟",
      a: "بله، برای اطلاع از شرایط خرید اقساطی با پشتیبانی ما تماس بگیرید تا راهنمایی‌تان کنیم.",
    },
    {
      q: "طلا با چه عیاری ارسال می‌شود؟",
      a: "تمام محصولات خانوم جون طلای ۱۸ عیار (۷۵۰) و همراه با فاکتور معتبر و ضمانت اصالت ارسال می‌شوند.",
    },
    {
      q: "امکان تعویض یا بازگشت کالا وجود دارد؟",
      a: "تا ۱۴ روز پس از دریافت، در صورت سالم بودن کالا و پلمب بودن آن، امکان بازگشت وجود دارد.",
    },
    {
      q: "چطور می‌توانم این محصول را سفارش بدهم؟",
      a: "محصول را به سبد خرید اضافه کنید، اطلاعات گیرنده و آدرس را تکمیل کنید و سفارش را ثبت کنید تا برایتان ارسال شود.",
    },
  ],
};

function normalizeLabelList(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return [...fallback];
  const list = raw.map(v => String(v ?? "").trim()).filter(Boolean);
  return list.length ? list : [...fallback];
}

function normalizeFaq(raw: unknown, fallback: ProductFaqItem[]): ProductFaqItem[] {
  if (!Array.isArray(raw)) return fallback.map(item => ({ ...item }));
  const list = raw
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const q = String(o.q ?? "").trim();
      const a = String(o.a ?? "").trim();
      return q && a ? { q, a } : null;
    })
    .filter((item): item is ProductFaqItem => !!item);
  return list.length ? list : fallback.map(item => ({ ...item }));
}

/** Never throws — falls back to the shipped defaults. */
export function parseProductPageSettings(
  raw: string | null | undefined
): ProductPageSettings {
  const base: ProductPageSettings = {
    packs: [...DEFAULT_PRODUCT_PAGE_SETTINGS.packs],
    postcards: [...DEFAULT_PRODUCT_PAGE_SETTINGS.postcards],
    packaging: DEFAULT_PRODUCT_PAGE_SETTINGS.packaging,
    faq: DEFAULT_PRODUCT_PAGE_SETTINGS.faq.map(item => ({ ...item })),
  };
  if (!raw?.trim()) return base;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== "object") return base;
    return {
      packs: normalizeLabelList(data.packs, base.packs),
      postcards: normalizeLabelList(data.postcards, base.postcards),
      packaging: String(data.packaging ?? "").trim() || base.packaging,
      faq: normalizeFaq(data.faq, base.faq),
    };
  } catch {
    return base;
  }
}

export function serializeProductPageSettings(settings: ProductPageSettings): string {
  return JSON.stringify(settings);
}
