export type SocialLinkType = "telegram" | "bale" | "whatsapp" | "install" | "instagram";

/** Turn admin input (URL, @username, phone) into a usable href. */
export function normalizeSocialUrl(type: SocialLinkType, raw: string): string {
  const v = raw.trim();
  if (!v) return "";

  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/")) return v;

  switch (type) {
    case "whatsapp": {
      const digits = v.replace(/\D/g, "");
      return digits ? `https://wa.me/${digits}` : "";
    }
    case "telegram": {
      const u = v.replace(/^@/, "").replace(/^t\.me\//i, "");
      return u ? `https://t.me/${u}` : "";
    }
    case "bale": {
      const u = v.replace(/^@/, "").replace(/^(ble\.ir|bale\.ai)\//i, "");
      return u ? `https://ble.ir/${u}` : "";
    }
    case "install":
      return v.includes(".") ? `https://${v}` : v;
    case "instagram": {
      const u = v.replace(/^@/, "").replace(/^(www\.)?instagram\.com\//i, "");
      return u ? `https://instagram.com/${u}` : "";
    }
    default:
      return v;
  }
}

export function resolveSocialHref(type: SocialLinkType, raw: string | undefined | null): string {
  if (!raw?.trim()) return "";
  return normalizeSocialUrl(type, raw);
}
