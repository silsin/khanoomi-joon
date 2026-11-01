/** CSS variable tokens for inline styles — use instead of hardcoded hex. */
export const c = {
  bg: "var(--dg-bg)",
  bgSecondary: "var(--dg-bg-2)",
  card: "var(--dg-surface)",
  surface: "var(--dg-bg-2)",
  border: "var(--dg-line)",
  accent: "var(--dg-primary)",
  accentLight: "var(--dg-gold)",
  text: "var(--dg-ink)",
  muted: "var(--dg-muted)",
} as const;

/** Accent tint for backgrounds/borders (percent = accent opacity). */
export function accentMix(percent: number) {
  return `color-mix(in srgb, var(--dg-primary) ${percent}%, transparent)`;
}

/** Background tint overlay on images. */
export function bgMix(percent: number) {
  return `color-mix(in srgb, var(--dg-bg) ${percent}%, transparent)`;
}
