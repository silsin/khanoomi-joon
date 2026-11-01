export interface ThemePalette {
  id: string;
  name: string;
  bg: string;
  bgSecondary: string;
  surface: string;
  card: string;
  border: string;
  accent: string;
  accentLight: string;
  text: string;
  textMuted: string;
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: "gold-dark",
    name: "طلایی کلاسیک",
    bg: "#0e0e0e",
    bgSecondary: "#111111",
    surface: "#161616",
    card: "#1a1a1a",
    border: "#2a2a2a",
    accent: "#d4af37",
    accentLight: "#f0d060",
    text: "#ffffff",
    textMuted: "#888888",
  },
  {
    id: "rose-gold",
    name: "رز گلد",
    bg: "#120c0e",
    bgSecondary: "#1a1215",
    surface: "#1e1518",
    card: "#221820",
    border: "#3d2830",
    accent: "#e8a598",
    accentLight: "#f5c4ba",
    text: "#fff5f3",
    textMuted: "#a08088",
  },
  {
    id: "midnight",
    name: "نیمه‌شب",
    bg: "#0a0e14",
    bgSecondary: "#0f1419",
    surface: "#121820",
    card: "#151c24",
    border: "#243040",
    accent: "#5b9fd4",
    accentLight: "#8ec5f0",
    text: "#e8f0f8",
    textMuted: "#7a90a8",
  },
  {
    id: "emerald",
    name: "زمرد",
    bg: "#0a100e",
    bgSecondary: "#0f1612",
    surface: "#121a15",
    card: "#152019",
    border: "#243830",
    accent: "#4ade80",
    accentLight: "#86efac",
    text: "#ecfdf5",
    textMuted: "#6b9080",
  },
  {
    id: "cream-light",
    name: "کرم روشن",
    bg: "#f5f0e8",
    bgSecondary: "#ebe4d8",
    surface: "#e8e0d4",
    card: "#ffffff",
    border: "#d4cbb8",
    accent: "#b8860b",
    accentLight: "#d4a017",
    text: "#1a1510",
    textMuted: "#6b5d4a",
  },
];

export const DEFAULT_PALETTE_ID = "gold-dark";
export const DEFAULT_FONT_MOBILE = "14";
export const DEFAULT_FONT_DESKTOP = "16";

export const FONT_SIZE_MIN = 8;
export const FONT_SIZE_MAX = 200;

export interface ThemeSettings {
  theme_palette: string;
  font_size_mobile: string;
  font_size_desktop: string;
}

export function parseThemeSettings(raw: Record<string, string>): ThemeSettings {
  return {
    theme_palette: raw.theme_palette || DEFAULT_PALETTE_ID,
    font_size_mobile: raw.font_size_mobile || DEFAULT_FONT_MOBILE,
    font_size_desktop: raw.font_size_desktop || DEFAULT_FONT_DESKTOP,
  };
}

export function getPalette(id: string): ThemePalette {
  return THEME_PALETTES.find(p => p.id === id) ?? THEME_PALETTES[0];
}

export function applyTheme(settings: Partial<ThemeSettings>) {
  if (typeof document === "undefined") return;

  const palette = getPalette(settings.theme_palette ?? DEFAULT_PALETTE_ID);
  const fontMobile = clampFontSize(settings.font_size_mobile ?? DEFAULT_FONT_MOBILE);
  const fontDesktop = clampFontSize(settings.font_size_desktop ?? DEFAULT_FONT_DESKTOP);
  const root = document.documentElement;

  root.style.setProperty("--theme-bg", palette.bg);
  root.style.setProperty("--theme-bg-secondary", palette.bgSecondary);
  root.style.setProperty("--theme-surface", palette.surface);
  root.style.setProperty("--theme-card", palette.card);
  root.style.setProperty("--theme-border", palette.border);
  root.style.setProperty("--theme-accent", palette.accent);
  root.style.setProperty("--theme-accent-light", palette.accentLight);
  root.style.setProperty("--theme-text", palette.text);
  root.style.setProperty("--theme-text-muted", palette.textMuted);
  root.style.setProperty("--font-size-mobile", `${fontMobile}px`);
  root.style.setProperty("--font-size-desktop", `${fontDesktop}px`);

  // Legacy aliases used in globals.css
  root.style.setProperty("--gold", palette.accent);
  root.style.setProperty("--gold-light", palette.accentLight);
  root.style.setProperty("--dark-bg", palette.bg);
  root.style.setProperty("--dark-card", palette.card);
  root.style.setProperty("--dark-border", palette.border);

  root.style.colorScheme = palette.id === "cream-light" ? "light" : "dark";
}

function clampFontSize(value: string): number {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return parseInt(DEFAULT_FONT_MOBILE, 10);
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, n));
}
