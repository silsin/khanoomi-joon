export interface AboutStat {
  value: string;
  label: string;
}

export interface AboutValue {
  title: string;
  desc: string;
}

export interface AboutTeamMember {
  name: string;
  role: string;
  image: string;
}

export interface AboutPageSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  storyTitle: string;
  storyParagraph1: string;
  storyParagraph2: string;
  storyImage: string;
  stats: AboutStat[];
  valuesTitle: string;
  valuesSubtitle: string;
  values: AboutValue[];
  teamTitle: string;
  teamSubtitle: string;
  team: AboutTeamMember[];
}

export const ABOUT_PAGE_SETTING_KEY = "about_page_json";

export const EMPTY_ABOUT_PAGE_SETTINGS: AboutPageSettings = {
  heroTitle: "",
  heroSubtitle: "",
  heroImage: "",
  storyTitle: "",
  storyParagraph1: "",
  storyParagraph2: "",
  storyImage: "",
  stats: [],
  valuesTitle: "",
  valuesSubtitle: "",
  values: [],
  teamTitle: "",
  teamSubtitle: "",
  team: [],
};

function normalizeStat(item: unknown): AboutStat | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  return {
    value: String(o.value ?? "").trim(),
    label: String(o.label ?? "").trim(),
  };
}

function normalizeValue(item: unknown): AboutValue | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  return {
    title: String(o.title ?? "").trim(),
    desc: String(o.desc ?? "").trim(),
  };
}

function normalizeTeam(item: unknown): AboutTeamMember | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  return {
    name: String(o.name ?? "").trim(),
    role: String(o.role ?? "").trim(),
    image: String(o.image ?? "").trim(),
  };
}

export function parseAboutPageSettings(raw: string | undefined | null): AboutPageSettings {
  if (!raw?.trim()) return { ...EMPTY_ABOUT_PAGE_SETTINGS, stats: [], values: [], team: [] };
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    return {
      heroTitle: String(data.heroTitle ?? "").trim(),
      heroSubtitle: String(data.heroSubtitle ?? "").trim(),
      heroImage: String(data.heroImage ?? "").trim(),
      storyTitle: String(data.storyTitle ?? "").trim(),
      storyParagraph1: String(data.storyParagraph1 ?? "").trim(),
      storyParagraph2: String(data.storyParagraph2 ?? "").trim(),
      storyImage: String(data.storyImage ?? "").trim(),
      stats: Array.isArray(data.stats)
        ? data.stats.map(normalizeStat).filter((s): s is AboutStat => !!s && !!(s.value || s.label))
        : [],
      valuesTitle: String(data.valuesTitle ?? "").trim(),
      valuesSubtitle: String(data.valuesSubtitle ?? "").trim(),
      values: Array.isArray(data.values)
        ? data.values.map(normalizeValue).filter((v): v is AboutValue => !!v && !!(v.title || v.desc))
        : [],
      teamTitle: String(data.teamTitle ?? "").trim(),
      teamSubtitle: String(data.teamSubtitle ?? "").trim(),
      team: Array.isArray(data.team)
        ? data.team.map(normalizeTeam).filter((m): m is AboutTeamMember => !!m && !!(m.name || m.role || m.image))
        : [],
    };
  } catch {
    return { ...EMPTY_ABOUT_PAGE_SETTINGS, stats: [], values: [], team: [] };
  }
}

export function serializeAboutPageSettings(settings: AboutPageSettings): string {
  return JSON.stringify(settings);
}
