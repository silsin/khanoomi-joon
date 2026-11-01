import { resolveSocialHref, type SocialLinkType } from "./social-links";

export interface SocialPlatform {
  type: SocialLinkType;
  label: string;
  labelFa: string;
  emoji: string;
  urlKey: string;
  iconKey: string;
  hover: string;
  placeholder: string;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    type: "instagram",
    label: "Instagram",
    labelFa: "اینستاگرام",
    emoji: "📸",
    urlKey: "site_instagram",
    iconKey: "site_social_instagram_icon",
    hover: "#e4405f",
    placeholder: "https://instagram.com/... یا @username",
  },
  {
    type: "telegram",
    label: "Telegram",
    labelFa: "تلگرام",
    emoji: "✈️",
    urlKey: "site_telegram",
    iconKey: "site_social_telegram_icon",
    hover: "#29a0dc",
    placeholder: "@username یا https://t.me/...",
  },
  {
    type: "bale",
    label: "Bale",
    labelFa: "بله",
    emoji: "💚",
    urlKey: "site_bale",
    iconKey: "site_social_bale_icon",
    hover: "#0cca7f",
    placeholder: "@username یا https://ble.ir/...",
  },
  {
    type: "whatsapp",
    label: "WhatsApp",
    labelFa: "واتساپ",
    emoji: "💬",
    urlKey: "site_whatsapp",
    iconKey: "site_social_whatsapp_icon",
    hover: "#25d366",
    placeholder: "0912... یا https://wa.me/...",
  },
  {
    type: "install",
    label: "Install",
    labelFa: "نصب اپ",
    emoji: "📲",
    urlKey: "site_install_url",
    iconKey: "site_social_install_icon",
    hover: "#c8a12a",
    placeholder: "https://... یا /install",
  },
];

export const SOCIAL_ICON_SETTING_KEYS = SOCIAL_PLATFORMS.map(p => p.iconKey);

export function getSocialIconUrl(
  settings: Record<string, string | undefined | null>,
  type: SocialLinkType,
): string {
  const platform = SOCIAL_PLATFORMS.find(p => p.type === type);
  if (!platform) return "";
  return (settings[platform.iconKey] ?? "").trim();
}

export interface SocialLinkItem {
  type: SocialLinkType;
  label: string;
  href: string;
  iconUrl: string;
  hover: string;
}

export function buildSocialLinks(settings: Record<string, string | undefined | null>): SocialLinkItem[] {
  return SOCIAL_PLATFORMS.map(p => ({
    type: p.type,
    label: p.label,
    href: resolveSocialHref(p.type, settings[p.urlKey]),
    iconUrl: getSocialIconUrl(settings, p.type),
    hover: p.hover,
  })).filter(s => s.href);
}

export function socialIconDefaults(): Record<string, string> {
  return Object.fromEntries(SOCIAL_ICON_SETTING_KEYS.map(k => [k, ""]));
}
