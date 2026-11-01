"use client";
import { useState, useEffect, useRef } from "react";
import { Heart, ShoppingCart, Check, ChevronLeft, ChevronRight, Coins } from "lucide-react";
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

/** Carousel autoplay interval — same as SpecialOffers. */
const AUTOPLAY_MS = 3000;
/** Must match the `gap` on `.dg-cn-track`. */
const CARD_GAP = 12;

/** After a manual arrow press, autoplay stays frozen this long so the user can read the card. */
const MANUAL_PAUSE_MS = 5000;

/**
 * «سکه و آبشده» — same card/carousel design as «محصولات کم اُجرت» but with
 * a plain (no background, no border) wrapper: a header row with the title
 * (start) and «مشاهده همه» (end of the left) above a full-width carousel.
 * Products are managed from the dedicated «سکه و آبشده» admin page
 * (/admin/coin-products), which flags products with coin=1.
 */
const CSS = `
.dg-cn-wrap{max-width:1280px;margin:0 auto;padding:0 16px;}
.dg-cn-panel{border-radius:24px;background:linear-gradient(180deg,var(--dg-gold-soft) 0%,#fbf8f1 100%);border:1px solid #eadfc8;padding:18px;}
.dg-cn-row{display:flex;flex-wrap:wrap;align-items:stretch;}
.dg-cn-aside{flex:0 0 100%;max-width:100%;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:2px 0 10px;}
.dg-cn-title,.dg-cn-aside-btn{flex:0 0 auto;display:flex;align-items:center;margin:0;}
.dg-cn-title{color:var(--dg-ink);font-size:15px;font-weight:800;line-height:1.7;text-align:center;}
.dg-cn-viewall{background:var(--dg-primary);color:#fff;display:inline-block;border-radius:999px;padding:9px 20px;font-size:12px;font-weight:800;text-decoration:none;white-space:nowrap;transition:all .25s ease;}
.dg-cn-viewall:hover{background:var(--dg-gold);color:#fff;}

/* ── Carousel ── */
.dg-cn-main{flex:0 0 100%;max-width:100%;min-width:0;position:relative;}
.dg-cn-track{display:flex;gap:12px;overflow-x:auto;scroll-behavior:smooth;scrollbar-width:none;-ms-overflow-style:none;padding:4px 2px;}
.dg-cn-track::-webkit-scrollbar{display:none;}
.dg-cn-card{flex:0 0 calc(33.3333% - 8px);max-width:calc(33.3333% - 8px);background:#fff;border:1px solid var(--dg-line);padding:7px;display:flex;flex-direction:column;text-align:center;overflow:hidden;border-radius:18px;transition:transform .25s ease,box-shadow .25s ease;}
.dg-cn-media{position:relative;display:block;background:radial-gradient(circle at 50% 40%,#fff 0%,var(--dg-bg-2) 100%);aspect-ratio:1/1;overflow:hidden;border-radius:13px;}
.dg-cn-img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .4s ease;}
.dg-cn-media:hover .dg-cn-img{transform:scale(1.06);}
.dg-cn-card:hover{transform:translateY(-3px);box-shadow:var(--dg-shadow);}
.dg-cn-badge{position:absolute;z-index:2;top:8px;right:8px;color:#fff;background:var(--dg-gold-deep);font-size:11px;font-weight:800;padding:3px 10px;display:flex;align-items:center;gap:4px;border-radius:999px;direction:ltr;}
.dg-cn-oos{position:absolute;z-index:2;top:8px;right:8px;color:var(--dg-muted);background:var(--dg-bg-2);border:1px solid var(--dg-line);font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;}
.dg-cn-noimg{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--dg-muted);font-size:11px;}
`;

const CSS2 = `
.dg-cn-wish{position:absolute;z-index:10;top:8px;left:8px;width:32px;height:32px;padding:0;border-radius:50%;background:rgba(255,255,255,.94);color:var(--dg-muted);border:1px solid var(--dg-line);cursor:pointer;display:flex;align-items:center;justify-content:center;visibility:hidden;opacity:0;transform:translateX(15px);transition:all .3s ease;}
.dg-cn-media:hover .dg-cn-wish{visibility:visible;opacity:1;transform:translateX(0);}
.dg-cn-wish:hover{color:#e11d48;border-color:#fecdd3;background:#fff;}
.dg-cn-wish.on{visibility:visible;opacity:1;transform:translateX(0);color:#e11d48;border-color:#fecdd3;}
.dg-cn-actions{position:absolute;z-index:10;left:8px;right:8px;bottom:8px;opacity:0;visibility:hidden;transform:translateY(12px);transition:all .3s ease;}
.dg-cn-media:hover .dg-cn-actions,.dg-cn-media:focus-within .dg-cn-actions{opacity:1;visibility:visible;transform:translateY(0);}
@media (hover:none){
  .dg-cn-actions{opacity:1;visibility:visible;transform:none;}
  .dg-cn-wish{visibility:visible;opacity:1;transform:none;}
}
.dg-cn-cart{direction:rtl;width:100%;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 4px;background:var(--dg-primary);color:#fff;border:none;border-radius:11px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:all .25s ease;box-shadow:0 6px 16px rgba(15,92,69,.25);}
.dg-cn-cart:hover:not(:disabled){background:var(--dg-primary-deep);color:#fff;}
.dg-cn-cart:disabled{background:var(--dg-bg-2);color:var(--dg-faint);box-shadow:none;cursor:not-allowed;}
.dg-cn-cart.added,.dg-cn-cart.added:disabled{background:#16a34a;color:#fff;}
.dg-cn-body{background:#fff;padding:10px 6px 6px;display:flex;flex-direction:column;flex:1;}
.dg-cn-name{height:42px;margin:0;font-size:13px;font-weight:600;line-height:1.6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-family:var(--font-product,inherit);}
.dg-cn-name a{color:var(--dg-ink);text-decoration:none;}
.dg-cn-name a:hover{color:var(--dg-primary);}
.dg-cn-price{display:flex;align-items:baseline;justify-content:center;flex-wrap:wrap;gap:6px;margin:12px 0 0;padding-top:10px;border-top:1px dashed var(--dg-line);direction:rtl;font-family:var(--font-price,inherit);}
.dg-cn-new{color:var(--dg-ink);font-size:15px;font-weight:800;}
.dg-cn-unit{color:var(--dg-muted);font-size:11px;}
.dg-cn-nav{position:absolute;top:50%;transform:translateY(-50%);width:38px;height:38px;padding:0;border-radius:50%;background:#fff;color:var(--dg-ink-2);border:1px solid var(--dg-line);box-shadow:var(--dg-shadow);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:30;transition:all .2s ease;touch-action:manipulation;}
.dg-cn-nav:hover{background:var(--dg-primary);color:#fff;border-color:var(--dg-primary);}
.dg-cn-nav-left{left:2px;}
.dg-cn-nav-right{right:2px;}

@media (min-width:768px){
  .dg-cn-aside{flex-wrap:nowrap;}
  .dg-cn-title{font-size:18px;}
  /* Tablets got no arrows either (they were only enabled at 992px) */
  .dg-cn-nav{display:flex;}
}
@media (min-width:992px){
  .dg-cn-card{flex:0 0 calc(20% - 10px);max-width:calc(20% - 10px);}
  .dg-cn-nav{display:flex;}
}

/* ── Mobile: keep the panel header, card body and every price readable ── */
@media (max-width:767px){
  .dg-cn-wrap{padding:0 10px;}
  .dg-cn-panel{padding:8px 10px;border-radius:16px;}
  .dg-cn-aside{gap:8px;padding:2px 0 10px;}
  .dg-cn-title{font-size:14px;}
  .dg-cn-viewall{padding:7px 12px;font-size:11px;}
  .dg-cn-track{scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;}
  .dg-cn-card{scroll-snap-align:start;border-radius:12px;}
  .dg-cn-body{padding:8px 9px 12px;}
  .dg-cn-name{height:auto;min-height:34px;font-size:12px;line-height:1.5;}
  .dg-cn-price{margin-top:10px;gap:4px;}
  .dg-cn-new{font-size:14px;}
  .dg-cn-unit{font-size:10px;}
  .dg-cn-badge{font-size:10px;padding:2px 7px;top:6px;right:6px;}
  .dg-cn-oos{font-size:10px;padding:2px 7px;top:6px;right:6px;}
  .dg-cn-wish{width:26px;height:26px;top:6px;left:6px;}
  .dg-cn-cart{gap:4px;padding:9px 4px;font-size:11px;}
  /* Arrows: keep them on mobile (they were hidden here before) — 38px touch
     target, pulled to the very edge and translucent so they never hide a card. */
  .dg-cn-nav{display:flex;width:38px;height:38px;background:rgba(255,255,255,.92);opacity:.85;}
  .dg-cn-nav-left{left:-4px;}
  .dg-cn-nav-right{right:-4px;}
  .dg-cn-nav:active{opacity:1;}
}
@media (max-width:575px){
  /* Two cards per view instead of three so nothing is squeezed out */
  .dg-cn-card{flex:0 0 calc(50% - 6px);max-width:calc(50% - 6px);}
  /* Safety net: the cart label may shrink/ellipsis but never widen the card */
  .dg-cn-cart span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
}
`;

export default function CoinProducts() {
  const [items, setItems]       = useState<Product[]>([]);
  const [loaded, setLoaded]     = useState(false);
  const [settings, setSettings] = useState<Settings>({ gold_markup_percent: "5", gold_fixed_fee: "0" });
  const [liked, setLiked]       = useState<Set<string>>(new Set());
  const [addedId, setAddedId]   = useState<string | null>(null);
  const scrollRef               = useRef<HTMLDivElement>(null);
  const pausedRef               = useRef(false);
  /** Timestamp until which autoplay is frozen after a manual arrow press. */
  const manualHoldRef      = useRef(0);
  const { add } = useCart();

  useEffect(() => {
    fetch("/api/products?coin=true&limit=20").then(r => r.json()).then(d => {
      if (d.success) setItems(d.data.products);
      setLoaded(true);
    }).catch(() => setLoaded(true));
    fetch("/api/admin/settings").then(r => r.json()).then(d => { if (d.success) setSettings(d.data); }).catch(() => {});
  }, []);

  // Carousel autoplay — pauses while the pointer is over the row (same as ExpressShipping).
  useEffect(() => {
    if (!loaded || items.length === 0) return;
    const id = setInterval(() => {
      const el = scrollRef.current;
      if (!el || pausedRef.current) return;
      if (Date.now() < manualHoldRef.current) return;   // frozen by a manual arrow press

      const max = el.scrollWidth - el.clientWidth;
      if (max <= 4) return;                                   // everything already fits

      const card = el.firstElementChild as HTMLElement | null;
      const step = card ? card.offsetWidth + CARD_GAP : 280;
      const rtl  = getComputedStyle(el).direction === "rtl";
      // In RTL the track starts at scrollLeft 0 and goes negative as it advances.
      const travelled = rtl ? -el.scrollLeft : el.scrollLeft;

      if (travelled >= max - 4) el.scrollTo({ left: 0, behavior: "smooth" });   // loop to the start
      else el.scrollBy({ left: rtl ? -step : step, behavior: "smooth" });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [loaded, items.length]);

  function toggleLike(id: string) {
    setLiked(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
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
    // Freeze autoplay for 5s so the card the user just landed on stays put.
    manualHoldRef.current = Date.now() + MANUAL_PAUSE_MS;
    scrollRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  }

  if (!loaded || items.length === 0) return null;

  return (
    <section style={{ marginBottom: "32px" }}>
      <style>{CSS + CSS2}</style>
      <div className="dg-cn-wrap">
        <div className="dg-cn-panel">
          {/* Header row: title (start) · view-all (end of the left) */}
          <div className="dg-cn-aside">
            <h3 className="dg-cn-title">سکه و آبشده</h3>
            <div className="dg-cn-aside-btn">
              <Link href="/products?coin=true" className="dg-cn-viewall">مشاهده همه</Link>
            </div>
          </div>

          <div className="dg-cn-row">
            {/* Product carousel — full width */}
            <div className="dg-cn-main">
              <button type="button" className="dg-cn-nav dg-cn-nav-left" onClick={() => scroll("left")} aria-label="قبلی">
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="dg-cn-nav dg-cn-nav-right" onClick={() => scroll("right")} aria-label="بعدی">
                <ChevronRight size={18} />
              </button>

              <div className="dg-cn-track" ref={scrollRef}
                onMouseEnter={() => { pausedRef.current = true; }}
                onMouseLeave={() => { pausedRef.current = false; }}
                onTouchStart={() => { pausedRef.current = true; }}
                onTouchEnd={() => { pausedRef.current = false; }}>
                {items.map(p => {
                  const img          = getImg(p.images);
                  const { finalPrice } = calcFinalPrice(p, settings);
                  const isLiked      = liked.has(p.id);
                  const isAdded      = addedId === p.id;
                  const oos          = p.stock === 0;
                  const vid          = firstMedia(p.videos);

                  return (
                    <div key={p.id} className="dg-cn-card">
                      <div className="dg-cn-media">
                        {oos
                          ? <span className="dg-cn-oos">ناموجود</span>
                          : <span className="dg-cn-badge"><Coins size={11} /> سکه و آبشده</span>}

                        <Link href={`/products/${p.slug}`} style={{ display: "block", width: "100%", height: "100%" }}>
                          {img
                            ? <img className="dg-cn-img" src={img} alt={p.name} loading="lazy" />
                            : <div className="dg-cn-noimg">بدون تصویر</div>}
                        </Link>

                        {vid && <ProductVideoPreview src={vid} />}

                        <button type="button" className={`dg-cn-wish${isLiked ? " on" : ""}`}
                          aria-label="افزودن به لیست علاقه مندی" onClick={() => toggleLike(p.id)}>
                          <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                        </button>

                        <div className="dg-cn-actions">
                          <button type="button" className={`dg-cn-cart${isAdded ? " added" : ""}`}
                            disabled={oos || !img}
                            onClick={e => { if (img) handleAdd(p, img, e); }}>
                            {isAdded ? <Check size={14} /> : <ShoppingCart size={14} />}
                            <span>{isAdded ? "افزوده شد" : "افزودن به سبد خرید"}</span>
                          </button>
                        </div>
                      </div>

                      <div className="dg-cn-body">
                        <h6 className="dg-cn-name">
                          <Link href={`/products/${p.slug}`}>{p.name}</Link>
                        </h6>
                        <div className="dg-cn-price">
                          {finalPrice > 0 ? (
                            <>
                              <span className="dg-cn-new">{finalPrice.toLocaleString("fa-IR")}</span>
                              <span className="dg-cn-unit">تومان</span>
                            </>
                          ) : (
                            <span className="dg-cn-new" style={{ fontSize: "13px" }}>تماس بگیرید</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
