export interface ContactHourRow {
  day: string;
  time: string;
}

export interface ContactFaqItem {
  q: string;
  a: string;
}

export interface ContactPageSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  formTitle: string;
  email2: string;
  addressLine2: string;
  hoursCardLines: string[];
  mapImage: string;
  mapLabel: string;
  hoursTable: ContactHourRow[];
  faqTitle: string;
  faqSubtitle: string;
  faq: ContactFaqItem[];
}

export const CONTACT_PAGE_SETTING_KEY = "contact_page_json";

export const EMPTY_CONTACT_PAGE_SETTINGS: ContactPageSettings = {
  heroTitle: "",
  heroSubtitle: "",
  heroImage: "",
  formTitle: "",
  email2: "",
  addressLine2: "",
  hoursCardLines: [],
  mapImage: "",
  mapLabel: "",
  hoursTable: [],
  faqTitle: "",
  faqSubtitle: "",
  faq: [],
};

function normalizeHourRow(item: unknown): ContactHourRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  return {
    day: String(o.day ?? "").trim(),
    time: String(o.time ?? "").trim(),
  };
}

function normalizeFaq(item: unknown): ContactFaqItem | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  return {
    q: String(o.q ?? "").trim(),
    a: String(o.a ?? "").trim(),
  };
}

export function parseContactPageSettings(raw: string | undefined | null): ContactPageSettings {
  if (!raw?.trim()) return { ...EMPTY_CONTACT_PAGE_SETTINGS, hoursCardLines: [], hoursTable: [], faq: [] };
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    return {
      heroTitle: String(data.heroTitle ?? "").trim(),
      heroSubtitle: String(data.heroSubtitle ?? "").trim(),
      heroImage: String(data.heroImage ?? "").trim(),
      formTitle: String(data.formTitle ?? "").trim(),
      email2: String(data.email2 ?? "").trim(),
      addressLine2: String(data.addressLine2 ?? "").trim(),
      hoursCardLines: Array.isArray(data.hoursCardLines)
        ? data.hoursCardLines.map(v => String(v ?? "").trim()).filter(Boolean)
        : [],
      mapImage: String(data.mapImage ?? "").trim(),
      mapLabel: String(data.mapLabel ?? "").trim(),
      hoursTable: Array.isArray(data.hoursTable)
        ? data.hoursTable.map(normalizeHourRow).filter((r): r is ContactHourRow => !!r && !!(r.day || r.time))
        : [],
      faqTitle: String(data.faqTitle ?? "").trim(),
      faqSubtitle: String(data.faqSubtitle ?? "").trim(),
      faq: Array.isArray(data.faq)
        ? data.faq.map(normalizeFaq).filter((f): f is ContactFaqItem => !!f && !!(f.q || f.a))
        : [],
    };
  } catch {
    return { ...EMPTY_CONTACT_PAGE_SETTINGS, hoursCardLines: [], hoursTable: [], faq: [] };
  }
}

export function serializeContactPageSettings(settings: ContactPageSettings): string {
  return JSON.stringify(settings);
}
