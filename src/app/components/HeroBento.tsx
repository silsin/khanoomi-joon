"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Coins, Zap, BadgePercent, ChevronLeft } from "lucide-react";
import HeroSlider from "./HeroSlider";

interface GoldData { price: number; high: number; low: number; changePercent: string; isUp: boolean; }

const QUICK = [
  { href: "/products?coin=true",    label: "سکه و آبشده",  sub: "بر اساس قیمت روز",  icon: <Coins size={18} /> },
  { href: "/products?lowWage=true", label: "کم اُجرت",      sub: "کمترین هزینه ساخت", icon: <BadgePercent size={18} /> },
  { href: "/products?express=true", label: "ارسال فوری",    sub: "تحویل سریع",        icon: <Zap size={18} /> },
];

/**
 * Homepage hero as a bento: the slider on one side, a live gold-price card and
 * quick shortcuts stacked beside it. Reads the same price API as GoldTicker.
 */
export default function HeroBento() {
  const [gold, setGold] = useState<GoldData | null>(null);

  useEffect(() => {
    const load = () => fetch("/api/admin/gold-price", { cache: "no-store" }).then(r => r.json())
      .then(d => { if (d.success) setGold(d.data); }).catch(() => {});
    load();
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <section className="hb">
      <div className="hb-stage"><HeroSlider /></div>
      <div className="hb-side">
        <div className="hb-gold">
          <div className="hb-gold-top">
            <span className="hb-live"><i /> قیمت لحظه‌ای</span>
            {gold && (
              <span className={`hb-chg ${gold.isUp ? "up" : "down"}`}>
                {gold.isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {gold.changePercent}%
              </span>
            )}
          </div>
          <p className="hb-gold-label">هر گرم طلای ۱۸ عیار</p>
          <div className="hb-gold-num">
            {gold ? gold.price.toLocaleString("fa-IR") : "—"}
            <small>تومان</small>
          </div>
          {gold && (
            <div className="hb-gold-range">
              <span>بیشترین <b>{gold.high.toLocaleString("fa-IR")}</b></span>
              <span>کمترین <b>{gold.low.toLocaleString("fa-IR")}</b></span>
            </div>
          )}
          <Link href="/products" className="hb-gold-cta">خرید طلا <ChevronLeft size={14} /></Link>
        </div>
        <div className="hb-quick">
          {QUICK.map(q => (
            <Link key={q.href} href={q.href} className="hb-q">
              <span className="hb-q-ic">{q.icon}</span>
              <span className="hb-q-txt"><b>{q.label}</b><small>{q.sub}</small></span>
              <ChevronLeft size={15} className="hb-q-arr" />
            </Link>
          ))}
        </div>
      </div>
      <style>{`
        .hb { max-width: 1280px; margin: 20px auto 0; padding: 0 16px; display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 16px; }
        .hb-stage { min-width: 0; }
        .hb-stage .hs-wrap, .hb-stage .hs-empty { margin: 0 !important; max-width: none !important; height: 100%; min-height: 480px; }
        .hb-stage > span { margin: 0 !important; height: 480px !important; }
        .hb-side { display: flex; flex-direction: column; gap: 16px; }
        .hb-gold { position: relative; overflow: hidden; border-radius: 28px; padding: 22px; background: var(--dg-ink); color: #fff; }
        .hb-gold::before { content: ""; position: absolute; left: -50px; bottom: -70px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(198,161,91,.35), transparent 70%); }
        .hb-gold-top { display: flex; align-items: center; justify-content: space-between; }
        .hb-live { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: rgba(255,255,255,.7); }
        .hb-live i { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,.2); animation: hbPulse 1.6s infinite; }
        @keyframes hbPulse { 50% { box-shadow: 0 0 0 7px rgba(34,197,94,0); } }
        .hb-chg { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 999px; direction: ltr; }
        .hb-chg.up { background: rgba(34,197,94,.15); color: #4ade80; }
        .hb-chg.down { background: rgba(239,68,68,.15); color: #f87171; }
        .hb-gold-label { margin: 18px 0 4px; font-size: 12px; color: rgba(255,255,255,.6); }
        .hb-gold-num { font-size: 30px; font-weight: 900; background: var(--dg-grad-gold); -webkit-background-clip: text; background-clip: text; color: transparent; display: flex; align-items: baseline; gap: 6px; }
        .hb-gold-num small { font-size: 12px; font-weight: 500; color: rgba(255,255,255,.55); -webkit-text-fill-color: rgba(255,255,255,.55); }
        .hb-gold-range { display: flex; justify-content: space-between; margin-top: 14px; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,.15); font-size: 11px; color: rgba(255,255,255,.55); }
        .hb-gold-range b { color: #fff; font-weight: 700; }
        .hb-gold-cta { position: relative; margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 4px; background: var(--dg-grad-gold); color: #fff; text-decoration: none; padding: 11px; border-radius: 14px; font-size: 13px; font-weight: 800; }
        .hb-quick { flex: 1; display: flex; flex-direction: column; gap: 8px; background: #fff; border: 1px solid var(--dg-line); border-radius: 28px; padding: 10px; box-shadow: var(--dg-shadow-sm); }
        .hb-q { flex: 1; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 18px; text-decoration: none; transition: background .2s; }
        .hb-q:hover { background: var(--dg-primary-soft); }
        .hb-q-ic { width: 40px; height: 40px; border-radius: 13px; background: var(--dg-gold-soft); color: var(--dg-gold-deep); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .hb-q-txt { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .hb-q-txt b { color: var(--dg-ink); font-size: 13px; }
        .hb-q-txt small { color: var(--dg-muted); font-size: 11px; }
        .hb-q-arr { color: var(--dg-faint); }
        @media (max-width: 1000px) {
          .hb { grid-template-columns: 1fr; }
          .hb-side { flex-direction: row; }
          .hb-gold, .hb-quick { flex: 1; }
        }
        @media (max-width: 640px) {
          .hb { padding: 0 8px; margin-top: 12px; gap: 10px; }
          .hb-stage .hs-wrap, .hb-stage .hs-empty { min-height: 380px; }
          .hb-side { flex-direction: column; gap: 10px; }
          .hb-gold, .hb-quick { border-radius: 22px; }
        }
      `}</style>
    </section>
  );
}
