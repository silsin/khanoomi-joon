import { NextRequest } from "next/server";
import { requireAdmin, getAuthUser } from "@/lib/auth";
import { ok, error, serverError } from "@/lib/response";
import { getDb } from "@/lib/db";
import { THEME_PALETTES, FONT_SIZE_MIN, FONT_SIZE_MAX } from "@/lib/theme";
import { TYPO_SECTIONS, getDefaultTypoSettings, clampTypoSize } from "@/lib/typography";
import { parsePriceBarStyle, priceBarStyleToSettings, clampPriceBarFontSize } from "@/lib/price-bar-settings";
import {
  ABOUT_PAGE_SETTING_KEY,
  EMPTY_ABOUT_PAGE_SETTINGS,
  serializeAboutPageSettings,
} from "@/lib/about-page-settings";
import {
  CONTACT_PAGE_SETTING_KEY,
  EMPTY_CONTACT_PAGE_SETTINGS,
  serializeContactPageSettings,
} from "@/lib/contact-page-settings";
import {
  GUIDE_PAGES_SETTING_KEY,
  emptyGuidePagesSettings,
  serializeGuidePagesSettings,
} from "@/lib/guide-pages-settings";
import {
  COLLAB_PAGE_SETTING_KEY,
  DEFAULT_COLLAB_PAGE_SETTINGS,
  serializeCollabPageSettings,
} from "@/lib/collab-page-settings";
import {
  HOME_SECTIONS_SETTING_KEY,
  parseHomeSectionOrder,
} from "@/lib/home-sections";
import {
  PRODUCT_PAGE_SETTING_KEY,
  parseProductPageSettings,
  serializeProductPageSettings,
} from "@/lib/product-page-settings";
import {
  BUDGET_BANNERS_SETTING_KEY,
  DEFAULT_BUDGET_BANNERS,
  parseBudgetBanners,
  serializeBudgetBanners,
} from "@/lib/budget-banners";
import {
  CATEGORY_SHOWCASE_SETTING_KEY,
  DEFAULT_CATEGORY_SHOWCASE,
  parseCategoryShowcase,
  serializeCategoryShowcase,
} from "@/lib/category-showcase";

// Ensure settings table exists
function ensureSettingsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export async function GET(req: NextRequest) {
  try {
    ensureSettingsTable();
    const db = getDb();
    const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;

    // Defaults — empty strings, no hardcoded fake data
    if (!settings.gold_markup_percent) settings.gold_markup_percent = "5";
    if (!settings.gold_fixed_fee)      settings.gold_fixed_fee = "0";
    if (!settings.gold_tax_percent)    settings.gold_tax_percent = "0";
    // «دلی گلد» source gap — 0/0 = pass-through (public: harmless numbers).
    if (!settings.akbari_gap_percent)  settings.akbari_gap_percent = "0";
    if (!settings.akbari_gap_toman)    settings.akbari_gap_toman = "0";
    // Live gold-linked pricing is OFF by default — flipping this on changes how
    // every unlocked product is priced, so it must be an explicit decision.
    if (settings.live_pricing_enabled !== "0") settings.live_pricing_enabled = "0";
    if (!settings.theme_palette)       settings.theme_palette = "gold-dark";
    if (!settings.font_size_mobile)    settings.font_size_mobile = "14";
    if (!settings.font_size_desktop)   settings.font_size_desktop = "16";
    if (!settings.site_announcement)   settings.site_announcement = "";
    if (!settings.site_phone1)         settings.site_phone1 = "";
    if (!settings.site_phone2)         settings.site_phone2 = "";
    if (!settings.site_address)        settings.site_address = "";
    if (!settings.site_email)          settings.site_email = "";
    if (!settings.site_instagram)      settings.site_instagram = "";
    if (!settings.site_telegram)       settings.site_telegram = "";
    if (!settings.site_bale)           settings.site_bale = "";
    if (!settings.site_whatsapp)       settings.site_whatsapp = "";
    if (!settings.site_install_url)    settings.site_install_url = "";
    if (!settings.site_social_instagram_icon) settings.site_social_instagram_icon = "";
    if (!settings.site_social_telegram_icon)  settings.site_social_telegram_icon = "";
    if (!settings.site_social_bale_icon)      settings.site_social_bale_icon = "";
    if (!settings.site_social_whatsapp_icon)  settings.site_social_whatsapp_icon = "";
    if (!settings.site_social_install_icon)   settings.site_social_install_icon = "";
    if (!settings.site_brand_desc)     settings.site_brand_desc = "";
    if (!settings.special_offers_title)   settings.special_offers_title = "پیشنهاد شگفت انگیز";
    if (!settings.special_offers_href)    settings.special_offers_href = "/products";
    if (!settings.special_offers_enabled) settings.special_offers_enabled = "1";
    if (!settings.special_offers_end)     settings.special_offers_end = "";
    if (!settings.promo_b1_title)      settings.promo_b1_title = "";
    if (!settings.promo_b1_sub)        settings.promo_b1_sub = "";
    if (!settings.promo_b1_href)       settings.promo_b1_href = "/products";
    if (!settings.promo_b1_image)      settings.promo_b1_image = "";
    if (!settings.promo_b2_title)      settings.promo_b2_title = "";
    if (!settings.promo_b2_sub)        settings.promo_b2_sub = "";
    if (!settings.promo_b2_href)       settings.promo_b2_href = "/products";
    if (!settings.promo_b2_image)      settings.promo_b2_image = "";
    if (!settings.trust_items)         settings.trust_items = JSON.stringify([]);
    if (!settings.gapify_website_token) settings.gapify_website_token = "";
    if (!settings.tryon_enabled)       settings.tryon_enabled = "1";
    if (!settings[ABOUT_PAGE_SETTING_KEY]) {
      settings[ABOUT_PAGE_SETTING_KEY] = serializeAboutPageSettings(EMPTY_ABOUT_PAGE_SETTINGS);
    }
    if (!settings[CONTACT_PAGE_SETTING_KEY]) {
      settings[CONTACT_PAGE_SETTING_KEY] = serializeContactPageSettings(EMPTY_CONTACT_PAGE_SETTINGS);
    }
    if (!settings[GUIDE_PAGES_SETTING_KEY]) {
      settings[GUIDE_PAGES_SETTING_KEY] = serializeGuidePagesSettings(emptyGuidePagesSettings());
    }
    if (!settings[COLLAB_PAGE_SETTING_KEY]) {
      settings[COLLAB_PAGE_SETTING_KEY] = serializeCollabPageSettings(DEFAULT_COLLAB_PAGE_SETTINGS);
    }
    if (!settings[PRODUCT_PAGE_SETTING_KEY]) {
      settings[PRODUCT_PAGE_SETTING_KEY] = serializeProductPageSettings(parseProductPageSettings(null));
    }
    if (!settings[BUDGET_BANNERS_SETTING_KEY]) {
      settings[BUDGET_BANNERS_SETTING_KEY] = JSON.stringify(DEFAULT_BUDGET_BANNERS);
    }
    if (!settings[CATEGORY_SHOWCASE_SETTING_KEY]) {
      settings[CATEGORY_SHOWCASE_SETTING_KEY] = JSON.stringify(DEFAULT_CATEGORY_SHOWCASE);
    }
    const pb = parsePriceBarStyle(settings);
    Object.assign(settings, priceBarStyleToSettings(pb));

    // Typography defaults
    const typoDefaults = getDefaultTypoSettings();
    for (const [k, v] of Object.entries(typoDefaults)) {
      if (!settings[k]) settings[k] = v;
    }
    if (!settings.nav_links)           settings.nav_links = JSON.stringify([
      {"label":"هدیه","href":"/products"},{"label":"کالکشن","href":"/collections"},
      {"label":"تخفیف‌دار","href":"/products"},{"label":"✨ پرو مجازی","href":"/tryon"},
      {"label":"گردنبند","href":"/products?category=necklaces"},{"label":"گوشواره","href":"/products?category=earrings"},
      {"label":"انگشتر","href":"/products?category=rings"},{"label":"دستبند","href":"/products?category=bracelets"},
      {"label":"ست و نیم‌ست","href":"/products"},{"label":"پابند","href":"/products"},
      {"label":"جاسوئیچی","href":"/products"},{"label":"بچه‌گانه","href":"/products"},{"label":"سکه","href":"/products"}
    ]);
    if (!settings.promo_strip_links)   settings.promo_strip_links = JSON.stringify([
      {"label":"جدیدترین محصولات","href":"/products"},
      {"label":"جدیدترین گردنبندها","href":"/products?category=necklaces"},
      {"label":"خرید اقساطی طلا","href":"/contact"},
      {"label":"جدیدترین کالکشن‌ها","href":"/collections"},
      {"label":"پرفروش‌ترین محصولات","href":"/products"},
      {"label":"جدیدترین دستبندها","href":"/products?category=bracelets"},
      {"label":"جدیدترین گوشواره‌ها","href":"/products?category=earrings"},
      {"label":"محصولات ویژه","href":"/products"}
    ]);

    const user = getAuthUser(req);
    const isAdmin = user?.role === "ADMIN";
    if (isAdmin) {
      if (!settings.huggingface_api_token) settings.huggingface_api_token = "";
      // akbarigold.ir API credentials — visible to admins only.
      if (!settings.akbari_uid)   settings.akbari_uid = "";
      if (!settings.akbari_token) settings.akbari_token = "";
    } else {
      delete settings.huggingface_api_token;
      delete settings.akbari_uid;
      delete settings.akbari_token;
    }

    return ok(settings);
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = requireAdmin(req);
    if ("error" in result) return error(result.error, result.status);

    ensureSettingsTable();
    const db = getDb();
    const body = await req.json();

    for (const [key, rawValue] of Object.entries(body)) {
      let value: unknown = rawValue;
      if (key === "theme_palette") {
        const valid = THEME_PALETTES.some(p => p.id === String(value));
        if (!valid) return error("پالت رنگ نامعتبر است");
      }
      if (key === "font_size_mobile" || key === "font_size_desktop") {
        const n = parseInt(String(value), 10);
        if (Number.isNaN(n) || n < FONT_SIZE_MIN || n > FONT_SIZE_MAX) {
          return error(`اندازه فونت باید بین ${FONT_SIZE_MIN} تا ${FONT_SIZE_MAX} باشد`);
        }
      }
      if (/^typo_.+_size$/.test(key)) {
        const section = TYPO_SECTIONS.find(s => `${s.key}_size` === key);
        const fallback = section?.defaultSize ?? 14;
        value = String(clampTypoSize(value, fallback));
      }
      if (key === "price_bar_font_size") {
        value = String(clampPriceBarFontSize(value));
      }
      if (key === "promo_strip_font_size") {
        const n = parseInt(String(value), 10);
        value = String(Number.isNaN(n) ? 12 : Math.min(40, Math.max(8, n)));
      }
      if (key === "promo_strip_speed") {
        const n = parseInt(String(value), 10);
        value = String(Number.isNaN(n) ? 32 : Math.min(120, Math.max(5, n)));
      }
      if (key === HOME_SECTIONS_SETTING_KEY) {
        // Normalize: drop unknown/duplicate keys, append any missing sections
        value = JSON.stringify(parseHomeSectionOrder(String(value)));
      }
      if (key === "gold_tax_percent") {
        const n = parseFloat(String(value));
        value = String(Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n)));
      }
      if (key === "gold_price_source") {
        const v = String(value);
        value = v === "estjt" || v === "tgju" || v === "akbari" || v === "auto" ? v : "auto";
      }
      // Gap for the «دلی گلد» source — numeric with sane bounds so garbage
      // can never poison the live rate (percent ±100, toman ±10M per gram).
      if (key === "akbari_gap_percent") {
        const n = parseFloat(String(value));
        value = String(Number.isNaN(n) ? 0 : Math.min(100, Math.max(-100, Math.round(n * 100) / 100)));
      }
      if (key === "akbari_gap_toman") {
        const n = parseFloat(String(value));
        value = String(Number.isNaN(n) ? 0 : Math.min(10_000_000, Math.max(-10_000_000, Math.round(n))));
      }
      if (key === "live_pricing_enabled") {
        value = String(value) === "1" ? "1" : "0";
      }
      if (key === PRODUCT_PAGE_SETTING_KEY) {
        // Normalize the gift options / packaging line / FAQ accordion
        value = serializeProductPageSettings(parseProductPageSettings(String(value)));
      }
      if (key === BUDGET_BANNERS_SETTING_KEY) {
        // Normalize the budget banner list (add/remove/rename/recolor) —
        // colors become valid hex, counts are capped, garbage falls back.
        value = serializeBudgetBanners(parseBudgetBanners(String(value)));
      }
      if (key === CATEGORY_SHOWCASE_SETTING_KEY) {
        // Normalize the category showcase config (grid size, tile size,
        // grayscale, ordered tiles) — numbers clamped, garbage falls back.
        value = serializeCategoryShowcase(parseCategoryShowcase(String(value)));
      }
      db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run(key, String(value));
    }

    return ok({ saved: true });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
