export interface GuideSection {
  title: string;
  body: string;
}

export interface GuidePageContent {
  heroTitle: string;
  heroSubtitle: string;
  sections: GuideSection[];
}

export type GuidePageSlug = "buying" | "shipping" | "returns" | "faq" | "terms";

export interface GuidePageDefinition {
  slug: GuidePageSlug;
  label: string;
  href: string;
  description: string;
}

export const GUIDE_PAGE_DEFINITIONS: GuidePageDefinition[] = [
  {
    slug: "buying",
    label: "راهنمای خرید",
    href: "/info/buying",
    description: "نحوه خرید، پرداخت و ثبت سفارش",
  },
  {
    slug: "shipping",
    label: "راهنمای ارسال",
    href: "/info/shipping",
    description: "زمان‌بندی، روش و هزینه ارسال",
  },
  {
    slug: "returns",
    label: "راهنمای بازگشت",
    href: "/info/returns",
    description: "شرایط مرجوعی و استرداد وجه",
  },
  {
    slug: "faq",
    label: "سوالات متداول",
    href: "/info/faq",
    description: "پرسش‌ها و پاسخ‌های رایج",
  },
  {
    slug: "terms",
    label: "قوانین و مقررات",
    href: "/info/terms",
    description: "قوانین استفاده از سایت و خرید",
  },
];

export const GUIDE_PAGES_SETTING_KEY = "guide_pages_json";

export const EMPTY_GUIDE_PAGE: GuidePageContent = {
  heroTitle: "",
  heroSubtitle: "",
  sections: [],
};

export type GuidePagesSettings = Record<GuidePageSlug, GuidePageContent>;

function emptyGuidePage(): GuidePageContent {
  return { ...EMPTY_GUIDE_PAGE, sections: [] };
}

export function emptyGuidePagesSettings(): GuidePagesSettings {
  return {
    buying: emptyGuidePage(),
    shipping: emptyGuidePage(),
    returns: emptyGuidePage(),
    faq: emptyGuidePage(),
    terms: emptyGuidePage(),
  };
}

function normalizeSection(item: unknown): GuideSection | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const title = String(o.title ?? "").trim();
  const body = String(o.body ?? "").trim();
  if (!title && !body) return null;
  return { title, body };
}

function normalizePage(raw: unknown): GuidePageContent {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_GUIDE_PAGE, sections: [] };
  }
  const data = raw as Record<string, unknown>;
  return {
    heroTitle: String(data.heroTitle ?? "").trim(),
    heroSubtitle: String(data.heroSubtitle ?? "").trim(),
    sections: Array.isArray(data.sections)
      ? data.sections.map(normalizeSection).filter((s): s is GuideSection => !!s)
      : [],
  };
}

export function parseGuidePagesSettings(raw: string | undefined | null): GuidePagesSettings {
  const base = emptyGuidePagesSettings();
  if (!raw?.trim()) return base;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    for (const def of GUIDE_PAGE_DEFINITIONS) {
      base[def.slug] = normalizePage(data[def.slug]);
    }
    return base;
  } catch {
    return base;
  }
}

export function serializeGuidePagesSettings(settings: GuidePagesSettings): string {
  return JSON.stringify(settings);
}

export function getGuidePageDefinition(slug: string): GuidePageDefinition | undefined {
  return GUIDE_PAGE_DEFINITIONS.find(def => def.slug === slug);
}
