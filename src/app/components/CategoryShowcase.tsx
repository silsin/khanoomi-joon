"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  CATEGORY_SHOWCASE_SETTING_KEY,
  DEFAULT_CATEGORY_SHOWCASE,
  parseCategoryShowcase,
  type CategoryShowcaseConfig,
} from "@/lib/category-showcase";

interface Category { id: string; name: string; slug: string; product_count: number; banner_image?: string; image?: string; }

/** A resolved tile: a category plus the admin overrides applied on top of it. */
interface Tile { key: string; href: string; name: string; image: string | null; }

export default function CategoryShowcase() {
  const [cats, setCats] = useState<Category[]>([]);
  const [cfg, setCfg] = useState<CategoryShowcaseConfig>(DEFAULT_CATEGORY_SHOWCASE);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(d => { if (d.success) setCats(d.data); }).catch(() => {});
    fetch("/api/admin/settings").then(r => r.json()).then(d => {
      if (d.success && d.data?.[CATEGORY_SHOWCASE_SETTING_KEY] != null)
        setCfg(parseCategoryShowcase(d.data[CATEGORY_SHOWCASE_SETTING_KEY]));
    }).catch(() => {});
  }, []);

  if (cats.length === 0) return null;

  // Admin picks the tiles (order + title/image overrides); with no explicit
  // list, fall back to the first tiles' worth of categories.
  const byId = new Map(cats.map(c => [c.id, c]));
  const tiles: Tile[] = [];
  if (cfg.items.length > 0) {
    for (const it of cfg.items) {
      const cat = byId.get(it.category_id);
      if (!cat) continue; // category deleted — skip the tile
      tiles.push({
        key: cat.id,
        href: it.href || `/products?category=${cat.id}`,
        name: it.title || cat.name,
        image: it.image || cat.banner_image || cat.image || null,
      });
    }
  } else {
    for (const cat of cats) {
      tiles.push({
        key: cat.id,
        href: `/products?category=${cat.id}`,
        name: cat.name,
        image: cat.banner_image || cat.image || null,
      });
    }
  }
  if (tiles.length === 0) return null;

  const gridStyle: React.CSSProperties = cfg.item_width > 0
    ? { display: "grid", gridTemplateColumns: `repeat(${cfg.columns}, ${cfg.item_width}px)`, gap: `${cfg.gap}px`, justifyContent: "center" }
    : { display: "grid", gridTemplateColumns: `repeat(${cfg.columns}, 1fr)`, gap: `${cfg.gap}px` };

  return (
    <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 16px 32px" }}>
      <div style={gridStyle} className="cat-showcase-grid">
        {tiles.map(tile => (
          <Link key={tile.key} href={tile.href} style={{ textDecoration: "none", display: "block" }}>
            <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", height: `${cfg.item_height}px`, cursor: "pointer", transition: "transform 0.3s ease, box-shadow 0.3s ease", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", backgroundColor: "var(--dg-line)" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-4px)"; el.style.boxShadow = "0 12px 32px rgba(0,0,0,0.18)"; const img = el.querySelector(".cs-img") as HTMLElement; if (img) img.style.transform = "scale(1.06)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; const img = el.querySelector(".cs-img") as HTMLElement; if (img) img.style.transform = "scale(1)"; }}>
              {tile.image ? (
                <img className="cs-img" src={tile.image} alt={tile.name}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", filter: cfg.grayscale ? "grayscale(100%) contrast(1.05)" : "none", transition: "transform 0.5s ease", display: "block" }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, backgroundColor: "var(--dg-line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "var(--dg-muted)", fontSize: "12px" }}>بدون تصویر</span>
                </div>
              )}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: "16px", right: "14px", left: "14px", display: "flex", justifyContent: "flex-end" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(20,20,20,0.88)", color: "#fff", padding: "9px 16px", borderRadius: "30px", fontSize: "12px", fontWeight: "700", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.12)", whiteSpace: "nowrap" }}>
                  <ArrowRight size={14} strokeWidth={2.5} />
                  مشاهده همه {tile.name}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <style>{`@media(max-width:900px){.cat-showcase-grid{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:480px){.cat-showcase-grid{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}
