"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BUDGET_BANNERS_SETTING_KEY,
  DEFAULT_BUDGET_BANNERS,
  parseBudgetBanners,
  shadeColor,
  alphaColor,
  type BudgetBanner,
} from "@/lib/budget-banners";

/**
 * بنرهای بودجه — homepage price-range tiles.
 * List, labels and colors come from Admin → تنظیمات → بنرهای بودجه;
 * each tile derives its gradient, hover shadow and caption tint from its own color.
 */
export default function BudgetBanners() {
  const [items, setItems] = useState<BudgetBanner[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setItems(DEFAULT_BUDGET_BANNERS); return; }
        setItems(parseBudgetBanners(d.data?.[BUDGET_BANNERS_SETTING_KEY]));
      })
      .catch(() => setItems(DEFAULT_BUDGET_BANNERS));
  }, []);

  if (!items || items.length === 0) return null;

  const cols = Math.min(Math.max(items.length, 1), 4);

  return (
    <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 16px 32px" }}>
      <div
        className="bb-grid"
        style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: "14px" }}
      >
        {items.map((b, i) => {
          const c = b.color;
          const rangeSize = b.range.length > 5 ? 28 : b.range.length > 3 ? 36 : 46;
          return (
            <Link key={`${b.range}-${i}`} href={b.href} className="bbx" style={{ ["--bb" as string]: c, ["--bb-soft" as string]: alphaColor(c, 0.1), ["--bb-deep" as string]: shadeColor(c, -22) }}>
              <span className="bbx-orb" />
              <span className="bbx-tag">بودجه</span>
              <span className="bbx-range" style={{ fontSize: `${rangeSize}px` }}>{b.range}</span>
              <span className="bbx-label">{b.label}</span>
              <span className="bbx-go">←</span>
            </Link>
          );
        })}
      </div>
      <style>{`
        .bbx { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-height: 160px; padding: 20px; border-radius: 24px; background: #fff; border: 1px solid var(--dg-line); text-decoration: none; transition: transform .25s, box-shadow .25s, border-color .25s; }
        .bbx:hover { transform: translateY(-4px); box-shadow: 0 14px 30px var(--bb-soft); border-color: var(--bb); }
        .bbx-orb { position: absolute; left: -36px; bottom: -36px; width: 130px; height: 130px; border-radius: 50%; background: var(--bb-soft); transition: transform .4s; }
        .bbx:hover .bbx-orb { transform: scale(1.25); }
        .bbx-tag { position: relative; font-size: 10.5px; font-weight: 800; color: var(--bb-deep); background: var(--bb-soft); padding: 3px 10px; border-radius: 999px; }
        .bbx-range { position: relative; font-weight: 900; line-height: 1.1; color: var(--bb-deep); direction: ltr; letter-spacing: -1px; margin-top: 6px; }
        .bbx-label { position: relative; color: var(--dg-ink-2); font-size: 12.5px; font-weight: 700; }
        .bbx-go { position: absolute; left: 16px; top: 16px; width: 32px; height: 32px; border-radius: 11px; background: var(--bb); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; }
        @media(max-width:768px){.bb-grid{grid-template-columns:repeat(2,1fr)!important}}
        @media(max-width:420px){.bb-grid{grid-template-columns:1fr!important}}
      `}</style>
    </section>
  );
}
