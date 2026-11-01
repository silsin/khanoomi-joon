"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Calculator, TrendingUp, TrendingDown, RefreshCw, Activity } from "lucide-react";
import Link from "next/link";

interface GoldData {
  price: number; open: number; high: number; low: number;
  changePercent: string; isUp: boolean; history: number[]; dates: string[];
  fallback?: boolean; stale?: boolean; sourceTitle?: string;
}

function formatDate(d: string) {
  if (!d) return "";
  try {
    const p = d.split("/");
    return new Date(+p[0], +p[1]-1, +p[2]).toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
  } catch { return d; }
}

function MiniChart({ history, isUp }: { history: number[]; isUp: boolean }) {
  if (history.length < 2) return null;
  const W = 300; const H = 80;
  const min = Math.min(...history); const max = Math.max(...history); const range = max - min || 1;
  const step = W / (history.length - 1);
  const toX = (i: number) => i * step;
  const toY = (v: number) => H - 6 - ((v - min) / range) * (H - 12);
  const pts = history.map((v, i) => `${toX(i)},${toY(v)}`).join(" L ");
  const color = isUp ? "#16a34a" : "#dc2626";
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block", borderRadius: "10px" }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={`M 0,${H} L ${pts} L ${W},${H} Z`} fill="url(#cg)" />
      <path d={`M ${pts}`} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={toX(history.length-1)} cy={toY(history[history.length-1])} r="3" fill={color} />
    </svg>
  );
}

export default function InfoBlocks() {
  const [grams, setGrams] = useState("");
  const [karat, setKarat] = useState<18 | 24>(18);
  const [goldData, setGoldData] = useState<GoldData | null>(null);
  const [markup, setMarkup] = useState(5);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Live tickers poll the API every 60s; CountdownDial separately counts that minute down.
  const [countdown, setCountdown] = useState(60);
  const cRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // `force` is set by the refresh button: it asks the server for a NEW reading
  // (`?refresh=1` waits for the real upstream instead of the 60s cache), while
  // the automatic 60s poll stays on the fast cached path.
  const fetchPrice = useCallback(async (spinner = false, force = false) => {
    if (spinner) setRefreshing(true);
    try {
      const [pr, sr] = await Promise.all([
        fetch(`/api/admin/gold-price${force ? "?refresh=1" : ""}`, { cache: "no-store" }),
        fetch("/api/admin/settings"),
      ]);
      const pj = await pr.json(); const sj = await sr.json();
      if (pj.success) setGoldData(pj.data);
      if (sj.success) setMarkup(parseFloat(sj.data?.gold_markup_percent ?? "5") || 5);
    } catch {}
    finally { setLoading(false); setRefreshing(false); setCountdown(60); }
  }, []);

  useEffect(() => {
    fetchPrice();
    const iv = setInterval(() => fetchPrice(), 60_000);
    cRef.current = setInterval(() => setCountdown(c => c <= 1 ? 60 : c - 1), 1000);
    return () => { clearInterval(iv); if (cRef.current) clearInterval(cRef.current); };
  }, [fetchPrice]);

  const base = goldData?.price ?? 0;
  const mul = karat === 24 ? 24 / 18 : 1;
  const pricePerGram = Math.round(base * mul * (1 + markup / 100));
  const calcResult = grams && parseFloat(grams) > 0 ? Math.round(parseFloat(grams) * pricePerGram) : null;
  const isUp = goldData?.isUp ?? true;
  const tc = isUp ? "#16a34a" : "#dc2626";

  const inp: React.CSSProperties = {
    width: "100%", backgroundColor: "var(--dg-bg)", border: "1px solid var(--dg-line)",
    borderRadius: "10px", padding: "9px 12px", color: "var(--dg-ink)",
    fontSize: "13px", outline: "none", fontFamily: "inherit",
  };

  return (
    <section style={{ padding: "12px 0 40px", margin: "12px 0" }}>
      <div className="dg-head" style={{ marginBottom: "18px" }}>
        <div className="dg-head-titles">
          <span className="dg-head-eyebrow">GOLD MARKET</span>
          <h2 className="dg-head-title">بازار طلا و ابزارها</h2>
        </div>
      </div>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "18px" }} className="ib-grid">

          {/* Calculator */}
          <div style={{ backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: "var(--dg-radius)", boxShadow: "var(--dg-shadow-sm)", padding: "22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "38px", height: "38px", backgroundColor: "var(--dg-primary-soft)", border: "1px solid var(--dg-primary-line)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Calculator size={18} color="var(--dg-primary)" />
              </div>
              <div>
                <p style={{ color: "var(--dg-faint)", fontSize: "10px" }}>محاسبه‌گر طلا</p>
                <h3 style={{ color: "var(--dg-ink)", fontSize: "14px", fontWeight: "700" }}>قیمت‌یابی طلا</h3>
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
              {([18, 24] as const).map(k => (
                <button key={k} onClick={() => setKarat(k)}
                  style={{ flex: 1, backgroundColor: karat === k ? "var(--dg-primary)" : "var(--dg-bg-2)", color: karat === k ? "#fff" : "var(--dg-muted)", border: `1px solid ${karat === k ? "var(--dg-primary)" : "var(--dg-line)"}`, borderRadius: "10px", padding: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
                  {k} عیار
                </button>
              ))}
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ color: "var(--dg-muted)", fontSize: "11px", display: "block", marginBottom: "5px" }}>وزن طلا (گرم)</label>
              <input type="number" value={grams} onChange={e => setGrams(e.target.value)} placeholder="مثلاً ۲.۵" min="0" step="0.01"
                style={{ ...inp, direction: "ltr" }}
                onFocus={e => (e.target.style.borderColor = "var(--dg-primary)")}
                onBlur={e => (e.target.style.borderColor = "var(--dg-line)")} />
            </div>

            <div style={{ backgroundColor: "var(--dg-bg-2)", borderRadius: "10px", padding: "8px 12px", marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--dg-faint)", fontSize: "11px" }}>قیمت هر گرم ({karat} عیار)</span>
              <span style={{ color: "var(--dg-primary)", fontSize: "12px", fontWeight: "700" }}>
                {loading ? "..." : pricePerGram.toLocaleString("fa-IR")} ت
              </span>
            </div>

            {calcResult !== null && (
              <div style={{ backgroundColor: "var(--dg-primary-soft)", border: "1px solid var(--dg-primary-line)", borderRadius: "12px", padding: "12px", marginBottom: "12px", textAlign: "center" }}>
                <p style={{ color: "var(--dg-faint)", fontSize: "10px", marginBottom: "3px" }}>قیمت تخمینی</p>
                <p style={{ color: "var(--dg-primary)", fontSize: "22px", fontWeight: "900" }}>{calcResult.toLocaleString("fa-IR")}</p>
                <p style={{ color: "var(--dg-faint)", fontSize: "10px" }}>تومان</p>
              </div>
            )}

            <Link href="/products" style={{ display: "block", width: "100%", backgroundColor: "var(--dg-primary)", color: "#fff", borderRadius: "10px", padding: "10px", fontWeight: "700", fontSize: "13px", textAlign: "center", textDecoration: "none", transition: "background-color 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--dg-primary-deep)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--dg-primary)"}>
              مشاهده محصولات
            </Link>
          </div>

          {/* Live chart */}
          <div style={{ backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: "var(--dg-radius)", boxShadow: "var(--dg-shadow-sm)", padding: "22px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "38px", height: "38px", backgroundColor: "var(--dg-primary-soft)", border: "1px solid var(--dg-primary-line)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Activity size={18} color="var(--dg-primary)" />
                </div>
                <div>
                  <p style={{ color: "var(--dg-faint)", fontSize: "10px" }}>
                    {goldData?.sourceTitle ? `داده از ${goldData.sourceTitle} · هر ۱ دقیقه` : "داده از اتحادیه طلا و TGJU · هر ۱ دقیقه"}
                  </p>
                  <h3 style={{ color: "var(--dg-ink)", fontSize: "14px", fontWeight: "700" }}>قیمت لحظه‌ای طلا ۱۸ عیار</h3>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                <button onClick={() => fetchPrice(true, true)} title="دریافت نرخ جدید از اتحادیه" style={{ background: "none", border: "none", cursor: "pointer", color: refreshing ? "var(--dg-primary)" : "var(--dg-faint)", padding: "2px" }}>
                  <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                </button>
                {!loading && <span style={{ color: "var(--dg-line-strong)", fontSize: "9px" }}>{countdown}s</span>}
              </div>
            </div>

            {loading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dg-faint)", fontSize: "13px" }}>در حال بارگذاری...</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ color: "var(--dg-primary)", fontSize: "26px", fontWeight: "900", lineHeight: 1 }}>{base.toLocaleString("fa-IR")}</span>
                  <span style={{ color: "var(--dg-faint)", fontSize: "11px" }}>تومان/گرم</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", backgroundColor: isUp ? "#f0fdf4" : "#fff1f2", border: `1px solid ${isUp ? "#bbf7d0" : "#fecdd3"}`, borderRadius: "20px", padding: "2px 8px" }}>
                    {isUp ? <TrendingUp size={10} color={tc} /> : <TrendingDown size={10} color={tc} />}
                    <span style={{ color: tc, fontSize: "10px", fontWeight: "700" }}>{isUp ? "+" : "-"}{goldData?.changePercent}%</span>
                  </span>
                </div>

                <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                  {[{ l: "باز", v: goldData?.open ?? 0 }, { l: "بالا", v: goldData?.high ?? 0, c: "#16a34a" }, { l: "پایین", v: goldData?.low ?? 0, c: "#dc2626" }].map(item => (
                    <div key={item.l} style={{ flex: 1, backgroundColor: "var(--dg-bg-2)", borderRadius: "8px", padding: "4px 6px", textAlign: "center" }}>
                      <p style={{ color: "var(--dg-faint)", fontSize: "9px" }}>{item.l}</p>
                      <p style={{ color: item.c ?? "var(--dg-ink-2)", fontSize: "10px", fontWeight: "700" }}>{item.v.toLocaleString("fa-IR")}</p>
                    </div>
                  ))}
                </div>

                <div style={{ flex: 1, backgroundColor: "var(--dg-bg-2)", borderRadius: "12px", padding: "8px", marginBottom: "8px", minHeight: "80px" }}>
                  <MiniChart history={goldData?.history ?? []} isUp={isUp} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--dg-line-strong)" }}>
                  <span>{(goldData?.history?.length ?? 0) > 0 ? `${goldData!.history.length} روز` : ""}</span>
                  {goldData?.fallback && <span>* قیمت پیش‌فرض</span>}
                </div>
              </>
            )}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>

          {/* Quick links */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { href: "/contact", title: "راهنمای خرید طلا", sub: "نکات مهم قبل از خرید", btn: "مطالعه کنید" },
              { href: "/about",   title: "بسته‌بندی شیک",    sub: "هدیه‌ای به یاد ماندگار", btn: "بیشتر بدانید" },
            ].map((item, i) => (
              <Link key={i} href={item.href} style={{ textDecoration: "none", flex: 1, backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: "var(--dg-radius)", boxShadow: "var(--dg-shadow-sm)", padding: "18px", display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "border-color 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--dg-primary)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--dg-line)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                <div>
                  <p style={{ color: "var(--dg-faint)", fontSize: "10px", marginBottom: "4px" }}>{i === 0 ? "راهنمای خرید" : "خدمات ما"}</p>
                  <h3 style={{ color: "var(--dg-ink)", fontSize: "14px", fontWeight: "700", marginBottom: "6px" }}>{item.title}</h3>
                  <p style={{ color: "var(--dg-faint)", fontSize: "12px", lineHeight: "1.6" }}>{item.sub}</p>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--dg-primary)", fontSize: "12px", fontWeight: "600", border: "1px solid var(--dg-primary-line)", padding: "5px 12px", borderRadius: "10px", backgroundColor: "var(--dg-primary-soft)", marginTop: "12px", width: "fit-content" }}>
                  {item.btn}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <style>{`@media(max-width:900px){.ib-grid{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}
