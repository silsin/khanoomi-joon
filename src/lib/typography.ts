/**
 * Typography system — all fonts must support Persian/Farsi script.
 * Sources: Google Fonts (fonts.google.com) — Arabic/Persian subset confirmed.
 */

export interface FontOption {
  id: string;       // Google Fonts API id (replace spaces with +)
  label: string;    // Persian display name
  family: string;   // CSS font-family value
  style: string;    // brief style description in Persian
  weights: number[];
}

/**
 * All fonts here are confirmed to render Persian/Farsi text correctly.
 * Tested against Google Fonts Arabic/Persian subset.
 */
export const FONT_OPTIONS: FontOption[] = [
  {
    id: "Vazirmatn",
    label: "وزیرمتن",
    family: "'Vazirmatn', sans-serif",
    style: "ساده • مدرن • پیش‌فرض",
    weights: [300, 400, 500, 600, 700, 800, 900],
  },
  {
    id: "Amiri",
    label: "امیری",
    family: "'Amiri', serif",
    style: "کلاسیک • سنتی • نسخ",
    weights: [400, 700],
  },
  {
    id: "Lalezar",
    label: "لاله‌زار",
    family: "'Lalezar', cursive",
    style: "تزئینی • تیتر • طلایی",
    weights: [400],
  },
  {
    id: "Noto+Naskh+Arabic",
    label: "نوتو نسخ عربی",
    family: "'Noto Naskh Arabic', serif",
    style: "رسمی • خوانا • نسخ",
    weights: [400, 500, 600, 700],
  },
  {
    id: "Cairo",
    label: "قاهره",
    family: "'Cairo', sans-serif",
    style: "مدرن • خوانا • متنوع",
    weights: [300, 400, 500, 600, 700, 800, 900],
  },
  {
    id: "Tajawal",
    label: "تجوال",
    family: "'Tajawal', sans-serif",
    style: "ساده • سبک • رسمی",
    weights: [300, 400, 500, 700, 800, 900],
  },
  {
    id: "Scheherazade+New",
    label: "شهرزاد نو",
    family: "'Scheherazade New', serif",
    style: "کلاسیک • ادبی • نسخ",
    weights: [400, 500, 600, 700],
  },
  {
    id: "Reem+Kufi",
    label: "ریم کوفی",
    family: "'Reem Kufi', sans-serif",
    style: "هندسی • کوفی • تیتر",
    weights: [400, 500, 600, 700],
  },
  {
    id: "Readex+Pro",
    label: "ریدکس پرو",
    family: "'Readex Pro', sans-serif",
    style: "مدرن • بین‌المللی • ساده",
    weights: [300, 400, 500, 600, 700],
  },
  {
    id: "Lateef",
    label: "لطیف",
    family: "'Lateef', serif",
    style: "ظریف • کشیده • ناشف‌نویسی",
    weights: [400, 700],
  },
  {
    id: "Noto+Kufi+Arabic",
    label: "نوتو کوفی عربی",
    family: "'Noto Kufi Arabic', sans-serif",
    style: "کوفی • هندسی • عنوان",
    weights: [400, 500, 600, 700],
  },
  {
    id: "IBM+Plex+Sans+Arabic",
    label: "IBM پلکس عربی",
    family: "'IBM Plex Sans Arabic', sans-serif",
    style: "تکنولوژی • تمیز • یونیفرم",
    weights: [300, 400, 500, 600, 700],
  },
];

/** Typography sections — each maps to a CSS variable pair (font + size) */
export interface TypoSection {
  key: string;
  label: string;
  description: string;
  cssFont: string;
  cssSize: string;
  defaultFont: string;
  defaultSize: number;
  minSize: number;
  maxSize: number;
  sample: string;
}

export const TYPO_SECTIONS: TypoSection[] = [
  {
    key: "typo_body",
    label: "متن اصلی",
    description: "توضیحات، متن‌های عادی، پاراگراف‌ها",
    cssFont: "--font-body",
    cssSize: "--font-size-body",
    defaultFont: "Vazirmatn",
    defaultSize: 14,
    minSize: 8,
    maxSize: 200,
    sample: "خانوم جون — فروشگاه طلا و جواهر با بهترین کیفیت و اعتماد",
  },
  {
    key: "typo_heading",
    label: "عناوین",
    description: "تیترهای بخش‌ها، h1، h2، h3",
    cssFont: "--font-heading",
    cssSize: "--font-size-heading",
    defaultFont: "Vazirmatn",
    defaultSize: 28,
    minSize: 8,
    maxSize: 200,
    sample: "جدیدترین طلاهای خانوم جون",
  },
  {
    key: "typo_product",
    label: "نام محصولات",
    description: "نام محصول در کارت‌ها و صفحه محصول",
    cssFont: "--font-product",
    cssSize: "--font-size-product",
    defaultFont: "Vazirmatn",
    defaultSize: 13,
    minSize: 8,
    maxSize: 200,
    sample: "گردنبند قلبی طلا ۱۸ عیار",
  },
  {
    key: "typo_price",
    label: "قیمت و اعداد",
    description: "نمایش قیمت محصولات، قیمت طلا",
    cssFont: "--font-price",
    cssSize: "--font-size-price",
    defaultFont: "Vazirmatn",
    defaultSize: 15,
    minSize: 8,
    maxSize: 200,
    sample: "۱۷٬۵۹۵٬۰۰۰ تومان",
  },
  {
    key: "typo_nav",
    label: "منو ناوبری",
    description: "لینک‌های هدر، دسته‌بندی‌ها، تب‌ها",
    cssFont: "--font-nav",
    cssSize: "--font-size-nav",
    defaultFont: "Vazirmatn",
    defaultSize: 13,
    minSize: 8,
    maxSize: 200,
    sample: "گردنبند · انگشتر · دستبند · گوشواره",
  },
  {
    key: "typo_slider",
    label: "تیتر اسلایدر",
    description: "تیتر و متن اسلایدهای صفحه اصلی",
    cssFont: "--font-slider",
    cssSize: "--font-size-slider",
    defaultFont: "Vazirmatn",
    defaultSize: 48,
    minSize: 8,
    maxSize: 200,
    sample: "طلای ناب خانوم جون",
  },
];

/** Build Google Fonts URL for a set of font IDs */
export function buildGoogleFontsUrl(fontIds: string[]): string {
  const unique = [...new Set(fontIds.filter(Boolean))];
  if (unique.length === 0) return "";
  const families = unique
    .map(id => {
      const opt = FONT_OPTIONS.find(f => f.id === id);
      if (!opt) return null;
      const wts = opt.weights.join(";");
      return `family=${id}:wght@${wts}`;
    })
    .filter(Boolean);
  if (families.length === 0) return "";
  // subset=arabic ensures Persian glyphs are included
  return `https://fonts.googleapis.com/css2?${families.join("&")}&subset=arabic&display=swap`;
}

/** Default settings record */
export function getDefaultTypoSettings(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of TYPO_SECTIONS) {
    out[`${s.key}_font`] = s.defaultFont;
    out[`${s.key}_size`] = String(s.defaultSize);
  }
  return out;
}

export function getFontFamily(fontId: string): string {
  return FONT_OPTIONS.find(f => f.id === fontId)?.family ?? "'Vazirmatn', sans-serif";
}

/** Absolute limits for any custom font size (admin can type any value). */
export const TYPO_SIZE_MIN = 8;
export const TYPO_SIZE_MAX = 200;

/** Clamp any user-supplied size into the allowed absolute range. */
export function clampTypoSize(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(TYPO_SIZE_MAX, Math.max(TYPO_SIZE_MIN, Math.round(n)));
}
