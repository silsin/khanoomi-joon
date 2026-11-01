"use client";
import { useState, useEffect, useRef } from "react";
import { Heart, ShoppingCart, Check, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCart } from "./CartContext";
import ProductVideoPreview from "./ProductVideoPreview";
import { calcFinalPrice } from "@/lib/pricing";
import { firstMedia } from "@/lib/media";

interface Product {
  id: string; name: string; slug: string; price: number;
  weight: number; karat: number; images: string; videos: string; stock: number;
  ajrat_override: number; ajrat_percent: number | null; ajrat_fixed: number | null;
}
interface Settings { gold_markup_percent: string; gold_fixed_fee: string; }

function getImg(images: string): string | null {
  try { const a = JSON.parse(images); if (a[0]) return a[0]; } catch {}
  return null;
}

/**
 * «جدیدترین محصولات» — same gold-bar carousel as «پرفروش‌ترین محصولات» but fed
 * by the «جدیدترین» checkbox on each product form (admin → محصولات → ویرایش).
 * Flagged products are shown newest-first; while nothing is flagged the
 * section falls back to the most recently added products, so it always
 * reflects fresh stock.
 */
export default function NewProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings>({ gold_markup_percent: "5", gold_fixed_fee: "0" });
  const [liked, setLiked]       = useState<Set<string>>(new Set());
  const [addedId, setAddedId]   = useState<string | null>(null);
  const scrollRef               = useRef<HTMLDivElement>(null);
  const { add } = useCart();

  useEffect(() => {
    fetch("/api/products?limit=20&new=true").then(r => r.json()).then(d => {
      if (d.success && d.data.products.length > 0) { setProducts(d.data.products); return; }
      // Nothing flagged yet — show the newest published products instead
      // (the API already orders by created_at DESC).
      return fetch("/api/products?limit=20").then(r => r.json()).then(d2 => { if (d2.success) setProducts(d2.data.products); });
    }).catch(() => {});
    fetch("/api/admin/settings").then(r => r.json()).then(d => { if (d.success) setSettings(d.data); });
  }, []);

  function toggleLike(id: string) {
    setLiked(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function handleAdd(p: Product, img: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (p.stock === 0) return;
    const { finalPrice } = calcFinalPrice(p, settings);
    add({ productId: p.id, name: p.name, price: finalPrice, weight: p.weight, karat: p.karat, image: img, stock: p.stock });
    setAddedId(p.id);
    setTimeout(() => setAddedId(cur => cur === p.id ? null : cur), 1800);
  }

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  }

  if (products.length === 0) return null;

  return (
    <section className="dg-carousel dg-split" style={{ margin: "0 auto 44px", maxWidth: "1280px" }}>
      <div className="dg-head">
        <div className="dg-head-titles">
          <span className="dg-head-eyebrow">NEW ARRIVALS</span>
          <h2 className="dg-head-title">جدیدترین محصولات</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={() => scroll("right")} aria-label="بعدی" className="dg-arrow fav-arrow"><ChevronRight size={18}/></button>
          <button onClick={() => scroll("left")} aria-label="قبلی" className="dg-arrow fav-arrow"><ChevronLeft size={18}/></button>
          <Link href="/products" className="dg-head-link">مشاهده همه جدیدها<ChevronLeft size={14}/></Link>
        </div>
      </div>

      <div ref={scrollRef} className="fav-row" style={{ display: "flex", gap: "16px", overflowX: "auto", scrollbarWidth: "none", padding: "14px 20px 18px" }}>
        <style>{`.fav-row::-webkit-scrollbar{display:none}`}</style>
        {products.map(p => {
          const img       = getImg(p.images);
          const vid       = firstMedia(p.videos);
          const { finalPrice } = calcFinalPrice(p, settings);
          const isLiked   = liked.has(p.id);
          const isAdded   = addedId === p.id;
          const oos       = p.stock === 0;
          const code      = `#${p.id.slice(0, 4).toUpperCase()}`;

          return (
            <div key={p.id} className="dg-card" style={{ flexShrink: 0, width: "210px" }}>
              <Link href={`/products/${p.slug}`} className="dg-card-media" style={{ textDecoration: "none" }}>
                {img ? (
                  <img src={img} alt={p.name} loading="lazy" style={{ filter: oos ? "grayscale(1) opacity(0.5)" : "none" }} />
                ) : (
                  <span style={{ color: "var(--dg-faint)", fontSize: "11px" }}>بدون تصویر</span>
                )}
                {vid && <ProductVideoPreview src={vid} fit="contain" />}
                    <span className="dg-card-badge gold">جدید</span>
                {oos && <span className="dg-card-badge muted" style={{ top: "36px" }}>ناموجود</span>}
              </Link>
              <button onClick={e => { e.preventDefault(); toggleLike(p.id); }} aria-label="علاقه‌مندی" className={`dg-card-wish${isLiked ? " on" : ""}`}>
                <Heart size={15} fill={isLiked ? "currentColor" : "none"}/>
              </button>
              <div className="dg-card-body">
                <div className="dg-card-meta">
                  <span>{p.weight} gr · {p.karat}K</span>
                  <span>{code}</span>
                </div>
                <Link href={`/products/${p.slug}`} className="dg-card-name product-name">{p.name}</Link>
                <div className="dg-card-foot">
                  <div className="dg-card-price">
                    {finalPrice > 0 ? (
                      <><b className="price-value">{finalPrice.toLocaleString("fa-IR")}</b><small>تومان</small></>
                    ) : <small>تماس بگیرید</small>}
                  </div>
                  <button onClick={e => img ? handleAdd(p, img, e) : e.preventDefault()} disabled={oos || !img}
                    aria-label="افزودن به سبد" className={`dg-card-cart${isAdded ? " added" : ""}`}>
                    {isAdded ? <Check size={16}/> : <ShoppingCart size={16}/>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @media (max-width: 700px) {
          .dg-carousel .dg-head-title { font-size: 17px; }
          .fav-arrow { display: none !important; }
          .fav-row { gap: 12px !important; padding: 12px 16px 16px !important; -webkit-overflow-scrolling: touch; }
          .fav-row .dg-card { width: 168px !important; }
        }
      `}</style>
    </section>
  );
}
