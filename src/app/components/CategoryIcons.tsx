"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Category { id: string; name: string; slug: string; product_count: number; image?: string; banner_image?: string; }

// SVG icons per slug
const CatSvg = ({ slug }: { slug: string }) => {
  const icons: Record<string, React.ReactNode> = {
    necklaces: <svg viewBox="0 0 64 64" fill="none" stroke="#0f5c45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32"><path d="M32 12C16 12 8 22 8 34c0 12 10 20 24 20s24-8 24-20c0-12-8-22-24-22Z"/><circle cx="32" cy="54" r="4" fill="#c6a15b" stroke="none"/><path d="M24 12c0-4 4-6 8-6s8 2 8 6"/></svg>,
    rings:     <svg viewBox="0 0 64 64" fill="none" stroke="#0f5c45" strokeWidth="2.5" strokeLinecap="round" width="32" height="32"><circle cx="32" cy="32" r="18"/><circle cx="32" cy="32" r="10"/><path d="M26 14c2-4 10-4 12 0"/><circle cx="32" cy="11" r="3" fill="#c6a15b" stroke="none"/></svg>,
    bracelets: <svg viewBox="0 0 64 64" fill="none" stroke="#0f5c45" strokeWidth="2.5" strokeLinecap="round" width="32" height="32"><path d="M14 32c0-12 6-18 18-18s18 6 18 18-6 18-18 18-18-6-18-18Z"/><path d="M14 30h36"/><circle cx="32" cy="14" r="3" fill="#c6a15b" stroke="none"/><circle cx="32" cy="50" r="3" fill="#c6a15b" stroke="none"/></svg>,
    earrings:  <svg viewBox="0 0 64 64" fill="none" stroke="#0f5c45" strokeWidth="2.5" strokeLinecap="round" width="32" height="32"><circle cx="22" cy="18" r="4"/><path d="M22 22v20l-6 8h12l-6-8"/><circle cx="42" cy="18" r="4"/><path d="M42 22v20l-6 8h12l-6-8"/></svg>,
    coin:      <svg viewBox="0 0 64 64" fill="none" stroke="#0f5c45" strokeWidth="2.5" strokeLinecap="round" width="32" height="32"><circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="13"/><path d="M32 24v2M32 38v2M24 32h2M38 32h2"/></svg>,
    anklet:    <svg viewBox="0 0 64 64" fill="none" stroke="#0f5c45" strokeWidth="2.5" strokeLinecap="round" width="32" height="32"><path d="M12 36C12 24 20 16 32 16s20 8 20 20"/><path d="M16 36c0 6 7 12 16 12s16-6 16-12"/><circle cx="32" cy="52" r="4" fill="#c6a15b" stroke="none"/></svg>,
    keychain:  <svg viewBox="0 0 64 64" fill="none" stroke="#0f5c45" strokeWidth="2.5" strokeLinecap="round" width="32" height="32"><circle cx="32" cy="22" r="12"/><circle cx="32" cy="22" r="5"/><path d="M32 34v20M26 44h12M26 50h12"/></svg>,
    kids:      <svg viewBox="0 0 64 64" fill="none" stroke="#0f5c45" strokeWidth="2.5" strokeLinecap="round" width="32" height="32"><circle cx="32" cy="20" r="10"/><path d="M20 20C14 20 10 26 10 32v18h44V32c0-6-4-12-10-12"/></svg>,
    sets:      <svg viewBox="0 0 64 64" fill="none" stroke="#0f5c45" strokeWidth="2.5" strokeLinecap="round" width="32" height="32"><circle cx="32" cy="22" r="8"/><path d="M18 46c0-8 6-12 14-12s14 4 14 12"/><path d="M14 54h36"/></svg>,
    accessories: <svg viewBox="0 0 64 64" fill="none" stroke="#0f5c45" strokeWidth="2.5" strokeLinecap="round" width="32" height="32"><rect x="14" y="22" width="36" height="26" rx="4"/><path d="M22 22v-4c0-4 4-6 10-6s10 2 10 6v4"/><circle cx="32" cy="35" r="5"/></svg>,
  };
  return <>{icons[slug] || <svg viewBox="0 0 64 64" fill="none" stroke="#0f5c45" strokeWidth="2.5" width="32" height="32"><circle cx="32" cy="32" r="20"/><path d="M22 32l8 8 12-16"/></svg>}</>;
};

export default function CategoryIcons() {
  const [cats, setCats] = useState<Category[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json())
      .then(d => { if (d.success) setCats(d.data); }).catch(() => {});
  }, []);

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  }

  if (cats.length === 0) return null;

  return (
    <section style={{ padding: "24px 0 28px" }}>
      <div className="dg-head" style={{ marginBottom: "14px" }}>
        <div className="dg-head-titles">
          <span className="dg-head-eyebrow">CATEGORIES</span>
          <h2 className="dg-head-title">خرید بر اساس دسته‌بندی</h2>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => scroll("right")} aria-label="بعدی" className="dg-arrow cat-icons-arrow"><ChevronRight size={16}/></button>
          <button onClick={() => scroll("left")} aria-label="قبلی" className="dg-arrow cat-icons-arrow"><ChevronLeft size={16}/></button>
        </div>
      </div>
      <div className="cat-icons-inner" style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 20px" }}>
        <div ref={scrollRef} className="cat-icons-track" style={{ display: "flex", gap: "14px", overflowX: "auto", scrollbarWidth: "none", padding: "6px 2px" }}>
          <style>{`.cat-icons-track::-webkit-scrollbar{display:none}`}</style>
          {cats.map(cat => {
            const img = cat.banner_image || cat.image || null;
            return (
              <Link key={cat.id} href={`/products?category=${cat.id}`} className="dg-cat">
                <div className="dg-cat-img">
                  {img
                    ? <img src={img} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                    : <CatSvg slug={cat.slug}/>
                  }
                </div>
                <div className="dg-cat-foot">
                  <span className="dg-cat-name">{cat.name}</span>
                  {cat.product_count > 0 && <span className="dg-cat-count">{cat.product_count.toLocaleString("fa-IR")} محصول</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <style>{`
        .dg-cat { text-decoration: none; display: flex; flex-direction: column; flex-shrink: 0; width: 150px; background: #fff; border: 1px solid var(--dg-line); border-radius: 22px; padding: 8px; transition: transform .25s ease, box-shadow .25s ease, border-color .25s; }
        .dg-cat:hover { transform: translateY(-4px); box-shadow: var(--dg-shadow); border-color: var(--dg-primary-line); }
        .dg-cat-img { height: 118px; border-radius: 16px; overflow: hidden; background: radial-gradient(circle at 50% 30%, #fff 0%, var(--dg-primary-soft) 100%); display: flex; align-items: center; justify-content: center; }
        .dg-cat-img svg { width: 44px; height: 44px; }
        .dg-cat-foot { padding: 10px 6px 4px; display: flex; flex-direction: column; gap: 2px; }
        .dg-cat-name { color: var(--dg-ink); font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color .2s; }
        .dg-cat-count { color: var(--dg-muted); font-size: 11px; }
        .dg-cat:hover .dg-cat-name { color: var(--dg-primary); }
        @media (max-width: 768px) {
          .cat-icons-inner { padding: 0 12px !important; }
          .cat-icons-arrow { display: none !important; }
          .cat-icons-track { gap: 8px !important; scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch; }
          .dg-cat { width: 120px; border-radius: 18px; }
          .dg-cat-img { height: 92px; border-radius: 13px; }
        }
      `}</style>
    </section>
  );
}
