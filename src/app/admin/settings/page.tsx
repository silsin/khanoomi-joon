"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Save, RefreshCw, TrendingUp, Palette, Type, Monitor, Smartphone, Upload, Phone, MapPin, Mail, Globe, MessageCircle, Sparkles, ChevronUp, ChevronDown } from "lucide-react";
import {
  applyTheme,
  THEME_PALETTES,
  DEFAULT_PALETTE_ID,
  DEFAULT_FONT_MOBILE,
  DEFAULT_FONT_DESKTOP,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  parseThemeSettings,
} from "@/lib/theme";
import {
  FONT_OPTIONS,
  TYPO_SECTIONS,
  getDefaultTypoSettings,
  getFontFamily,
  buildGoogleFontsUrl,
  clampTypoSize,
} from "@/lib/typography";
import {
  DEFAULT_PRICE_BAR_STYLE,
  parsePriceBarStyle,
  priceBarStyleToSettings,
  PRICE_BAR_ALIGN_OPTIONS,
  PRICE_BAR_PART_LABELS,
  PRICE_BAR_FONT_SIZE_MIN,
  PRICE_BAR_FONT_SIZE_MAX,
  clampPriceBarFontSize,
  movePriceBarPartOrder,
  type PriceBarStyle,
} from "@/lib/price-bar-settings";
import PriceBarContent from "@/app/components/PriceBarContent";
import SliderTextSettings from "@/app/admin/components/SliderTextSettings";
import AboutPageSettings from "@/app/admin/components/AboutPageSettings";
import ContactPageSettings from "@/app/admin/components/ContactPageSettings";
import CollabPageSettings from "@/app/admin/components/CollabPageSettings";
import BudgetBannersSettings from "@/app/admin/components/BudgetBannersSettings";
import GuidePagesSettings from "@/app/admin/components/GuidePagesSettings";
import ProductPageSettings from "@/app/admin/components/ProductPageSettings";
import { SOCIAL_PLATFORMS } from "@/lib/social-platforms";
import type { SocialLinkType } from "@/lib/social-links";
import SocialIcon from "@/app/components/SocialIcon";

interface GoldData {
  price: number;
  history: number[];
  sourceTitle?: string;
  fallback?: boolean;
  stale?: boolean;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: "12px",
  padding: "24px",
};

const inp: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#121212",
  border: "1px solid #333",
  borderRadius: "6px",
  padding: "10px 12px",
  color: "#fff",
  fontSize: "14px",
  outline: "none",
  direction: "ltr",
};

export default function AdminSettingsPage() {
  const [markup, setMarkup] = useState("5");
  const [fixedFee, setFixedFee] = useState("0");
  const [tax, setTax] = useState("0");
  // «قیمت‌گذاری خودکار» — master switch for live gold-linked pricing.
  const [livePricing, setLivePricing] = useState(false);
  const [priceSource, setPriceSource] = useState("auto");
  // «نرخ لحظه‌ای» source credentials + optional gap (fourth price source)
  const [akbariUid, setAkbariUid] = useState("");
  const [akbariToken, setAkbariToken] = useState("");
  const [akbariGapPct, setAkbariGapPct] = useState("0");
  const [akbariGapToman, setAkbariGapToman] = useState("0");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [priceBar, setPriceBar] = useState<PriceBarStyle>(DEFAULT_PRICE_BAR_STYLE);
  const [savingPriceBar, setSavingPriceBar] = useState(false);
  const [priceBarSaved, setPriceBarSaved] = useState(false);

  // Load the selected price-bar font on demand so the preview updates instantly
  useEffect(() => {
    const id = priceBar.fontId?.trim();
    if (!id) return;
    const linkId = "pricebar-gfonts-preview";
    const url = buildGoogleFontsUrl([id]);
    if (!url) return;
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== url) link.href = url;
  }, [priceBar.fontId]);
  const [goldData, setGoldData] = useState<GoldData | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [themePalette, setThemePalette] = useState(DEFAULT_PALETTE_ID);
  const [fontMobile, setFontMobile] = useState(DEFAULT_FONT_MOBILE);
  const [fontDesktop, setFontDesktop] = useState(DEFAULT_FONT_DESKTOP);
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);

  // Site info fields
  const [announcement, setAnnouncement] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [telegram, setTelegram] = useState("");
  const [bale, setBale] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [installUrl, setInstallUrl] = useState("");
  const [socialIcons, setSocialIcons] = useState<Record<SocialLinkType, string>>({
    instagram: "", telegram: "", bale: "", whatsapp: "", install: "",
  });
  const [uploadingSocialIcon, setUploadingSocialIcon] = useState<SocialLinkType | null>(null);
  const socialIconRefs = useRef<Partial<Record<SocialLinkType, HTMLInputElement | null>>>({});
  const [brandDesc, setBrandDesc] = useState("");
  const [savingSite, setSavingSite] = useState(false);
  const [siteSaved, setSiteSaved] = useState(false);

  // Gapify live chat
  const [gapifyWebsiteToken, setGapifyWebsiteToken] = useState("");
  const [savingGapify, setSavingGapify] = useState(false);
  const [gapifySaved, setGapifySaved] = useState(false);

  // Hugging Face (virtual try-on AI)
  const [huggingfaceToken, setHuggingfaceToken] = useState("");
  const [tryonEnabled, setTryonEnabled] = useState(true);
  const [savingHf, setSavingHf] = useState(false);
  const [hfSaved, setHfSaved] = useState(false);

  // Typography
  const defaults = getDefaultTypoSettings();
  const [typo, setTypo] = useState<Record<string, string>>(defaults);
  const [savingTypo, setSavingTypo] = useState(false);
  const [savedTypo, setSavedTypo] = useState(false);

  async function uploadSocialIcon(type: SocialLinkType, file: File) {
    setUploadingSocialIcon(type);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setSocialIcons(prev => ({ ...prev, [type]: data.data.url }));
      }
    } catch {}
    finally { setUploadingSocialIcon(null); }
  }

  const previewTheme = useCallback((palette: string, mobile: string, desktop: string) => {
    applyTheme({
      theme_palette: palette,
      font_size_mobile: mobile,
      font_size_desktop: desktop,
    });
  }, []);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setMarkup(d.data.gold_markup_percent ?? "5");
          setFixedFee(d.data.gold_fixed_fee ?? "0");
          setTax(d.data.gold_tax_percent ?? "0");
          setLivePricing(d.data.live_pricing_enabled === "1" || d.data.live_pricing_enabled === "true");
          setPriceSource(
            d.data.gold_price_source === "estjt" || d.data.gold_price_source === "tgju" || d.data.gold_price_source === "akbari"
              ? d.data.gold_price_source
              : "auto"
          );
          setAkbariUid(d.data.akbari_uid ?? "");
          setAkbariToken(d.data.akbari_token ?? "");
          setAkbariGapPct(d.data.akbari_gap_percent ?? "0");
          setAkbariGapToman(d.data.akbari_gap_toman ?? "0");
          setPriceBar(parsePriceBarStyle(d.data));
          const theme = parseThemeSettings(d.data);
          setThemePalette(theme.theme_palette);
          setFontMobile(theme.font_size_mobile);
          setFontDesktop(theme.font_size_desktop);
          // Site info
          if (d.data.site_announcement) setAnnouncement(d.data.site_announcement);
          if (d.data.site_phone1)       setPhone1(d.data.site_phone1);
          if (d.data.site_phone2)       setPhone2(d.data.site_phone2);
          if (d.data.site_address)      setAddress(d.data.site_address);
          if (d.data.site_email)        setEmail(d.data.site_email);
          setInstagram(d.data.site_instagram ?? "");
          setTelegram(d.data.site_telegram ?? "");
          setBale(d.data.site_bale ?? "");
          setWhatsapp(d.data.site_whatsapp ?? "");
          setInstallUrl(d.data.site_install_url ?? "");
          setSocialIcons(Object.fromEntries(
            SOCIAL_PLATFORMS.map(p => [p.type, d.data[p.iconKey] ?? ""]),
          ) as Record<SocialLinkType, string>);
          if (d.data.site_brand_desc)   setBrandDesc(d.data.site_brand_desc);
          setGapifyWebsiteToken(d.data.gapify_website_token ?? "");
          setHuggingfaceToken(d.data.huggingface_api_token ?? "");
          setTryonEnabled((d.data.tryon_enabled ?? "1") !== "0");
          // Typography
          const typoUpdate: Record<string, string> = { ...getDefaultTypoSettings() };
          for (const s of TYPO_SECTIONS) {
            if (d.data[`${s.key}_font`]) typoUpdate[`${s.key}_font`] = d.data[`${s.key}_font`];
            if (d.data[`${s.key}_size`]) typoUpdate[`${s.key}_size`] = d.data[`${s.key}_size`];
          }
          setTypo(typoUpdate);
        }
      });

    fetch("/api/admin/gold-price")
      .then(r => r.json())
      .then(d => { if (d.success) setGoldData(d.data); })
      .finally(() => setLoadingPrice(false));
  }, []);

  function handlePaletteChange(id: string) {
    setThemePalette(id);
    previewTheme(id, fontMobile, fontDesktop);
  }

  function handleFontMobileChange(value: string) {
    setFontMobile(value);
    previewTheme(themePalette, value, fontDesktop);
  }

  function handleFontDesktopChange(value: string) {
    setFontDesktop(value);
    previewTheme(themePalette, fontMobile, value);
  }

  async function handleSavePricing() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gold_markup_percent: markup,
        gold_fixed_fee: fixedFee,
        gold_tax_percent: tax,
        gold_price_source: priceSource,
        akbari_uid: akbariUid.trim(),
        akbari_token: akbariToken.trim(),
        akbari_gap_percent: akbariGapPct.trim() || "0",
        akbari_gap_toman: akbariGapToman.trim() || "0",
        live_pricing_enabled: livePricing ? "1" : "0",
      }),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  }

  async function handleSavePriceBar() {
    setSavingPriceBar(true);
    setPriceBarSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(priceBarStyleToSettings(priceBar)),
    });
    if (res.ok) {
      setPriceBarSaved(true);
      setTimeout(() => setPriceBarSaved(false), 3000);
    }
    setSavingPriceBar(false);
  }

  function updatePriceBar<K extends keyof PriceBarStyle>(key: K, value: PriceBarStyle[K]) {
    setPriceBar(prev => ({ ...prev, [key]: value }));
  }

  function movePriceBarPart(index: number, direction: -1 | 1) {
    setPriceBar(prev => ({
      ...prev,
      partOrder: movePriceBarPartOrder(prev.partOrder, index, direction),
    }));
  }

  async function handleSaveTheme() {
    setSavingTheme(true);
    setThemeSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme_palette: themePalette,
        font_size_mobile: fontMobile,
        font_size_desktop: fontDesktop,
      }),
    });
    if (res.ok) {
      setThemeSaved(true);
      previewTheme(themePalette, fontMobile, fontDesktop);
      setTimeout(() => setThemeSaved(false), 3000);
    }
    setSavingTheme(false);
  }

  async function handleSaveHuggingface() {
    setSavingHf(true);
    setHfSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        huggingface_api_token: huggingfaceToken.trim(),
        tryon_enabled: tryonEnabled ? "1" : "0",
      }),
    });
    if (res.ok) {
      setHfSaved(true);
      setTimeout(() => setHfSaved(false), 3000);
    }
    setSavingHf(false);
  }

  async function handleSaveGapify() {
    setSavingGapify(true);
    setGapifySaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gapify_website_token: gapifyWebsiteToken.trim(),
      }),
    });
    if (res.ok) {
      setGapifySaved(true);
      setTimeout(() => setGapifySaved(false), 3000);
    }
    setSavingGapify(false);
  }

  async function handleSaveSiteInfo() {
    setSavingSite(true); setSiteSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site_announcement: announcement,
        site_phone1: phone1,
        site_phone2: phone2,
        site_address: address,
        site_email: email,
        site_instagram: instagram,
        site_telegram: telegram,
        site_bale: bale,
        site_whatsapp: whatsapp,
        site_install_url: installUrl,
        site_brand_desc: brandDesc,
        ...Object.fromEntries(SOCIAL_PLATFORMS.map(p => [p.iconKey, socialIcons[p.type] ?? ""])),
      }),
    });
    if (res.ok) { setSiteSaved(true); setTimeout(() => setSiteSaved(false), 3000); }
    setSavingSite(false);
  }

  async function handleSaveTypography() {
    setSavingTypo(true); setSavedTypo(false);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(typo),
    });
    // Apply immediately to the page
    const root = document.documentElement;
    for (const s of TYPO_SECTIONS) {
      const fontId = typo[`${s.key}_font`] || s.defaultFont;
      const size   = typo[`${s.key}_size`] || String(s.defaultSize);
      root.style.setProperty(s.cssFont, getFontFamily(fontId));
      root.style.setProperty(s.cssSize, `${size}px`);
    }
    // Reload fonts
    const url = buildGoogleFontsUrl(TYPO_SECTIONS.map(s => typo[`${s.key}_font`] || s.defaultFont));
    if (url) {
      const existing = document.getElementById("dynamic-gfonts");
      if (existing) existing.remove();
      const link = document.createElement("link");
      link.id = "dynamic-gfonts"; link.rel = "stylesheet"; link.href = url;
      document.head.appendChild(link);
    }
    setSavedTypo(true); setTimeout(() => setSavedTypo(false), 3000);
    setSavingTypo(false);
  }

  const basePrice = goldData?.price ?? 0;
  /** The rate live pricing uses — the poller publishes this same figure. */
  const liveRate = goldData?.price ?? 0;
  const markupNum = parseFloat(markup) || 0;
  const fixedNum = parseFloat(fixedFee) || 0;
  const taxNum = parseFloat(tax) || 0;
  const ajratNum = Math.round(basePrice * (markupNum / 100) + fixedNum);
  const taxAmount = taxNum > 0 ? Math.round(ajratNum * (taxNum / 100)) : 0;
  const finalPrice = Math.round(basePrice + ajratNum + taxAmount);
  const activePalette = THEME_PALETTES.find(p => p.id === themePalette) ?? THEME_PALETTES[0];

  return (
    <div style={{ maxWidth: "720px" }}>
      <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: "700", marginBottom: "24px" }}>تنظیمات</h2>

      {/* ── Top price bar (first — easy to find) ── */}
      <div id="price-bar-settings" style={{ ...cardStyle, padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <TrendingUp size={16} color="#d4af37" />
          <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>نوار قیمت بالای سایت — متن و رنگ</h3>
        </div>
        <p style={{ color: "#666", fontSize: "12px", marginBottom: "14px", lineHeight: 1.6 }}>
          نوار قرمز بالای صفحه اصلی. متن، رنگ، ترتیب و چیدمان هر بخش را تنظیم کنید.
        </p>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "8px" }}>ترتیب نمایش ۴ بخش</label>
          <p style={{ color: "#555", fontSize: "11px", marginBottom: "10px", lineHeight: 1.5 }}>
            با دکمه‌های بالا/پایین جای هر بخش را عوض کنید — مثلاً «متن اول» و «متن دوم» را جابه‌جا کنید.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {priceBar.partOrder.map((partId, index) => {
              const previewText =
                partId === "label" ? priceBar.labelText :
                partId === "gold" ? priceBar.goldText :
                partId === "amount" ? finalPrice.toLocaleString("fa-IR") :
                priceBar.currencyText;

              return (
                <div
                  key={partId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    backgroundColor: "#121212",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <button
                      type="button"
                      aria-label="انتقال به بالا"
                      disabled={index === 0}
                      onClick={() => movePriceBarPart(index, -1)}
                      style={{
                        width: "28px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: index === 0 ? "#1a1a1a" : "#222",
                        border: "1px solid #333",
                        borderRadius: "5px",
                        color: index === 0 ? "#444" : "#aaa",
                        cursor: index === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="انتقال به پایین"
                      disabled={index === priceBar.partOrder.length - 1}
                      onClick={() => movePriceBarPart(index, 1)}
                      style={{
                        width: "28px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: index === priceBar.partOrder.length - 1 ? "#1a1a1a" : "#222",
                        border: "1px solid #333",
                        borderRadius: "5px",
                        color: index === priceBar.partOrder.length - 1 ? "#444" : "#aaa",
                        cursor: index === priceBar.partOrder.length - 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#d4af37", fontSize: "12px", fontWeight: "700", marginBottom: "2px" }}>
                      {index + 1}. {PRICE_BAR_PART_LABELS[partId]}
                    </p>
                    <p style={{ color: "#888", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {previewText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "8px" }}>تراز متن در نوار</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {PRICE_BAR_ALIGN_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => updatePriceBar("align", opt.id)}
                style={{
                  flex: 1,
                  minWidth: "72px",
                  backgroundColor: priceBar.align === opt.id ? "rgba(212,175,55,0.15)" : "#121212",
                  border: `1px solid ${priceBar.align === opt.id ? "rgba(212,175,55,0.5)" : "#333"}`,
                  color: priceBar.align === opt.id ? "#d4af37" : "#888",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontWeight: priceBar.align === opt.id ? 700 : 500,
                  fontSize: "13px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "8px" }}>فونت نوار قیمت</label>
          <select
            value={priceBar.fontId}
            onChange={e => updatePriceBar("fontId", e.target.value)}
            style={{ ...inp, direction: "rtl", fontFamily: getFontFamily(priceBar.fontId) }}
          >
            {FONT_OPTIONS.map(f => (
              <option key={f.id} value={f.id}>{f.label} — {f.style}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "8px" }}>
            اندازه فونت نوار قیمت (۸ تا ۲۰۰) — <span style={{ color: "#d4af37", fontWeight: 700 }}>{priceBar.fontSize}px</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="range"
              min={PRICE_BAR_FONT_SIZE_MIN}
              max={PRICE_BAR_FONT_SIZE_MAX}
              step={1}
              value={Math.min(PRICE_BAR_FONT_SIZE_MAX, Math.max(PRICE_BAR_FONT_SIZE_MIN, priceBar.fontSize || 12))}
              onChange={e => updatePriceBar("fontSize", parseInt(e.target.value, 10) || 12)}
              style={{ flex: 1, accentColor: "#d4af37" }}
            />
            <input
              type="number"
              min={PRICE_BAR_FONT_SIZE_MIN}
              max={PRICE_BAR_FONT_SIZE_MAX}
              value={String(priceBar.fontSize ?? "")}
              onChange={e => {
                const raw = e.target.value;
                if (raw === "") { updatePriceBar("fontSize", 12); return; }
                const n = parseInt(raw, 10);
                updatePriceBar("fontSize", Number.isNaN(n) ? 12 : n);
              }}
              onBlur={e => updatePriceBar("fontSize", clampPriceBarFontSize(e.target.value))}
              style={{ width: "70px", backgroundColor: "#121212", border: "1px solid #333", borderRadius: "5px", padding: "6px 8px", color: "#fff", fontSize: "12px", outline: "none", direction: "ltr", textAlign: "center" }}
            />
          </div>
          <p style={{
            color: "#e0d4a0", marginTop: "10px", lineHeight: 1.6,
            fontFamily: getFontFamily(priceBar.fontId), fontSize: `${priceBar.fontSize}px`,
            backgroundColor: "#121212", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "10px 14px",
          }}>
            پیش‌نمایش: {priceBar.labelText} {priceBar.goldText} {finalPrice.toLocaleString("fa-IR")} {priceBar.currencyText}
          </p>
        </div>

        <div style={{
          background: "linear-gradient(135deg, #7b1a1a 0%, #8b2020 40%, #7b1a1a 100%)",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "18px",
          overflow: "hidden",
        }}>
          <PriceBarContent
            style={priceBar}
            amount={finalPrice.toLocaleString("fa-IR")}
            showDecorations={true}
          />
        </div>

        {[
          { key: "labelText" as const, colorKey: "labelColor" as const, title: "متن اول (مثلاً قیمت)", hasText: true },
          { key: "goldText" as const, colorKey: "goldColor" as const, title: "متن دوم (مثلاً طلا)", hasText: true },
          { key: null, colorKey: "amountColor" as const, title: "رنگ عدد قیمت", hasText: false },
          { key: "currencyText" as const, colorKey: "currencyColor" as const, title: "متن واحد (مثلاً تومان)", hasText: true },
        ].map((row, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: row.hasText ? "1fr 110px 48px" : "1fr 110px 48px", gap: "10px", alignItems: "end", marginBottom: "12px" }}>
            <div>
              <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "5px" }}>{row.title}</label>
              {row.hasText && row.key ? (
                <input
                  value={priceBar[row.key]}
                  onChange={e => updatePriceBar(row.key!, e.target.value)}
                  style={{ ...inp, direction: "rtl" }}
                />
              ) : (
                <div style={{ ...inp, color: "#555", display: "flex", alignItems: "center" }}>از API قیمت لحظه‌ای</div>
              )}
            </div>
            <div>
              <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "5px" }}>رنگ</label>
              <input
                value={priceBar[row.colorKey]}
                onChange={e => updatePriceBar(row.colorKey, e.target.value)}
                style={inp}
                placeholder="#ffffff"
              />
            </div>
            <div>
              <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "5px" }}>&nbsp;</label>
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(priceBar[row.colorKey]) ? priceBar[row.colorKey] : "#ffffff"}
                onChange={e => updatePriceBar(row.colorKey, e.target.value)}
                style={{ width: "48px", height: "42px", padding: "2px", border: "1px solid #333", borderRadius: "6px", backgroundColor: "#121212", cursor: "pointer" }}
                aria-label={`انتخاب ${row.title}`}
              />
            </div>
          </div>
        ))}

        {priceBarSaved && (
          <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#10b981", fontSize: "13px" }}>
            ✓ ظاهر نوار قیمت ذخیره شد
          </div>
        )}

        <button
          type="button"
          onClick={handleSavePriceBar}
          disabled={savingPriceBar}
          style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: savingPriceBar ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "11px 24px", fontWeight: "700", fontSize: "14px", cursor: savingPriceBar ? "not-allowed" : "pointer", fontFamily: "inherit" }}
        >
          {savingPriceBar ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
          {savingPriceBar ? "در حال ذخیره..." : "ذخیره ظاهر نوار قیمت"}
        </button>
      </div>

      <SliderTextSettings />

      <GuidePagesSettings />

      <ProductPageSettings />

      <AboutPageSettings />

      <ContactPageSettings />

      <CollabPageSettings />

      <BudgetBannersSettings />

      {/* ── Site Info ── */}
      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          <Globe size={18} color="#d4af37" />
          <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>اطلاعات تماس و سایت</h3>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "5px" }}>متن نوار اطلاع‌رسانی بالای سایت</label>
          <input value={announcement} onChange={e => setAnnouncement(e.target.value)} style={{ ...inp, direction: "rtl" }} placeholder="مثال: با اعتماد شما، سال‌ها طلایی ساختیم." />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
          <div>
            <label style={{ color: "#888", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
              <Phone size={12} /> شماره تلفن ۱
            </label>
            <input value={phone1} onChange={e => setPhone1(e.target.value)} style={inp} placeholder="021-1234-5678" />
          </div>
          <div>
            <label style={{ color: "#888", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
              <Phone size={12} /> شماره تلفن ۲
            </label>
            <input value={phone2} onChange={e => setPhone2(e.target.value)} style={inp} placeholder="021-9074-3457" />
          </div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ color: "#888", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
            <MapPin size={12} /> آدرس فیزیکی
          </label>
          <input value={address} onChange={e => setAddress(e.target.value)} style={{ ...inp, direction: "rtl" }} placeholder="تهران، ..." />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
          <div>
            <label style={{ color: "#888", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
              <Mail size={12} /> ایمیل
            </label>
            <input value={email} onChange={e => setEmail(e.target.value)} style={inp} placeholder="info@dellygold.com" />
          </div>
          <div>
            <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "5px" }}>توضیح برند (فوتر)</label>
            <input value={brandDesc} onChange={e => setBrandDesc(e.target.value)} style={{ ...inp, direction: "rtl" }} placeholder="معرفی کوتاه برند..." />
          </div>
        </div>

        <p style={{ color: "#666", fontSize: "12px", marginBottom: "14px", lineHeight: 1.6 }}>
          لینک و آیکن هر شبکه را جداگانه تنظیم کنید. اگر آیکن سفارشی نگذارید، آیکن پیش‌فرض نمایش داده می‌شود.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "14px" }}>
          {SOCIAL_PLATFORMS.map(p => {
            const urlVal =
              p.type === "instagram" ? instagram :
              p.type === "telegram" ? telegram :
              p.type === "bale" ? bale :
              p.type === "whatsapp" ? whatsapp :
              installUrl;
            const setUrl =
              p.type === "instagram" ? setInstagram :
              p.type === "telegram" ? setTelegram :
              p.type === "bale" ? setBale :
              p.type === "whatsapp" ? setWhatsapp :
              setInstallUrl;
            const iconVal = socialIcons[p.type] ?? "";

            return (
              <div key={p.type} style={{ padding: "14px", backgroundColor: "#121212", borderRadius: "8px", border: "1px solid #2a2a2a" }}>
                <p style={{ color: "#d4af37", fontSize: "12px", fontWeight: "700", marginBottom: "10px" }}>
                  {p.emoji} {p.labelFa}
                </p>
                <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>لینک</label>
                <input
                  value={urlVal}
                  onChange={e => setUrl(e.target.value)}
                  style={{ ...inp, fontSize: "13px", padding: "8px 10px", marginBottom: "10px" }}
                  placeholder={p.placeholder}
                />
                <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "6px" }}>آیکن (PNG/SVG)</label>
                <input
                  ref={el => { socialIconRefs.current[p.type] = el; }}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) uploadSocialIcon(p.type, f);
                    e.target.value = "";
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ width: "44px", height: "44px", backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", flexShrink: 0 }}>
                    <SocialIcon type={p.type} size={22} imageUrl={iconVal} />
                  </div>
                  {iconVal ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setSocialIcons(prev => ({ ...prev, [p.type]: "" }))}
                        style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        حذف آیکن
                      </button>
                      <button
                        type="button"
                        onClick={() => socialIconRefs.current[p.type]?.click()}
                        disabled={uploadingSocialIcon === p.type}
                        style={{ backgroundColor: "#222", color: "#ccc", border: "1px solid #444", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        {uploadingSocialIcon === p.type ? "در حال آپلود..." : "تغییر تصویر"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => socialIconRefs.current[p.type]?.click()}
                      disabled={uploadingSocialIcon === p.type}
                      style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#222", color: "#aaa", border: "1px dashed #444", borderRadius: "6px", padding: "8px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <Upload size={13} />
                      {uploadingSocialIcon === p.type ? "در حال آپلود..." : "آپلود آیکن سفارشی"}
                    </button>
                  )}
                </div>
                <input
                  value={iconVal}
                  onChange={e => setSocialIcons(prev => ({ ...prev, [p.type]: e.target.value }))}
                  style={{ ...inp, fontSize: "12px", padding: "7px 10px", marginTop: "8px" }}
                  placeholder="یا آدرس URL آیکن (مثلاً /bale-icon.svg)"
                />
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: "20px" }} />

        {siteSaved && <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#10b981", fontSize: "13px" }}>✓ اطلاعات سایت ذخیره شد</div>}
        <button onClick={handleSaveSiteInfo} disabled={savingSite}
          style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: savingSite ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "11px 24px", fontWeight: "700", fontSize: "14px", cursor: savingSite ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {savingSite ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
          {savingSite ? "در حال ذخیره..." : "ذخیره اطلاعات تماس"}
        </button>
      </div>

      {/* ── Live Chat (Gapify) ── */}
      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          <MessageCircle size={18} color="#d4af37" />
          <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>چت آنلاین (گپیفای)</h3>
        </div>

        <p style={{ color: "#888", fontSize: "13px", marginBottom: "16px", lineHeight: 1.6 }}>
          پس از ثبت‌نام در{" "}
          <a href="https://gapify.ai" target="_blank" rel="noopener noreferrer" style={{ color: "#d4af37" }}>
            گپیفای
          </a>
          ، از بخش Integrations → Website Widget در{" "}
          <a href="https://app.gapify.ai" target="_blank" rel="noopener noreferrer" style={{ color: "#d4af37" }}>
            پنل گپیفای
          </a>
          ، Website Token را کپی و در فیلد زیر وارد کنید.
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "5px" }}>Website Token</label>
          <input
            value={gapifyWebsiteToken}
            onChange={e => setGapifyWebsiteToken(e.target.value)}
            style={inp}
            placeholder="توکن ویجت وبسایت از پنل گپیفای"
          />
        </div>

        {gapifySaved && (
          <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#10b981", fontSize: "13px" }}>
            ✓ تنظیمات چت آنلاین ذخیره شد
          </div>
        )}

        <button
          type="button"
          onClick={handleSaveGapify}
          disabled={savingGapify}
          style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: savingGapify ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "11px 24px", fontWeight: "700", fontSize: "14px", cursor: savingGapify ? "not-allowed" : "pointer", fontFamily: "inherit" }}
        >
          {savingGapify ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
          {savingGapify ? "در حال ذخیره..." : "ذخیره چت آنلاین"}
        </button>
      </div>

      {/* ── Hugging Face (Virtual Try-On AI) ── */}
      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          <Sparkles size={18} color="#d4af37" />
          <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>پرو مجازی (Hugging Face)</h3>
        </div>

        <p style={{ color: "#888", fontSize: "13px", marginBottom: "16px", lineHeight: 1.6 }}>
          توکن رایگان از{" "}
          <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ color: "#d4af37" }}>
            huggingface.co/settings/tokens
          </a>
          {" "}بسازید. هنگام ساخت توکن، حتماً دسترسی <strong style={{ color: "#ccc" }}>Make calls to Inference Providers</strong> را فعال کنید.
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px", padding: "14px 16px", backgroundColor: "#121212", border: "1px solid #333", borderRadius: "8px" }}>
          <div>
            <p style={{ color: "#fff", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>نمایش پرو مجازی در سایت</p>
            <p style={{ color: "#666", fontSize: "12px", lineHeight: 1.5 }}>با غیرفعال کردن، لینک منو و صفحه پرو مجازی برای مشتریان مخفی می‌شود.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={tryonEnabled}
            aria-label="نمایش پرو مجازی در سایت"
            onClick={() => setTryonEnabled(v => !v)}
            style={{
              flexShrink: 0,
              width: "52px",
              height: "28px",
              borderRadius: "14px",
              border: "none",
              cursor: "pointer",
              backgroundColor: tryonEnabled ? "#10b981" : "#444",
              position: "relative",
              transition: "background-color 0.2s",
            }}
          >
            <span style={{
              position: "absolute",
              top: "3px",
              left: tryonEnabled ? "27px" : "3px",
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              backgroundColor: "#fff",
              transition: "left 0.2s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            }} />
          </button>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "5px" }}>API Token</label>
          <input
            type="password"
            value={huggingfaceToken}
            onChange={e => setHuggingfaceToken(e.target.value)}
            style={inp}
            placeholder="hf_xxxxxxxxxxxxxxxx"
            autoComplete="off"
          />
        </div>

        {hfSaved && (
          <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#10b981", fontSize: "13px" }}>
            ✓ تنظیمات پرو مجازی ذخیره شد
          </div>
        )}

        <button
          type="button"
          onClick={handleSaveHuggingface}
          disabled={savingHf}
          style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: savingHf ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "11px 24px", fontWeight: "700", fontSize: "14px", cursor: savingHf ? "not-allowed" : "pointer", fontFamily: "inherit" }}
        >
          {savingHf ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
          {savingHf ? "در حال ذخیره..." : "ذخیره تنظیمات پرو مجازی"}
        </button>
      </div>

      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          <Palette size={18} color="#d4af37" />
          <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>ظاهر و تم سایت</h3>
        </div>

        <p style={{ color: "#888", fontSize: "13px", marginBottom: "16px", lineHeight: 1.6 }}>
          پالت رنگ پس‌زمینه و اندازه فونت را برای موبایل و دسکتاپ انتخاب کنید. تغییرات بلافاصله در پیش‌نمایش اعمال می‌شوند.
        </p>

        {/* Palette grid */}
        <label style={{ color: "#888", fontSize: "13px", display: "block", marginBottom: "10px" }}>پالت رنگ</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px", marginBottom: "24px" }}>
          {THEME_PALETTES.map(p => {
            const selected = themePalette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePaletteChange(p.id)}
                style={{
                  background: "none",
                  border: `2px solid ${selected ? "#d4af37" : "#333"}`,
                  borderRadius: "10px",
                  padding: "10px",
                  cursor: "pointer",
                  textAlign: "center",
                  fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
              >
                <div style={{ display: "flex", gap: "4px", marginBottom: "8px", justifyContent: "center" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: p.bg, border: "1px solid #444" }} />
                  <span style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: p.accent }} />
                  <span style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: p.card, border: "1px solid #444" }} />
                </div>
                <span style={{ color: selected ? "#d4af37" : "#aaa", fontSize: "11px", fontWeight: selected ? "700" : "400" }}>
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Font sizes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div>
            <label style={{ color: "#888", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Smartphone size={14} /> اندازه فونت موبایل
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="range"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                step={1}
                value={Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, parseInt(fontMobile) || 14))}
                onChange={e => handleFontMobileChange(e.target.value)}
                style={{ flex: 1, accentColor: "#d4af37" }}
              />
              <input
                type="number"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                value={fontMobile}
                onChange={e => handleFontMobileChange(e.target.value)}
                style={{ width: "64px", backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "5px", padding: "4px 8px", color: "#fff", fontSize: "12px", outline: "none", direction: "ltr", textAlign: "center" }}
              />
              <span style={{ color: "#d4af37", fontSize: "14px", fontWeight: "700", minWidth: "36px", direction: "ltr" }}>
                {fontMobile}px
              </span>
            </div>
          </div>
          <div>
            <label style={{ color: "#888", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Monitor size={14} /> اندازه فونت دسکتاپ
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="range"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                step={1}
                value={Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, parseInt(fontDesktop) || 16))}
                onChange={e => handleFontDesktopChange(e.target.value)}
                style={{ flex: 1, accentColor: "#d4af37" }}
              />
              <input
                type="number"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                value={fontDesktop}
                onChange={e => handleFontDesktopChange(e.target.value)}
                style={{ width: "64px", backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "5px", padding: "4px 8px", color: "#fff", fontSize: "12px", outline: "none", direction: "ltr", textAlign: "center" }}
              />
              <span style={{ color: "#d4af37", fontSize: "14px", fontWeight: "700", minWidth: "36px", direction: "ltr" }}>
                {fontDesktop}px
              </span>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ color: "#888", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
            <Type size={14} /> پیش‌نمایش
          </label>
          <div
            style={{
              backgroundColor: activePalette.bg,
              border: `1px solid ${activePalette.border}`,
              borderRadius: "10px",
              padding: "16px",
              transition: "background-color 0.25s",
            }}
          >
            <div style={{ backgroundColor: activePalette.card, border: `1px solid ${activePalette.border}`, borderRadius: "8px", padding: "14px" }}>
              <p style={{ color: activePalette.accent, fontWeight: "700", fontSize: `${fontMobile}px`, marginBottom: "6px" }}>
                دلی گلد — نمونه موبایل ({fontMobile}px)
              </p>
              <p style={{ color: activePalette.textMuted, fontSize: `${Math.max(parseInt(fontMobile) - 2, 11)}px`, marginBottom: "10px" }}>
                متن توضیحات با رنگ ثانویه
              </p>
              <p style={{ color: activePalette.text, fontSize: `${fontDesktop}px`, fontWeight: "600" }}>
                نمونه دسکتاپ ({fontDesktop}px)
              </p>
              <button
                type="button"
                style={{
                  marginTop: "12px",
                  backgroundColor: activePalette.accent,
                  color: activePalette.id === "cream-light" ? "#fff" : "#000",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "default",
                }}
              >
                دکمه نمونه
              </button>
            </div>
          </div>
        </div>

        {themeSaved && (
          <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "16px", color: "#10b981", fontSize: "13px" }}>
            ✓ تنظیمات ظاهر ذخیره شد
          </div>
        )}

        <button
          type="button"
          onClick={handleSaveTheme}
          disabled={savingTheme}
          style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: savingTheme ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "11px 24px", fontWeight: "700", fontSize: "14px", cursor: savingTheme ? "not-allowed" : "pointer", fontFamily: "inherit" }}
        >
          {savingTheme ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
          {savingTheme ? "در حال ذخیره..." : "ذخیره ظاهر سایت"}
        </button>
      </div>

      {/* ── Pricing section ── */}
      <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>قیمت‌گذاری</h3>

      <div style={{ ...cardStyle, padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <TrendingUp size={16} color="#d4af37" />
          <h3 style={{ color: "#fff", fontSize: "14px", fontWeight: "600" }}>قیمت لحظه‌ای طلا (۱۸ عیار)</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { label: "قیمت بازار", value: loadingPrice ? "..." : `${basePrice.toLocaleString("fa-IR")} ت` },
            { label: "سود شما", value: `${markupNum}% + ${fixedNum.toLocaleString("fa-IR")} ت` },
            { label: "مالیات بر اجرت", value: `${taxNum}%` },
            { label: "قیمت فروش", value: loadingPrice ? "..." : `${finalPrice.toLocaleString("fa-IR")} ت`, highlight: true },
          ].map((item, i) => (
            <div key={i} style={{ backgroundColor: item.highlight ? "rgba(212,175,55,0.1)" : "#121212", border: `1px solid ${item.highlight ? "rgba(212,175,55,0.3)" : "#2a2a2a"}`, borderRadius: "8px", padding: "12px", textAlign: "center" }}>
              <p style={{ color: "#888", fontSize: "11px", marginBottom: "4px" }}>{item.label}</p>
              <p style={{ color: item.highlight ? "#d4af37" : "#fff", fontSize: "13px", fontWeight: "700" }}>{item.value}</p>
            </div>
          ))}
        </div>
        {goldData?.fallback && (
          <p style={{ color: "#f59e0b", fontSize: "11px", marginTop: "8px" }}>⚠️ قیمت پیش‌فرض — سرویس خارجی در دسترس نیست</p>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600", marginBottom: "20px" }}>تنظیم سود و اجرت</h3>

        {/* ── Master switch: live pricing ── */}
        <div style={{ marginBottom: "20px", backgroundColor: livePricing ? "rgba(212,175,55,0.07)" : "#121212", border: `1px solid ${livePricing ? "rgba(212,175,55,0.35)" : "#2a2a2a"}`, borderRadius: "10px", padding: "14px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <div onClick={() => setLivePricing(v => !v)}
              style={{ width: "40px", height: "22px", borderRadius: "11px", backgroundColor: livePricing ? "#d4af37" : "#333", position: "relative", cursor: "pointer", transition: "background-color 0.2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: "3px", left: livePricing ? "21px" : "3px", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#fff", transition: "left 0.2s" }} />
            </div>
            <div>
              <p style={{ color: "#fff", fontSize: "13px", fontWeight: "600", margin: 0 }}>قیمت‌گذاری خودکار بر اساس نرخ لحظه‌ای طلا</p>
              <p style={{ color: "#666", fontSize: "11px", margin: "2px 0 0" }}>
                {livePricing
                  ? "✅ روشن — قیمت پایه هر محصول از نرخ روز × وزن × عیار محاسبه و اجرت روی آن اعمال می‌شود"
                  : "خاموش — قیمت پایه همان مقداری است که در فرم محصول ذخیره شده"}
              </p>
            </div>
          </label>
          {livePricing && (
            <div style={{ marginTop: "10px", borderTop: "1px solid #222", paddingTop: "10px" }}>
              <p style={{ color: "#888", fontSize: "11px", lineHeight: 1.9, margin: 0 }}>
                نرخ لحظه‌ای مصرف‌شده:{" "}
                <span style={{ color: "#d4af37", fontWeight: 700 }}>
                  {liveRate > 0 ? `${liveRate.toLocaleString("fa-IR")} تومان / گرم (۱۸ عیار)` : "در دسترس نیست"}
                </span>
                <br />
                محاسبه: قیمت پایه = نرخ ۱۸ عیار × وزن × (عیار ÷ ۱۸) — سپس اجرت و مالیات روی آن اعمال می‌شود.
                <br />
                هر محصولی که در فرم محصول «قیمت ثابت» داشته باشد، از این محاسبه مستثنا می‌ماند.
              </p>
            </div>
          )}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ color: "#888", fontSize: "13px", display: "block", marginBottom: "6px" }}>
            درصد سود (%) <span style={{ color: "#555", fontSize: "11px" }}>— روی قیمت بازار اعمال می‌شود</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="number" value={markup} onChange={e => setMarkup(e.target.value)} min="0" max="100" step="0.5" style={{ ...inp, flex: 1 }} />
            <span style={{ color: "#888", fontSize: "14px", flexShrink: 0 }}>%</span>
          </div>
          <input type="range" min="0" max="50" step="0.5" value={markup} onChange={e => setMarkup(e.target.value)} style={{ width: "100%", marginTop: "8px", accentColor: "#d4af37" }} />
          <div style={{ display: "flex", justifyContent: "space-between", color: "#555", fontSize: "10px" }}>
            <span>۰%</span><span>۲۵%</span><span>۵۰%</span>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ color: "#888", fontSize: "13px", display: "block", marginBottom: "6px" }}>
            اجرت ثابت (تومان) <span style={{ color: "#555", fontSize: "11px" }}>— مبلغ ثابت به هر گرم افزوده می‌شود</span>
          </label>
          <input type="number" value={fixedFee} onChange={e => setFixedFee(e.target.value)} min="0" step="1000" style={inp} />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ color: "#888", fontSize: "13px", display: "block", marginBottom: "6px" }}>
            مالیات بر ارزش افزوده (٪) <span style={{ color: "#555", fontSize: "11px" }}>— طبق قانون فقط روی اجرت و سود اعمال می‌شود، نه روی اصل طلا</span>
          </label>
          <input type="number" value={tax} onChange={e => setTax(e.target.value)} min="0" max="100" step="0.5" style={inp} />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ color: "#888", fontSize: "13px", display: "block", marginBottom: "6px" }}>
            منبع نرخ طلا <span style={{ color: "#555", fontSize: "11px" }}>— نوار قیمت، تابلو طلا و صفحه محصول از این منبع می‌خوانند</span>
          </label>
          <select value={priceSource} onChange={e => setPriceSource(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
            <option value="auto">خودکار — اتحادیه تهران + TGJU (پیشنهادی)</option>
            <option value="estjt">اتحادیه طلا و جواهر تهران (estjt.ir)</option>
            <option value="tgju">شبکه اطلاع‌رسانی طلا و ارز (TGJU)</option>
            <option value="akbari">دلی گلد</option>
          </select>
          <p style={{ color: "#555", fontSize: "11px", margin: "6px 0 0", lineHeight: 1.9 }}>
            منبع فعلی: {goldData?.sourceTitle ?? "در حال دریافت…"} — در صفحه «تابلو طلا» می‌توانید منبع را جداگانه عوض کنید.
          </p>

          {priceSource === "akbari" && (
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "10px", marginTop: "12px", padding: "12px", backgroundColor: "#121212", border: "1px solid #2a2a2a", borderRadius: "8px" }}>
              <div>
                <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "4px" }}>uID</label>
                <input value={akbariUid} onChange={e => setAkbariUid(e.target.value)} placeholder="34"
                  style={{ ...inp, direction: "ltr" }} />
              </div>
              <div>
                <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "4px" }}>uToken</label>
                <input type="password" value={akbariToken} onChange={e => setAkbariToken(e.target.value)}
                  placeholder="uToken" autoComplete="off"
                  style={{ ...inp, direction: "ltr" }} />
              </div>
              <div>
                <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "4px" }}>گاپ درصد (%)</label>
                <input type="number" step="0.01" min="-100" max="100" value={akbariGapPct}
                  onChange={e => setAkbariGapPct(e.target.value)} placeholder="0"
                  style={{ ...inp, direction: "ltr" }} />
              </div>
              <div>
                <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "4px" }}>گاپ ثابت (تومان/گرم)</label>
                <input type="number" step="1000" value={akbariGapToman}
                  onChange={e => setAkbariGapToman(e.target.value)} placeholder="0"
                  style={{ ...inp, direction: "ltr" }} />
              </div>
              <p style={{ gridColumn: "1 / -1", color: "#555", fontSize: "11px", margin: 0, lineHeight: 1.9 }}>
                احراز هویت API لیست قیمت سامانه فروشگاه — نرخ ۱۸ عیار از قیمت مثقال طلا (ریال) محاسبه می‌شود.
                گاپ فقط روی نرخ‌های طلا (۱۸/۲۴ و مظنه) اعمال می‌شود؛ سکه‌ها و انس دست‌نخورده می‌مانند.
                ۰ یعنی بدون تغییر — برای هم‌ترازی با تابلوهای بازار، درصدِ اختلاف را اینجا وارد کنید.
              </p>
            </div>
          )}
        </div>

        {saved && (
          <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "16px", color: "#10b981", fontSize: "13px" }}>
            ✓ تنظیمات قیمت ذخیره شد
          </div>
        )}

        <button type="button" onClick={handleSavePricing} disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: saving ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "11px 24px", fontWeight: "700", fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {saving ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
          {saving ? "در حال ذخیره..." : "ذخیره قیمت‌گذاری"}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Promo Banners (managed in dedicated page) ── */}
      <div style={{ ...cardStyle, marginTop: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <span style={{ fontSize: "18px" }}>🖼️</span>
          <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>بنرهای تبلیغاتی</h3>
        </div>
        <p style={{ color: "#888", fontSize: "13px", marginBottom: "14px" }}>
          بنرهای تبلیغاتی صفحه اصلی از صفحه مدیریت مجزا ویرایش، اضافه و حذف می‌شوند.
        </p>
        <a href="/admin/promo-banners"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "11px 24px", fontWeight: "700", fontSize: "14px", textDecoration: "none", fontFamily: "inherit" }}>
          مدیریت بنرهای تبلیغاتی
        </a>
      </div>

      {/* ── Typography ── */}
      <div style={{ ...cardStyle, marginTop: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Type size={18} color="#d4af37" />
          <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>تایپوگرافی و فونت</h3>
        </div>
        <p style={{ color: "#666", fontSize: "12px", marginBottom: "22px" }}>
          فونت و اندازه متن را برای هر بخش از سایت جداگانه تنظیم کنید. تغییرات بلافاصله اعمال می‌شوند.
        </p>

        {TYPO_SECTIONS.map(section => {
          const fontKey = `${section.key}_font`;
          const sizeKey = `${section.key}_size`;
          const currentFont = typo[fontKey] || section.defaultFont;
          const currentSize = parseInt(typo[sizeKey] || String(section.defaultSize), 10);
          const fontObj = FONT_OPTIONS.find(f => f.id === currentFont) ?? FONT_OPTIONS[0];

          return (
            <div key={section.key} style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#121212", borderRadius: "10px", border: "1px solid #2a2a2a" }}>
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div>
                  <p style={{ color: "#d4af37", fontSize: "12px", fontWeight: "700" }}>{section.label}</p>
                  <p style={{ color: "#555", fontSize: "10px", marginTop: "2px" }}>{section.description}</p>
                </div>
                <span style={{ color: "#444", fontSize: "10px", direction: "ltr" }}>{section.cssFont}</span>
              </div>

              {/* Font picker */}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "6px" }}>انتخاب فونت فارسی</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "6px" }}>
                  {FONT_OPTIONS.map(font => {
                    const isSelected = currentFont === font.id;
                    return (
                      <button key={font.id} type="button"
                        onClick={() => setTypo(t => ({ ...t, [fontKey]: font.id }))}
                        style={{
                          padding: "9px 8px", borderRadius: "7px",
                          border: `1px solid ${isSelected ? "#d4af37" : "#2a2a2a"}`,
                          backgroundColor: isSelected ? "rgba(212,175,55,0.12)" : "#1a1a1a",
                          cursor: "pointer", fontFamily: font.family, textAlign: "center",
                          transition: "border-color 0.15s, background-color 0.15s",
                        }}>
                        {/* Font name rendered IN that font */}
                        <p style={{ color: isSelected ? "#d4af37" : "#e0e0e0", fontSize: "14px", fontWeight: "700", marginBottom: "3px", fontFamily: font.family }}>
                          {font.label}
                        </p>
                        <p style={{ color: "#555", fontSize: "9px", fontFamily: "'Vazirmatn',sans-serif" }}>{font.style}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size slider + free numeric input (8–200px) */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <label style={{ color: "#888", fontSize: "11px", flexShrink: 0 }}>اندازه (۸ تا ۲۰۰):</label>
                <input type="range" min={section.minSize} max={section.maxSize} step={1}
                  value={Math.min(section.maxSize, Math.max(section.minSize, parseInt(String(currentSize)) || section.defaultSize))}
                  onChange={e => setTypo(t => ({ ...t, [sizeKey]: e.target.value }))}
                  style={{ flex: 1, accentColor: "#d4af37" }} />
                <span style={{ color: "#d4af37", fontSize: "13px", fontWeight: "700", minWidth: "40px", direction: "ltr" }}>
                  {currentSize}px
                </span>
                <input type="number" min={section.minSize} max={section.maxSize} step={1} value={currentSize}
                  onChange={e => setTypo(t => ({ ...t, [sizeKey]: e.target.value }))}
                  onBlur={e => setTypo(t => ({ ...t, [sizeKey]: String(clampTypoSize(e.target.value, section.defaultSize)) }))}
                  style={{ width: "70px", backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "5px", padding: "4px 8px", color: "#fff", fontSize: "12px", outline: "none", direction: "ltr", textAlign: "center" }} />
              </div>

              {/* Live preview */}
              <div style={{ backgroundColor: "#0a0a0a", borderRadius: "6px", padding: "12px 16px", border: "1px solid #1e1e1e" }}>
                <p style={{ color: "#555", fontSize: "9px", marginBottom: "6px" }}>پیش‌نمایش:</p>
                <p style={{
                  fontFamily: fontObj.family,
                  fontSize: `${currentSize}px`,
                  color: "#e0d4a0",
                  lineHeight: 1.4,
                  wordBreak: "break-word",
                }}>
                  {section.sample}
                </p>
              </div>
            </div>
          );
        })}

        {savedTypo && <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#10b981", fontSize: "13px" }}>✓ تایپوگرافی ذخیره شد و اعمال گردید</div>}
        <button onClick={handleSaveTypography} disabled={savingTypo}
          style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: savingTypo ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "11px 24px", fontWeight: "700", fontSize: "14px", cursor: savingTypo ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {savingTypo ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
          {savingTypo ? "در حال ذخیره..." : "ذخیره و اعمال فونت‌ها"}
        </button>
      </div>

    </div>
  );
}
