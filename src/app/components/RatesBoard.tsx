"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  BadgeDollarSign,
  Banknote,
  Calculator,
  Coins,
  Gem,
  LayoutGrid,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import PageLayout from "../components/PageLayout";

interface Rates {
  gold18k?: number;
  gold24k?: number;
  ounceDollar?: number;
  mazanehTehran?: number;
  coinOld?: number;
  coinNew?: number;
  coinHalf?: number;
  coinQuarter?: number;
  coinGram?: number;
}

interface RateChange {
  amount: number;
  percent: number;
  isUp: boolean;
}

interface AkbariRawItem {
  id: number;
  name: string;
  type: number;
  ayar: number;
  price: number;
  rate: number;
  itemWeight: number;
  isActive: number;
  allowBuy: number;
  allowSell: number;
  sortId: number;
  lastUpdateTime?: string;
}

interface MarketPayload {
  source?: string;
  sourceTitle?: string;
  price: number;
  open: number;
  high: number;
  low: number;
  changeAmount: number;
  changePercent: string;
  isUp: boolean;
  rates?: Rates;
  changes?: Partial<Record<keyof Rates, RateChange>>;
  sourceKey?: "estjt" | "tgju" | "akbari" | "fallback";
  requested?: string;
  partial?: boolean;
  merged?: boolean;
  stale?: boolean;
  staleRates?: string[];
  note?: string;
  akbariItems?: AkbariRawItem[];
  /** The union's own «آخرین بروزرسانی قیمت» stamp (e.g. ۶ مهر ۱۴۰۵ - ۱۲:۵۹:۴۵). */
  unionUpdatedAt?: string;
}

interface RowDef {
  key: keyof Rates;
  title: string;
  hint: string;
  href?: string;
  accent: string;
}

const GOLD_ROWS: RowDef[] = [
  { key: "gold18k", title: "طلای ۱۸ عیار (گرم)", hint: "نرخ پایه طلافروشی", href: "/products", accent: "#0f5c45" },
  { key: "gold24k", title: "طلای ۲۴ عیار (گرم)", hint: "طلای خالص", accent: "#b45309" },
  { key: "mazanehTehran", title: "مظنه تهران (مثقال)", hint: "آبشده نقدی", href: "/products?coin=true", accent: "#0ea5e9" },
  { key: "ounceDollar", title: "انس جهانی طلا (دلار)", hint: "بازار جهانی", accent: "#22c55e" },
];

const COIN_ROWS: RowDef[] = [
  { key: "coinNew", title: "سکه امامی (طرح جدید)", hint: "تمام بهار آزادی", href: "/products?coin=true", accent: "#7c3aed" },
  { key: "coinOld", title: "سکه بهار آزادی (طرح قدیم)", hint: "تمام بهار آزادی", href: "/products?coin=true", accent: "#6d28d9" },
  { key: "coinHalf", title: "نیم سکه", hint: "بهار آزادی", href: "/products?coin=true", accent: "#2563eb" },
  { key: "coinQuarter", title: "ربع سکه", hint: "بهار آزادی", href: "/products?coin=true", accent: "#0891b2" },
  { key: "coinGram", title: "سکه گرمی", hint: "یک گرمی بانک مرکزی", href: "/products?coin=true", accent: "#059669" },
];

function faNum(n: number): string {
  if (!n || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString("fa-IR");
}

function faSigned(n: number): string {
  if (!n || Number.isNaN(n)) return "—";
  return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(Math.round(n)).toLocaleString("fa-IR");
}

/** Signed percentage with 2 decimals: «+۰٫۱۵» / «−۰٫۲۸». */
function faSignedPct(n: number): string {
  if (!n || Number.isNaN(n)) return "۰٫۰۰";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return sign + Math.abs(n).toLocaleString("fa-IR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Persian/Arabic digits and separators → ASCII, so «۵٫۲» can be typed. */
function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[٫،,]/g, ".")
    .replace(/[^0-9.]/g, "")
    .replace(/(\..*)\./g, "$1");
}

type SourceChoice = "auto" | "estjt" | "tgju" | "akbari";

const SOURCE_OPTIONS: { id: SourceChoice; label: string; hint: string }[] = [
  { id: "auto",    label: "خودکار",        hint: "اتحادیه + TGJU (تکمیل خودکار)" },
  { id: "estjt",   label: "اتحادیه تهران", hint: "فقط estjt.ir" },
  { id: "tgju",    label: "TGJU",          hint: "فقط شبکه طلا و ارز" },
  { id: "akbari",  label: "خانوم جون",     hint: "فقط سامانه فروشگاه" },
];

function RateCard({ row, index, value, chg }: { row: RowDef; index: number; value?: number; chg?: RateChange }) {
  const unit = row.key === "ounceDollar" ? "دلار" : "تومان";
  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span
          style={{
            width: 30, height: 30, borderRadius: 14, display: "inline-flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
            color: row.accent, backgroundColor: `${row.accent}14`,
            border: `1px solid ${row.accent}33`, fontSize: 12, fontWeight: 800,
          }}
        >
          {(index + 1).toLocaleString("fa-IR")}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ color: "var(--dg-ink)", fontSize: 14, fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {row.title}
          </p>
          <p style={{ color: "var(--dg-muted)", fontSize: 11, margin: "2px 0 0" }}>{row.hint}</p>
        </div>
      </div>
      <p style={{ color: value ? row.accent : "var(--dg-muted)", fontSize: 19, fontWeight: 800, margin: "0 0 2px", direction: "ltr" }}>
        {value ? faNum(value) : "—"}
      </p>
      <p style={{ color: "var(--dg-muted)", fontSize: 11, margin: 0 }}>{unit}</p>
      {chg && (chg.amount !== 0 || chg.percent !== 0) && (
        <p
          style={{
            display: "inline-flex", alignItems: "center", gap: 4, margin: "8px 0 0",
            fontSize: 11, fontWeight: 800, color: chg.isUp ? "#16a34a" : "#dc2626",
          }}
        >
          {chg.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {faSigned(chg.amount)} {unit} · {faSignedPct(chg.percent)}٪
        </p>
      )}
    </>
  );

  const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--dg-surface)",
    border: "1px solid var(--dg-line)",
    borderRadius: 18,
    padding: 16,
    display: "block",
    minWidth: 0,
  };

  return row.href ? (
    <Link href={row.href} style={{ ...cardStyle, textDecoration: "none" }}>{inner}</Link>
  ) : (
    <div style={cardStyle}>{inner}</div>
  );
}

export function SkeletonGrid({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)",
            borderRadius: 18, padding: 16, minHeight: 132, opacity: 0.55,
          }}
        />
      ))}
    </>
  );
}

/**
 * One raw Akbari row, rendered 1:1 — same name, same Rial price as the
 * shop's trading system. No conversion, no coin/gold classification.
 */
function AkbariRawCard({ item, index }: { item: AkbariRawItem; index: number }) {
  const accent = item.type === 1 ? "#0f5c45" : "#7c3aed";
  const active = item.isActive === 1;
  return (
    <div
      style={{
        backgroundColor: "var(--dg-surface)",
        border: "1px solid var(--dg-line)",
        borderRadius: 18,
        padding: 16,
        display: "block",
        minWidth: 0,
        opacity: active ? 1 : 0.55,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span
          style={{
            width: 30, height: 30, borderRadius: 14, display: "inline-flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
            color: accent, backgroundColor: `${accent}14`,
            border: `1px solid ${accent}33`, fontSize: 12, fontWeight: 800,
          }}
        >
          {(index + 1).toLocaleString("fa-IR")}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ color: "var(--dg-ink)", fontSize: 14, fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.name}
          </p>
          <p style={{ color: "var(--dg-muted)", fontSize: 11, margin: "2px 0 0" }}>
            {item.type === 1 ? "طلا" : "سکه"}
            {item.ayar > 0 ? ` · عیار ${item.ayar.toLocaleString("fa-IR")}` : ""}
            {!active ? " · غیرفعال" : ""}
          </p>
        </div>
      </div>
      <p style={{ color: item.price > 0 ? accent : "var(--dg-muted)", fontSize: 19, fontWeight: 800, margin: "0 0 2px", direction: "ltr" }}>
        {item.price > 0 ? faNum(item.price) : "—"}
      </p>
      <p style={{ color: "var(--dg-muted)", fontSize: 11, margin: 0 }}>ریال</p>
      {item.lastUpdateTime ? (
        <p style={{ color: "var(--dg-muted)", fontSize: 10, margin: "8px 0 0" }}>
          {item.lastUpdateTime}
        </p>
      ) : null}
    </div>
  );
}

export function RatesBoardSkeleton() {
  return (
    <PageLayout>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 16px" }}>
        <div style={{ backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: 18, boxShadow: "var(--dg-shadow-sm)", padding: 16, marginBottom: 22, minHeight: 120, opacity: 0.6 }} />
        <div className="rates-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 30 }}>
          <SkeletonGrid count={4} />
        </div>
        <div className="rates-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <SkeletonGrid count={5} />
        </div>
      </div>
    </PageLayout>
  );
}

export default function RatesBoard() {
  const [data, setData] = useState<MarketPayload | null>(null);
  const [settings, setSettings] = useState<{
    gold_markup_percent?: string;
    gold_fixed_fee?: string;
    gold_tax_percent?: string;
  }>({});
  const [source, setSource] = useState<SourceChoice>("auto");
  const [calcOpen, setCalcOpen] = useState(false);
  const [grams, setGrams] = useState("");
  const [karat, setKarat] = useState<18 | 24>(18);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const clock = useRef<ReturnType<typeof setInterval> | null>(null);

  // `force` is set by the refresh button and by the source switcher: it asks the
  // server for a NEW reading (`?refresh=1` waits for the real upstream instead
  // of the 60s cache), while the automatic 60s poll stays on the fast path.
  const fetchRates = async (spinner = false, src: SourceChoice = source, force = false) => {
    if (spinner) setRefreshing(true);
    try {
      const [pr, sr] = await Promise.all([
        fetch(`/api/admin/gold-price?source=${src}${force ? "&refresh=1" : ""}`, { cache: "no-store" }),
        fetch("/api/admin/settings", { cache: "no-store" }),
      ]);
      const pj = await pr.json();
      const sj = await sr.json();
      if (pj.success && pj.data) setData(pj.data);
      if (sj.success) setSettings(sj.data ?? {});
      setCountdown(60);
    } catch {
      /* keep the last good values on screen */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Default price source — read from the server (Admin → تنظیمات → «منبع نرخ طلا»,
  // key `gold_price_source`). The operator's own browser preference
  // (`localStorage`) is a per-visit override, not the source of truth.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch("/api/settings/gold-price-source", { cache: "no-store" });
        const j = await r.json();
        if (cancelled) return;
        if (!j.success || !j.data?.source) return;
        const serverSource: SourceChoice = j.data.source;
        // Visitor's local override wins over the server default.
        const saved = localStorage.getItem("dg_price_source");
        if (saved === "auto" || saved === "estjt" || saved === "tgju" || saved === "akbari") {
          setSource(saved);
        } else {
          setSource(serverSource);
        }
      } catch {
        /* keep the default */
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Server-side default may change (admin saves a new value). Keep the board in sync
  // unless the visitor is actively overriding it via the picker.
  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const r = await fetch("/api/settings/gold-price-source", { cache: "no-store" });
        const j = await r.json();
        if (!j.success || !j.data?.source) return;
        const serverSource: SourceChoice = j.data.source;
        const saved = localStorage.getItem("dg_price_source");
        const override =
          saved === "auto" || saved === "estjt" || saved === "tgju" || saved === "akbari";
        if (!override || saved === serverSource) {
          setSource((prev) => (override && prev !== serverSource ? prev : serverSource));
        }
      } catch {
        /* keep last */
      }
    }, 60_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // Restore the operator's saved source choice (if any).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dg_price_source");
      if (saved === "auto" || saved === "estjt" || saved === "tgju" || saved === "akbari") setSource(saved);
    } catch { /* private mode — stay on auto */ }
  }, []);

  // Initial load + automatic refresh: first paint pulls a fresh reading for
  // the active source, then re-polls every 60s and ticks the countdown each
  // second. Re-arms whenever the operator switches source.
  useEffect(() => {
    // First paint of a newly chosen source pulls fresh rates for it.
    fetchRates(true, source, true);
    timer.current = setInterval(() => fetchRates(), 60_000);
    clock.current = setInterval(() => setCountdown(c => (c <= 1 ? 60 : c - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (clock.current) clearInterval(clock.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const pickSource = (c: SourceChoice) => {
    if (c === source) return;
    setSource(c);
    try { localStorage.setItem("dg_price_source", c); } catch { /* ignore */ }
  };

  const now = new Date();
  const nowFa = now.toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const nowTime = now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

  const changePct = parseFloat(data?.changePercent ?? "0") || 0;
  const trendDown = !!data && !data.isUp && changePct < 0;
  const trendUp = !!data && !trendDown && changePct !== 0;

  const base = data?.price ?? 0;
  const markupPct = parseFloat(settings.gold_markup_percent ?? "5") || 0;
  const fixedFee = parseFloat(settings.gold_fixed_fee ?? "0") || 0;
  const taxPct = parseFloat(settings.gold_tax_percent ?? "0") || 0;

  /**
   * Mirrors calcFinalPrice() in src/lib/pricing.ts so the board and the
   * product page always agree:
   *   اجرت و سود  = نرخ روز × سود٪ + اجرت ثابت هر گرم
   *   مالیات      = فقط روی اجرت و سود (نه روی اصل طلا)
   *   قیمت       = (نرخ روز + اجرت و سود + مالیات) × وزن
   */
  const dayRatePerGram =
    karat === 24 ? data?.rates?.gold24k || Math.round(base * (24 / 18)) : base;
  const ajratPerGram = Math.round(dayRatePerGram * (markupPct / 100) + fixedFee);
  const taxPerGram = taxPct > 0 ? Math.round(ajratPerGram * (taxPct / 100)) : 0;
  const calcRate = dayRatePerGram + ajratPerGram + taxPerGram;
  const gramsNum = parseFloat(grams) || 0;
  const calcTotal = gramsNum > 0 ? Math.round(gramsNum * calcRate) : 0;

  const calcRows: { label: string; value: string; unit: string }[] = [
    {
      label: `نرخ روز طلای ${karat.toLocaleString("fa-IR")} عیار (هر گرم)`,
      value: faNum(dayRatePerGram),
      unit: "تومان",
    },
    {
      label: `اجرت و سود${markupPct > 0 ? ` (${markupPct.toLocaleString("fa-IR")}٪)` : ""}${fixedFee > 0 ? ` + ${faNum(fixedFee)} ت` : ""}`,
      value: faNum(ajratPerGram),
      unit: "تومان",
    },
  ];
  if (taxPct > 0) {
    calcRows.push({
      label: `مالیات (${taxPct.toLocaleString("fa-IR")}٪ روی اجرت و سود)`,
      value: faNum(taxPerGram),
      unit: "تومان",
    });
  }
  calcRows.push({ label: "قیمت هر گرم", value: faNum(calcRate), unit: "تومان" });

  const valueOf = (r: Rates | undefined, key: keyof Rates) => r?.[key] ?? 0;
  const chgOf = (key: keyof Rates): RateChange | undefined => data?.changes?.[key];

  // Raw «خانوم جون» list — rendered 1:1 (same names, same Rial prices) instead
  // of the fixed 9-rate grid whenever the akbari source is active.
  const akbariRaw: AkbariRawItem[] | null =
    source === "akbari" && data?.akbariItems && data.akbariItems.length > 0 ? data.akbariItems : null;

  return (
    <PageLayout>
      {/* Hero */}
      <div style={{ position: "relative", overflow: "hidden", backgroundColor: "#181305" }}>
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundImage: "url(https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1600&q=80)",
            backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.35)",
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to left, rgba(10,8,2,0.85), rgba(10,8,2,0.15))" }} />
        <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "44px 16px", color: "#fff" }}>
          <p style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#0f231d", backgroundColor: "#0f5c45", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 800, margin: "0 0 12px" }}>
            <LayoutGrid size={13} /> تابلو زنده بازار
          </p>
          <h1 style={{ fontSize: 34, fontWeight: 900, margin: "0 0 8px" }}>تابلو طلا</h1>
          <p style={{ color: "rgba(255,255,255,0.78)", fontSize: 14, margin: 0, lineHeight: 1.9 }}>
            نرخ لحظه‌ای طلا و سکه — به‌روزرسانی خودکار هر ۱ دقیقه از {data?.sourceTitle ?? "اتحادیه طلا و جواهر تهران"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "6px 12px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#22c55e", animation: "board-pulse 1.6s ease-in-out infinite" }} />
              {nowFa} · ساعت {nowTime}
            </span>
            <button
              type="button"
              onClick={() => fetchRates(true, source, true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
                backgroundColor: "rgba(15,92,69,0.18)", color: "#f4d97b",
                border: "1px solid rgba(15,92,69,0.45)", borderRadius: 20, padding: "6px 14px",
                fontSize: 12, fontWeight: 700, fontFamily: "inherit",
              }}
            >
              <RefreshCw size={13} style={{ animation: refreshing ? "board-spin 1s linear infinite" : "none" }} />
              {refreshing ? "در حال به‌روزرسانی…" : `به‌روزرسانی تا ${countdown.toLocaleString("fa-IR")} ثانیه`}
            </button>
            <button
              type="button"
              onClick={() => setCalcOpen(o => !o)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
                backgroundColor: "#0f5c45", color: "#0f231d",
                border: "none", borderRadius: 20, padding: "6px 14px",
                fontSize: 12, fontWeight: 800, fontFamily: "inherit",
              }}
            >
              <Calculator size={13} /> ماشین‌حساب طلا
            </button>
          </div>

          {/* Price-source picker — عامل می‌تواند منبع نرخ‌ها را عوض کند */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.62)" }}>منبع نرخ‌ها:</span>
            <div style={{ display: "flex", backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 20, padding: 3 }}>
              {SOURCE_OPTIONS.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => pickSource(o.id)}
                  style={{
                    border: "none", borderRadius: 18, padding: "6px 14px",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    backgroundColor: source === o.id ? "#0f5c45" : "transparent",
                    color: source === o.id ? "#0f231d" : "rgba(255,255,255,0.78)",
                    transition: "background-color .15s ease",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
              {SOURCE_OPTIONS.find(o => o.id === source)?.hint}
              {refreshing ? " · در حال دریافت…" : ""}
            </span>
            {data?.partial && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: "#fbbf24",
                border: "1px solid rgba(251,191,36,0.4)", backgroundColor: "rgba(251,191,36,0.12)",
                borderRadius: 18, padding: "3px 10px",
              }}>
                برخی نرخ‌ها در این منبع ارائه نمی‌شود
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rates-body" style={{ maxWidth: 1280, margin: "0 auto", padding: "26px 16px 48px" }}>
        {/* Hero 18k spotlight */}
        <div className="rates-spot" style={{
          display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
          backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)",
          borderRadius: 16, padding: "20px 24px", marginBottom: 22,
          boxShadow: "0 10px 30px rgba(15,92,69,0.10)",
        }}>
          <div style={{ width: 58, height: 58, borderRadius: 16, background: "linear-gradient(135deg,#0f5c45,#8a6d1c)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Gem size={26} color="#fff" />
          </div>
          <div style={{ flex: "1 1 220px", minWidth: 200 }}>
            <p style={{ color: "var(--dg-muted)", fontSize: 12, margin: "0 0 4px" }}>طلای ۱۸ عیار · هر گرم</p>
            <p style={{ color: "var(--dg-ink)", fontSize: 30, fontWeight: 900, margin: 0, direction: "ltr" }}>
              {loading ? "…" : faNum(base)} <span style={{ fontSize: 13, fontWeight: 400, color: "var(--dg-muted)" }}>تومان</span>
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span className="rate-trend" style={{
              display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 20, padding: "6px 14px",
              fontSize: 13, fontWeight: 800,
              color: trendDown ? "#dc2626" : "#16a34a",
              backgroundColor: trendDown ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${trendDown ? "#fecaca" : "#bbf0d0"}`,
            }}>
              {trendDown ? <TrendingDown size={14} /> : trendUp ? <TrendingUp size={14} /> : <Minus size={14} />}
              {changePct === 0 ? "بدون تغییر" : `${faSigned(changePct)}٪`}
            </span>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "var(--dg-muted)", fontSize: 10, margin: "0 0 2px" }}>تغییر امروز</p>
              <p style={{ color: "var(--dg-ink)", fontSize: 13, fontWeight: 700, margin: 0 }}>
                {loading ? "…" : `${faSigned(data?.changeAmount ?? 0)} تومان`}
              </p>
            </div>
          </div>
        </div>
        {calcOpen && (
          <div className="rates-calc" style={{ backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: 18, boxShadow: "var(--dg-shadow-sm)", padding: 18, marginBottom: 22 }}>

            <p style={{ color: "var(--dg-ink)", fontSize: 14, fontWeight: 800, margin: "0 0 4px" }}>قیمت طلای شما چقدر می‌شود؟</p>
            <p style={{ color: "var(--dg-muted)", fontSize: 12, margin: "0 0 14px" }}>
              بر اساس نرخ لحظه‌ای طلای {karat.toLocaleString("fa-IR")} عیار{dayRatePerGram > 0 ? ` (${faNum(dayRatePerGram)} تومان)` : ""} + اجرت و سود فروشگاه
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
              <div style={{ display: "flex", backgroundColor: "var(--dg-bg-2)", borderRadius: 14, padding: 4, gap: 4 }}>
                {([18, 24] as const).map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKarat(k)}
                    style={{
                      border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit",
                      backgroundColor: karat === k ? "#0f5c45" : "transparent",
                      color: karat === k ? "#0f231d" : "var(--dg-muted)",
                    }}
                  >
                    {k.toLocaleString("fa-IR")} عیار
                  </button>
                ))}
              </div>
              <div style={{ flex: "1 1 160px", minWidth: 140 }}>
                <label style={{ display: "block", color: "var(--dg-muted)", fontSize: 11, marginBottom: 6 }}>وزن (گرم)</label>
                <input
                  value={grams}
                  onChange={e => setGrams(toLatinDigits(e.target.value))}
                  inputMode="decimal"
                  placeholder="مثلاً ۵.۲"
                  style={{
                    width: "100%", backgroundColor: "var(--dg-bg-2)", border: "1px solid var(--dg-line)",
                    borderRadius: 14, padding: "10px 14px", color: "var(--dg-ink)", fontSize: 14,
                    outline: "none", fontFamily: "inherit", direction: "ltr", textAlign: "center",
                  }}
                />
              </div>
              <div style={{ flex: "1 1 220px", minWidth: 200, backgroundColor: "color-mix(in srgb, var(--dg-primary) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--dg-primary) 30%, transparent)", borderRadius: 14, padding: "10px 16px", textAlign: "center" }}>
                <p style={{ color: "var(--dg-muted)", fontSize: 11, margin: "0 0 4px" }}>مبلغ تقریبی</p>
                <p style={{ color: "var(--dg-primary)", fontSize: 20, fontWeight: 900, margin: 0 }}>
                  {calcTotal > 0 ? faNum(calcTotal) : "—"} <span style={{ fontSize: 11, fontWeight: 400 }}>تومان</span>
                </p>
              </div>
            </div>

            {/* Breakdown — same line items as the product page */}
            <div
              className="rates-calc-rows"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 14 }}
            >
              {calcRows.map(row => (
                <div
                  key={row.label}
                  style={{ backgroundColor: "var(--dg-bg-2)", border: "1px solid var(--dg-line)", borderRadius: 14, padding: "8px 12px" }}
                >
                  <p style={{ color: "var(--dg-muted)", fontSize: 10, margin: "0 0 3px" }}>{row.label}</p>
                  <p style={{ color: "var(--dg-ink)", fontSize: 13, fontWeight: 800, margin: 0 }}>
                    {row.value} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--dg-muted)" }}>{row.unit}</span>
                  </p>
                </div>
              ))}
            </div>
            <p style={{ color: "var(--dg-muted)", fontSize: 11, margin: "10px 0 0", lineHeight: 1.9 }}>
              فرمول: (نرخ روز + اجرت و سود + مالیات) × وزن — مالیات فقط روی اجرت و سود اعمال می‌شود، نه روی اصل طلا.
            </p>
          </div>
        )}

        {!akbariRaw && (
        <div className="rates-sec" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 14, backgroundColor: "#e6f0eb", color: "#0f5c45" }}>
            <Banknote size={17} />
          </span>
          <h2 style={{ color: "var(--dg-ink)", fontSize: 18, fontWeight: 800, margin: 0 }}>نرخ طلا</h2>
          <span style={{ flex: 1, height: 1, backgroundColor: "var(--dg-line)" }} />
        </div>
        )}
        {akbariRaw ? (
          <>
            <div className="rates-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 30 }}>
              {akbariRaw.map((item, i) => <AkbariRawCard key={item.id} item={item} index={i} />)}
            </div>
          </>
        ) : (
          <>
        <div className="rates-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 30 }}>
          {loading
            ? <SkeletonGrid count={4} />
            : GOLD_ROWS.map((r, i) => <RateCard key={r.key} row={r} index={i} value={valueOf(data?.rates, r.key)} chg={chgOf(r.key)} />)}
        </div>

        {/* Coin rates */}
        <div className="rates-sec" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 14, backgroundColor: "#f3ecff", color: "#7c3aed" }}>
            <Coins size={17} />
          </span>
          <h2 style={{ color: "var(--dg-ink)", fontSize: 18, fontWeight: 800, margin: 0 }}>نرخ سکه</h2>
          <span style={{ flex: 1, height: 1, backgroundColor: "var(--dg-line)" }} />
        </div>
        <div className="rates-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 30 }}>
          {loading
            ? <SkeletonGrid count={5} />
            : COIN_ROWS.map((r, i) => <RateCard key={r.key} row={r} index={i} value={valueOf(data?.rates, r.key)} chg={chgOf(r.key)} />)}
        </div>
          </>
        )}


        {/* Today's summary — only figures the sources actually publish */}
        <div className="rates-meta" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
          {[
            {
              label: "تغییر امروز (۱۸ عیار)",
              value: faSigned(data?.changeAmount ?? 0),
              unit: "تومان",
              tone: (data?.changeAmount ?? 0) > 0 ? "up" : (data?.changeAmount ?? 0) < 0 ? "down" : "",
            },
            {
              label: "درصد تغییر",
              value: faSignedPct(changePct),
              unit: "٪",
              tone: trendDown ? "down" : trendUp ? "up" : "",
            },
            {
              label: "میانگین دیروز",
              value: faNum((data?.price ?? 0) - (data?.changeAmount ?? 0)),
              unit: "تومان",
              tone: "",
            },
            {
              label: "منبع نرخ",
              value: data?.sourceTitle ?? "—",
              unit: "",
              tone: "",
            },
          ].map(m => (
            <div key={m.label} style={{ backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: 18, boxShadow: "var(--dg-shadow-sm)", padding: "12px 16px", textAlign: "center" }}>
              <p style={{ color: "var(--dg-muted)", fontSize: 11, margin: "0 0 4px" }}>{m.label}</p>
              <p
                style={{
                  color: m.tone === "up" ? "#16a34a" : m.tone === "down" ? "#dc2626" : "var(--dg-ink)",
                  fontSize: m.unit ? 15 : 13,
                  fontWeight: 800,
                  margin: 0,
                  lineHeight: 1.7,
                  overflowWrap: "anywhere",
                }}
              >
                {loading ? "…" : m.value}
                {m.unit ? <span style={{ fontSize: 10, fontWeight: 400 }}> {m.unit}</span> : null}
              </p>
            </div>
          ))}
        </div>

        {/* Source + shop CTA */}
        <div className="rates-cta" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap",
          backgroundColor: "color-mix(in srgb, var(--dg-primary) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--dg-primary) 28%, transparent)",
          borderRadius: 18, padding: "16px 20px",
        }}>
          <p style={{ color: "var(--dg-muted)", fontSize: 12, margin: 0, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <ArrowLeftRight size={13} />
            منبع نرخ‌ها: {data?.sourceTitle ?? "در حال دریافت…"} · حالت انتخابی: {SOURCE_OPTIONS.find(o => o.id === source)?.label}
            {data?.unionUpdatedAt ? ` · آخرین بروزرسانی اتحادیه: ${data.unionUpdatedAt}` : ""}
            {data?.note ? ` · ${data.note}` : ""}
            {data?.staleRates && data.staleRates.length > 0 ? ` · ${data.staleRates.length.toLocaleString("fa-IR")} نرخ از آخرین داده دریافتی` : ""}
            {data?.stale ? " · کش قدیمی (منبع در دسترس نبود)" : ""} · به‌روزرسانی خودکار هر ۱ دقیقه
          </p>
          <Link
            href="/products?coin=true"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: "#0f5c45", color: "#0f231d",
              textDecoration: "none", borderRadius: 14, padding: "10px 20px", fontSize: 13, fontWeight: 800,
            }}
          >
            <BadgeDollarSign size={15} /> خرید سکه و آبشده
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes board-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes board-spin { to { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          .rates-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .rates-meta { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .rates-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .rates-meta { grid-template-columns: 1fr !important; }
          .rates-body { padding: 18px 12px 36px !important; }
          .rates-spot { padding: 16px !important; gap: 12px !important; }
          .rates-cta { flex-direction: column; align-items: stretch !important; text-align: center; }
          .rates-cta a { justify-content: center; }
        }
      `}</style>
    </PageLayout>
  );
}

