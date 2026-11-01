"use client";
/**
 * ThemeLoader — runs once on mount, fetches settings from API,
 * then applies CSS variables for typography + theme palette.
 * Injects a <link> into <head> for Google Fonts.
 */
import { useEffect } from "react";
import { TYPO_SECTIONS, buildGoogleFontsUrl, getFontFamily, getDefaultTypoSettings, clampTypoSize } from "@/lib/typography";
import { applyTheme, parseThemeSettings } from "@/lib/theme";

let applied  = false; // settings landed on <html> — nothing left to do
let inFlight = false; // a fetch chain is running (guards React strict-mode double mount)

const THEME_MAX_TRIES = 3;
const THEME_RETRY_MS  = 4000;

/** Apply fetched settings to <html> — palette, typography vars, Google Fonts link. */
function applySettings(data: Record<string, string>) {
  // ── 1. Apply palette + legacy font sizes ──────────────────────
  const themeSettings = parseThemeSettings(data);
  applyTheme(themeSettings);

  // ── 2. Apply typography CSS variables ────────────────────────
  const root = document.documentElement;
  const defaults = getDefaultTypoSettings();
  const fontIds: string[] = [];

  for (const section of TYPO_SECTIONS) {
    const fontId = data[`${section.key}_font`] || defaults[`${section.key}_font`];
    const size = clampTypoSize(data[`${section.key}_size`] || defaults[`${section.key}_size`], section.defaultSize);

    root.style.setProperty(section.cssFont, getFontFamily(fontId));
    root.style.setProperty(section.cssSize, `${size}px`);
    fontIds.push(fontId);
  }

  // Price-bar font (top banner) — include so its <link> is loaded
  const priceBarFont = (data.price_bar_font_id || "Vazirmatn").trim() || "Vazirmatn";
  fontIds.push(priceBarFont);

  // ── 3. Inject Google Fonts ────────────────────────────────────
  const url = buildGoogleFontsUrl(fontIds);
  if (url) {
    // Remove any existing dynamic font link
    const existing = document.getElementById("dynamic-gfonts");
    if (existing) existing.remove();

    const link = document.createElement("link");
    link.id   = "dynamic-gfonts";
    link.rel  = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }
}

/**
 * Fetch + apply. One failed request must NOT leave the site without typography
 * variables for the rest of the session — the old code flipped `applied` before
 * the fetch and swallowed errors with `.catch(() => {})`, so a single cold-start
 * 500 meant «منو ناوبری» (and every other font section) stayed at the defaults
 * until a full reload. Retry a few times instead.
 */
async function loadTheme(tries = 0): Promise<void> {
  try {
    const res = await fetch("/api/admin/settings");
    const d = await res.json();
    if (!d?.success) throw new Error("settings request failed");
    applySettings(d.data as Record<string, string>);
    applied = true;
    inFlight = false;
  } catch {
    if (tries + 1 < THEME_MAX_TRIES) {
      // The chain keeps `inFlight` set so a re-mount doesn't start a parallel fetch.
      setTimeout(() => { if (!applied) void loadTheme(tries + 1); }, THEME_RETRY_MS);
    } else {
      inFlight = false; // give up — a later mount may try again
    }
  }
}

export default function ThemeLoader() {
  useEffect(() => {
    if (applied || inFlight) return;
    inFlight = true;
    void loadTheme(0);
  }, []);

  return null;
}
