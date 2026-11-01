"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

interface StripLink { label: string; href: string; }

const DEFAULTS: StripLink[] = [
  { label: "جدیدترین محصولات",    href: "/products" },
  { label: "جدیدترین گردنبندها",  href: "/products?category=necklaces" },
  { label: "خرید اقساطی طلا",     href: "/contact" },
  { label: "جدیدترین کالکشن‌ها",  href: "/collections" },
  { label: "پرفروش‌ترین محصولات", href: "/products" },
  { label: "جدیدترین دستبندها",   href: "/products?category=bracelets" },
  { label: "جدیدترین گوشواره‌ها", href: "/products?category=earrings" },
  { label: "محصولات ویژه",         href: "/products" },
];

export default function PromoStrip() {
  const [items, setItems] = useState<StripLink[]>(DEFAULTS);
  const [fontSize, setFontSize] = useState(12);
  const [speed, setSpeed] = useState(32);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(d => {
      if (!d.success) return;
      if (d.data.promo_strip_links) {
        try {
          const parsed = JSON.parse(d.data.promo_strip_links);
          if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed);
        } catch {}
      }
      const fs = parseInt(String(d.data.promo_strip_font_size ?? ""), 10);
      if (!Number.isNaN(fs)) setFontSize(Math.min(40, Math.max(8, fs)));
      const sp = parseInt(String(d.data.promo_strip_speed ?? ""), 10);
      if (!Number.isNaN(sp)) setSpeed(Math.min(120, Math.max(5, sp)));
    }).catch(() => {});
  }, []);

  if (items.length === 0) return null;

  // Duplicate for seamless scroll
  const doubled = [...items, ...items];
  const height = Math.max(36, Math.round(fontSize * 2.6));

  return (
    <div style={{ maxWidth: "1280px", margin: "14px auto 0", borderRadius: "16px", background: "var(--dg-gold-soft)", border: "1px solid #eadfc8", overflow: "hidden", height: `${height}px`, display: "flex", alignItems: "center", maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)" }} className="ps-wrap">
      <div className="ps-track" style={{ display: "flex", whiteSpace: "nowrap" }}>
        {doubled.map((item, i) => (
          <Link key={i} href={item.href} style={{
            display: "inline-flex", alignItems: "center",
            color: "var(--dg-gold-deep)", textDecoration: "none", gap: "10px",
            fontSize: `${fontSize}px`, fontWeight: "600",
            padding: "0 22px", height: `${height}px`,
            
            whiteSpace: "nowrap", transition: "background-color 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--dg-primary)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--dg-gold-deep)"}
          ><span style={{ width: 6, height: 6, background: "var(--dg-gold)", transform: "rotate(45deg)", display: "inline-block" }} />{item.label}</Link>
        ))}
      </div>
      <style>{`
        .ps-track{animation:psScroll ${speed}s linear infinite}
        .ps-track:hover{animation-play-state:paused}
        @media(max-width:1310px){.ps-wrap{margin:14px 16px 0 !important}}
        @media(max-width:900px){.ps-wrap{margin:10px 8px 0 !important}}
        @keyframes psScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      `}</style>
    </div>
  );
}
