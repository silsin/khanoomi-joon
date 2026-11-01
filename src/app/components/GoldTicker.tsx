"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { TrendingUp, TrendingDown, RefreshCw, Calculator } from "lucide-react";

interface GoldData {
  price: number;
  high: number;
  low: number;
  open: number;
  changePercent: string;
  isUp: boolean;
  fallback?: boolean;
  stale?: boolean;
}

export default function GoldTicker() {
  const [data, setData] = useState<GoldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Live tickers poll the API every 60s; CountdownDial separately counts that minute down.
  const [countdown, setCountdown] = useState(60);
  const [markup, setMarkup] = useState(5);
  // Mini calculator
  const [grams, setGrams] = useState("");
  const [calcOpen, setCalcOpen] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // `force` is set by the refresh button: it asks the server for a NEW reading
  // (`?refresh=1` waits for the real upstream instead of the 60s cache), while
  // the automatic 60s poll stays on the fast cached path.
  const fetch_ = useCallback(async (spinner = false, force = false) => {
    if (spinner) setRefreshing(true);
    try {
      const [pr, sr] = await Promise.all([
        fetch(`/api/admin/gold-price${force ? "?refresh=1" : ""}`, { cache: "no-store" }),
        fetch("/api/admin/settings"),
      ]);
      const pj = await pr.json();
      const sj = await sr.json();
      if (pj.success) setData(pj.data);
      if (sj.success) setMarkup(parseFloat(sj.data?.gold_markup_percent ?? "5") || 5);
    } catch {}
    finally { setLoading(false); setRefreshing(false); setCountdown(60); }
  }, []);

  useEffect(() => {
    fetch_();
    const iv = setInterval(() => fetch_(), 60_000);
    countdownRef.current = setInterval(() => setCountdown(c => c <= 1 ? 60 : c - 1), 1000);
    return () => { clearInterval(iv); if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [fetch_]);

  const price = data?.price ?? 0;
  const priceWithMarkup = Math.round(price * (1 + markup / 100));
  const calcResult = grams && parseFloat(grams) > 0
    ? Math.round(parseFloat(grams) * priceWithMarkup)
    : null;
  const isUp = data?.isUp ?? true;
  const color = isUp ? "#10b981" : "#ef4444";

  return (
    <div style={{
      backgroundColor: "var(--dg-bg-2)",
      borderBottom: "1px solid var(--dg-line)",
      borderTop: "1px solid var(--dg-surface)",
      position: "relative",
    }}>
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        gap: "0",
        height: "48px",
        flexWrap: "nowrap",
        overflow: "hidden",
      }}>

        {/* Label */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          paddingLeft: "16px",
          borderLeft: "1px solid var(--dg-line)",
          flexShrink: 0,
        }}>
          <div style={{
            width: "6px", height: "6px", borderRadius: "50%",
            backgroundColor: loading ? "var(--dg-muted)" : color,
            animation: !loading ? "pulse-dot 2s ease-in-out infinite" : "none",
          }} />
          <span style={{ color: "var(--dg-muted)", fontSize: "11px", fontWeight: "600", letterSpacing: "0.5px" }}>
            طلای ۱۸ عیار
          </span>
        </div>

        {/* Price */}
        <div style={{ padding: "0 16px", borderLeft: "1px solid var(--dg-line)", flexShrink: 0 }}>
          {loading ? (
            <span style={{ color: "var(--dg-muted)", fontSize: "13px" }}>در حال دریافت...</span>
          ) : (
            <span style={{ color: "var(--dg-primary)", fontSize: "15px", fontWeight: "800", letterSpacing: "-0.5px" }}>
              {price.toLocaleString("fa-IR")}
              <span style={{ color: "var(--dg-muted)", fontSize: "11px", fontWeight: "400", marginRight: "4px" }}>تومان/گرم</span>
            </span>
          )}
        </div>

        {/* Change badge */}
        {!loading && data && (
          <div style={{
            padding: "0 16px",
            borderLeft: "1px solid var(--dg-line)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}>
            {isUp ? <TrendingUp size={12} color={color} /> : <TrendingDown size={12} color={color} />}
            <span style={{ color, fontSize: "12px", fontWeight: "700" }}>
              {isUp ? "+" : "-"}{data.changePercent}%
            </span>
          </div>
        )}

        {/* High / Low */}
        {!loading && data && (
          <div style={{
            padding: "0 16px",
            borderLeft: "1px solid var(--dg-line)",
            flexShrink: 0,
            display: "flex",
            gap: "12px",
          }}>
            <span style={{ fontSize: "11px" }}>
              <span style={{ color: "var(--dg-muted)" }}>بالا: </span>
              <span style={{ color: "#10b981" }}>{data.high.toLocaleString("fa-IR")}</span>
            </span>
            <span style={{ fontSize: "11px" }}>
              <span style={{ color: "var(--dg-muted)" }}>پایین: </span>
              <span style={{ color: "#ef4444" }}>{data.low.toLocaleString("fa-IR")}</span>
            </span>
          </div>
        )}

        {/* Mini calculator toggle */}
        <button
          onClick={() => setCalcOpen(o => !o)}
          style={{
            marginRight: "auto",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            backgroundColor: calcOpen ? "color-mix(in srgb, var(--dg-primary) 12%, transparent)" : "transparent",
            border: calcOpen ? "1px solid color-mix(in srgb, var(--dg-primary) 30%, transparent)" : "1px solid transparent",
            borderRadius: "10px",
            padding: "4px 10px",
            color: calcOpen ? "var(--dg-primary)" : "var(--dg-muted)",
            cursor: "pointer",
            fontSize: "12px",
            fontFamily: "inherit",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
        >
          <Calculator size={13} />
          محاسبه
        </button>

        {/* Refresh + countdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingRight: "8px", flexShrink: 0 }}>
          <button
            onClick={() => fetch_(true, true)}
            title="دریافت نرخ جدید از اتحادیه"
            style={{ background: "none", border: "none", cursor: "pointer", color: refreshing ? "var(--dg-primary)" : "var(--dg-muted)", padding: "2px", display: "flex" }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          </button>
          {!loading && (
            <span style={{ color: "var(--dg-line)", fontSize: "9px" }}>{countdown}s</span>
          )}
        </div>
      </div>

      {/* Mini calculator dropdown */}
      {calcOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "var(--dg-bg-2)",
          border: "1px solid var(--dg-line)",
          borderRadius: "14px",
          padding: "16px",
          width: "280px",
          zIndex: 50,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          animation: "fadeDown 0.15s ease",
        }}>
          <p style={{ color: "var(--dg-muted)", fontSize: "11px", marginBottom: "10px" }}>
            قیمت هر گرم (با اجرت {markup}%): <strong style={{ color: "var(--dg-primary)" }}>{priceWithMarkup.toLocaleString("fa-IR")} ت</strong>
          </p>
          <div style={{ position: "relative", marginBottom: "10px" }}>
            <input
              type="number"
              value={grams}
              onChange={e => setGrams(e.target.value)}
              placeholder="وزن به گرم..."
              autoFocus
              min="0"
              step="0.01"
              style={{
                width: "100%",
                backgroundColor: "var(--dg-bg-2)",
                border: "1px solid var(--dg-line)",
                borderRadius: "10px",
                padding: "8px 12px",
                color: "var(--dg-ink)",
                fontSize: "13px",
                outline: "none",
                direction: "ltr",
                fontFamily: "inherit",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--dg-primary)")}
              onBlur={e => (e.target.style.borderColor = "var(--dg-line)")}
            />
          </div>
          {calcResult !== null ? (
            <div style={{
              backgroundColor: "color-mix(in srgb, var(--dg-primary) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--dg-primary) 25%, transparent)",
              borderRadius: "10px",
              padding: "10px 12px",
              textAlign: "center",
            }}>
              <p style={{ color: "var(--dg-muted)", fontSize: "10px", marginBottom: "3px" }}>قیمت تخمینی</p>
              <p style={{ color: "var(--dg-primary)", fontSize: "18px", fontWeight: "800" }}>
                {calcResult.toLocaleString("fa-IR")}
                <span style={{ color: "var(--dg-muted)", fontSize: "11px", fontWeight: "400", marginRight: "4px" }}>تومان</span>
              </p>
            </div>
          ) : (
            <p style={{ color: "var(--dg-muted)", fontSize: "11px", textAlign: "center" }}>وزن را وارد کنید</p>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
