"use client";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface Category { id: string; name: string; slug: string; product_count: number; banner_image?: string; image?: string; }

export default function CollectionsGrid() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json())
      .then(d => { if (d.success) setCategories(d.data.slice(0, 4)); });
  }, []);

  if (categories.length === 0) return null;

  return (
    <section style={{ maxWidth: "1280px", margin: "36px auto", padding: "0 16px" }}>
      <div className="dg-head" style={{ padding: 0, marginBottom: "16px" }}>
        <div className="dg-head-titles">
          <span className="dg-head-eyebrow">COLLECTIONS</span>
          <h2 className="dg-head-title">کالکشن‌های خانوم جون</h2>
        </div>
        <Link href="/collections" className="dg-head-link">مشاهده همه <ChevronLeft size={13}/></Link>
      </div>
      <div className="cg-bento">
        {categories.map((col, i) => {
          const img = col.banner_image || col.image || null;
          return (
            <Link key={col.id} href={`/products?category=${col.id}`} className={`cg-tile${i === 0 ? " big" : ""}`}>
              {img
                ? <div className="cg-img" style={{ backgroundImage: `url(${img})` }} />
                : <div className="cg-img cg-empty"><span>بدون تصویر</span></div>}
              <div className="cg-shade" />
              <div className="cg-info">
                <span className="cg-idx">{String(i + 1).padStart(2, "0")}</span>
                <p className="cg-name">{col.name}</p>
                {col.product_count > 0 && <p className="cg-count">{col.product_count} محصول</p>}
              </div>
            </Link>
          );
        })}
      </div>
      <style>{`
        .cg-bento { display: grid; grid-template-columns: 1.4fr 1fr 1fr; grid-template-rows: 220px 220px; gap: 14px; }
        .cg-tile { position: relative; display: block; border-radius: 26px; overflow: hidden; text-decoration: none; background: var(--dg-bg-2); }
        .cg-tile.big { grid-row: span 2; }
        .cg-tile:nth-child(4) { grid-column: span 2; }
        .cg-img { position: absolute; inset: 0; background-size: cover; background-position: center; transition: transform .6s ease; }
        .cg-tile:hover .cg-img { transform: scale(1.06); }
        .cg-empty { display: flex; align-items: center; justify-content: center; color: var(--dg-faint); font-size: 11px; }
        .cg-shade { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,35,29,.85) 0%, rgba(10,35,29,0) 60%); }
        .cg-info { position: absolute; right: 20px; left: 20px; bottom: 18px; }
        .cg-idx { display: inline-block; color: var(--dg-gold); font-size: 12px; font-weight: 800; letter-spacing: 2px; margin-bottom: 4px; font-family: Georgia, serif; }
        .cg-name { color: #fff; font-size: 18px; font-weight: 900; margin: 0; }
        .cg-tile.big .cg-name { font-size: 26px; }
        .cg-count { color: rgba(255,255,255,.7); font-size: 12px; margin: 3px 0 0; }
        @media(max-width:768px){
          .cg-bento { grid-template-columns: 1fr 1fr; grid-template-rows: 240px 160px 160px; gap: 10px; }
          .cg-tile.big { grid-row: auto; grid-column: span 2; }
          .cg-tile:nth-child(4) { grid-column: auto; }
          .cg-tile { border-radius: 20px; }
        }
      `}</style>
    </section>
  );
}
