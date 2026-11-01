export interface CollabCard {
  title: string;
  desc: string;
}

export interface CollabFaqItem {
  q: string;
  a: string;
}

export interface CollabPageSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  introTitle: string;
  introSubtitle: string;
  cards: CollabCard[];
  stepsTitle: string;
  stepsSubtitle: string;
  steps: string[];
  perksTitle: string;
  perksSubtitle: string;
  perks: string[];
  formTitle: string;
  formSubtitle: string;
  faqTitle: string;
  faqSubtitle: string;
  faq: CollabFaqItem[];
}

export const COLLAB_PAGE_SETTING_KEY = "collab_page_json";

export const DEFAULT_COLLAB_PAGE_SETTINGS: CollabPageSettings = {
  heroTitle: "همکاری با ما",
  heroSubtitle: "خانوم جون آماده همکاری با فروشگاه‌های آنلاین، عکاسی‌ها، تالارهای عروسی و صنف‌های مختلف است",
  heroImage: "",
  introTitle: "آماده همکاری با کسب‌وکار شماست",
  introSubtitle: "یکی از مسیرهای همکاری زیر را انتخاب کنید و فرم درخواست را ارسال نمایید",
  cards: [
    {
      title: "فروشگاه‌های آنلاین",
      desc: "اگر آنلاین‌شاپ دارید، می‌توانید محصولات خانوم جون را بدون نیاز به موجودی، در فروشگاه خود عرضه کنید. سفارش‌های مشتریان‌تان را برای ما ارسال کنید تا مستقیم برای خریدار ارسال شود؛ تسویه سود شما به‌صورت شفاف و منظم انجام می‌شود.",
    },
    {
      title: "عکاسی‌ها",
      desc: "استودیوهای عکاسی عروس، کودک و مدلینگ می‌توانند برای جلسات عکاسی، ست‌های طلای خانوم جون را امانت بگیرند تا عکس‌هایشان جلوه‌ای لوکس داشته باشد؛ همچنین با معرفی مشتریان به ما، از هر خرید انجام‌شده پورسانت دریافت می‌کنید.",
    },
    {
      title: "تالارهای عروسی",
      desc: "تالارها و برگزارکنندگان مراسم می‌توانند با خانوم جون قرارداد همکاری امضا کنند: ارائه هدیه و سرویس طلای عروس و داماد با تخفیف ویژه، غرفه معرفی در مراسم، و پورسانت از خریدهای مهمانان و عروس‌ودامادها.",
    },
    {
      title: "صنف‌های مختلف",
      desc: "آرایشگاه‌ها، مزون‌ها، گالری‌ها، فروشگاه‌های هدیه و سایر کسب‌وکارها می‌توانند با نصب استند معرفی یا کد تخفیف اختصاصی خود، مشتریانشان را به خانوم جون معرفی کنند و از هر فروش، درآمد کسب کنند.",
    },
  ],
  stepsTitle: "مراحل شروع همکاری",
  stepsSubtitle: "",
  steps: [
    "نوع همکاری متناسب با کسب‌وکار خود را انتخاب کنید",
    "فرم درخواست همکاری را تکمیل و ارسال کنید",
    "کارشناسان ما ظرف ۲ تا ۳ روز کاری درخواست شما را بررسی می‌کنند",
    "پس از تأیید، قرارداد همکاری امضا و کد یا پنل اختصاصی شما فعال می‌شود",
  ],
  perksTitle: "چرا خانوم جون؟",
  perksSubtitle: "",
  perks: [
    "طلای ۱۸ عیار با فاکتور رسمی و ضمانت اصالت",
    "قیمت‌گذاری شفاف بر اساس نرخ روز طلا",
    "پورسانت و تسویه منظم و شفاف برای همکاران",
    "پشتیبانی اختصاصی شرکای تجاری و ارسال سریع بیمه‌شده",
  ],
  formTitle: "فرم درخواست همکاری",
  formSubtitle: "مشخصات کسب‌وکار خود را وارد کنید تا کارشناسان ما با شما تماس بگیرند",
  faqTitle: "سؤالات متداول",
  faqSubtitle: "",
  faq: [
    {
      q: "پورسانت همکاری چگونه محاسبه و پرداخت می‌شود؟",
      a: "درصد پورسانت بر اساس نوع همکاری در قرارداد مشخص می‌شود و تسویه حساب به‌صورت منظم و شفاف انجام می‌گردد.",
    },
    {
      q: "آیا برای شروع همکاری نیاز به سرمایه اولیه است؟",
      a: "خیر. در مدل معرفی و همکاری در فروش، نیازی به خرید موجودی نیست؛ شما فقط مشتری معرفی می‌کنید و از فروش سهم می‌برید.",
    },
    {
      q: "بررسی درخواست همکاری چقدر طول می‌کشد؟",
      a: "معمولاً ظرف ۲ تا ۳ روز کاری درخواست شما بررسی می‌شود و نتیجه از طریق تماس یا پیامک اطلاع‌رسانی می‌گردد.",
    },
  ],
};

function normalizeCard(item: unknown): CollabCard | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  return {
    title: String(o.title ?? "").trim(),
    desc: String(o.desc ?? "").trim(),
  };
}

function normalizeFaq(item: unknown): CollabFaqItem | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  return {
    q: String(o.q ?? "").trim(),
    a: String(o.a ?? "").trim(),
  };
}

function pickList<T>(
  data: Record<string, unknown>,
  key: string,
  fallback: T[],
  normalize: (item: unknown) => T | null,
  keepIfAny: (item: T) => boolean
): T[] {
  const raw = data[key];
  if (!Array.isArray(raw)) return fallback.map(v => ({ ...(v as object) })) as T[];
  return raw.map(normalize).filter((v): v is T => !!v && keepIfAny(v));
}

export function parseCollabPageSettings(raw: string | undefined | null): CollabPageSettings {
  const d = DEFAULT_COLLAB_PAGE_SETTINGS;
  const fallback = (): CollabPageSettings => ({
    ...d,
    cards: d.cards.map(c => ({ ...c })),
    steps: [...d.steps],
    perks: [...d.perks],
    faq: d.faq.map(f => ({ ...f })),
  });
  if (!raw?.trim()) return fallback();
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const str = (key: keyof CollabPageSettings): string =>
      typeof data[key] === "string" ? (data[key] as string).trim() : (d[key] as string);
    return {
      heroTitle: str("heroTitle"),
      heroSubtitle: str("heroSubtitle"),
      heroImage: str("heroImage"),
      introTitle: str("introTitle"),
      introSubtitle: str("introSubtitle"),
      cards: pickList(data, "cards", d.cards, normalizeCard, c => !!(c.title || c.desc)),
      stepsTitle: str("stepsTitle"),
      stepsSubtitle: str("stepsSubtitle"),
      steps: Array.isArray(data.steps)
        ? data.steps.map(v => String(v ?? "").trim()).filter(Boolean)
        : [...d.steps],
      perksTitle: str("perksTitle"),
      perksSubtitle: str("perksSubtitle"),
      perks: Array.isArray(data.perks)
        ? data.perks.map(v => String(v ?? "").trim()).filter(Boolean)
        : [...d.perks],
      formTitle: str("formTitle"),
      formSubtitle: str("formSubtitle"),
      faqTitle: str("faqTitle"),
      faqSubtitle: str("faqSubtitle"),
      faq: pickList(data, "faq", d.faq, normalizeFaq, f => !!(f.q || f.a)),
    };
  } catch {
    return fallback();
  }
}

export function serializeCollabPageSettings(settings: CollabPageSettings): string {
  return JSON.stringify(settings);
}
