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
interface Offer { id: string; discount_percent: number; sort_order: number; active: number; product_id: string; }
interface OfferWithProduct extends Offer, Product {}
interface Settings { gold_markup_percent: string; gold_fixed_fee: string; }

function getImg(images: string): string | null {
  try { const a = JSON.parse(images); if (a[0]) return a[0]; } catch {}
  return null;
}

/** Deadline used when the admin has not set one: end of the current day (local time). */
function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  return d.getTime();
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Carousel autoplay interval. younesgold uses 1000ms; 3000ms is far more readable. */
const AUTOPLAY_MS = 3000;
/** Must match the `gap` on `.dg-so-track`. */
const CARD_GAP = 12;

/** After a manual arrow press, autoplay stays frozen this long so the user can read the card. */
const MANUAL_PAUSE_MS = 5000;

/**
 * Styles mirror younesgold.com's «پیشنهاد شگفت انگیز» block 1:1 —
 * `.special-container` (gold gradient panel), the `.countdown` box/colon markup,
 * `.product-label.label-top` (red % badge), `.product-7` buttons and `.product-price`.
 */
const CSS = `
.dg-so-wrap{max-width:1280px;margin:0 auto;padding:0 16px;}
.dg-so-panel{border-radius:24px;background:radial-gradient(120% 140% at 100% 0%,#17765a 0%,#0f5c45 45%,#0a3d2e 100%);padding:18px;box-shadow:var(--dg-shadow);}
.dg-so-row{display:flex;flex-wrap:wrap;align-items:stretch;}
.dg-so-aside{flex:0 0 100%;max-width:100%;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;padding:4px 0 12px;}
.dg-so-title,.dg-so-aside-cd,.dg-so-aside-btn{flex:0 0 33.3333%;max-width:33.3333%;display:flex;align-items:center;justify-content:center;margin:0;}
.dg-so-title{color:#fff;font-size:15px;font-weight:800;line-height:1.7;text-align:center;}
.dg-so-countdown{display:flex;gap:5px;justify-content:center;align-items:center;direction:rtl;}
.dg-so-box{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);color:#fff;font-weight:800;font-size:20px;width:46px;height:46px;display:flex;justify-content:center;align-items:center;border-radius:16px;font-variant-numeric:tabular-nums;}
.dg-so-colon{color:var(--dg-gold);font-weight:800;font-size:22px;}
.dg-so-viewall{background:#fff;color:var(--dg-primary);display:inline-block;border-radius:999px;padding:9px 20px;font-size:12px;font-weight:800;text-decoration:none;white-space:nowrap;transition:all .25s ease;}
.dg-so-viewall:hover{background:var(--dg-gold);color:#fff;}

/* ── Carousel ── */
.dg-so-main{flex:0 0 100%;max-width:100%;min-width:0;position:relative;}
.dg-so-track{display:flex;gap:12px;overflow-x:auto;scroll-behavior:smooth;scrollbar-width:none;-ms-overflow-style:none;padding:4px 2px;}
.dg-so-track::-webkit-scrollbar{display:none;}
.dg-so-card{flex:0 0 calc(33.3333% - 8px);max-width:calc(33.3333% - 8px);background:#fff;border:1px solid var(--dg-line);padding:7px;display:flex;flex-direction:column;text-align:center;overflow:hidden;border-radius:18px;transition:transform .25s ease,box-shadow .25s ease;}
.dg-so-media{position:relative;display:block;background:radial-gradient(circle at 50% 40%,#fff 0%,var(--dg-bg-2) 100%);aspect-ratio:1/1;overflow:hidden;border-radius:13px;}
.dg-so-img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .4s ease;}
.dg-so-media:hover .dg-so-img{transform:scale(1.06);}
.dg-so-card:hover{transform:translateY(-3px);box-shadow:var(--dg-shadow);}
.dg-so-badge{position:absolute;z-index:2;top:8px;right:8px;color:#fff;background:#e11d48;font-size:11px;font-weight:800;padding:3px 10px;display:flex;align-items:center;gap:4px;border-radius:999px;direction:ltr;}
.dg-so-oos{position:absolute;z-index:2;top:8px;right:8px;color:var(--dg-muted);background:var(--dg-bg-2);border:1px solid var(--dg-line);font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;}
.dg-so-noimg{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--dg-muted);font-size:11px;}
.dg-so-wish{position:absolute;z-index:10;top:8px;left:8px;width:32px;height:32px;padding:0;border-radius:50%;background:rgba(255,255,255,.94);color:var(--dg-muted);border:1px solid var(--dg-line);cursor:pointer;display:flex;align-items:center;justify-content:center;visibility:hidden;opacity:0;transform:translateX(15px);transition:all .3s ease;}
.dg-so-media:hover .dg-so-wish{visibility:visible;opacity:1;transform:translateX(0);}
.dg-so-wish:hover{color:#e11d48;border-color:#fecdd3;background:#fff;}
.dg-so-wish.on{visibility:visible;opacity:1;transform:translateX(0);color:#e11d48;border-color:#fecdd3;}
.dg-so-actions{position:absolute;z-index:10;left:8px;right:8px;bottom:8px;opacity:0;visibility:hidden;transform:translateY(12px);transition:all .3s ease;}
.dg-so-media:hover .dg-so-actions,.dg-so-media:focus-within .dg-so-actions{opacity:1;visibility:visible;transform:translateY(0);}
@media (hover:none){
  .dg-so-actions{opacity:1;visibility:visible;transform:none;}
  .dg-so-wish{visibility:visible;opacity:1;transform:none;}
}
.dg-so-cart{direction:rtl;width:100%;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 4px;background:var(--dg-primary);color:#fff;border:none;border-radius:11px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:all .25s ease;box-shadow:0 6px 16px rgba(15,92,69,.25);}
.dg-so-cart:hover:not(:disabled){background:var(--dg-primary-deep);color:#fff;}
.dg-so-cart:disabled{background:var(--dg-bg-2);color:var(--dg-faint);box-shadow:none;cursor:not-allowed;}
.dg-so-cart.added,.dg-so-cart.added:disabled{background:#16a34a;color:#fff;}
.dg-so-body{background:#fff;padding:10px 6px 6px;display:flex;flex-direction:column;flex:1;}
.dg-so-name{height:42px;margin:0;font-size:13px;font-weight:600;line-height:1.6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-family:var(--font-product,inherit);}
.dg-so-name a{color:var(--dg-ink);text-decoration:none;}
.dg-so-name a:hover{color:var(--dg-primary);}
.dg-so-price{display:flex;align-items:baseline;justify-content:center;flex-wrap:wrap;gap:6px;margin:12px 0 0;padding-top:10px;border-top:1px dashed var(--dg-line);direction:rtl;font-family:var(--font-price,inherit);}
.dg-so-old{color:var(--dg-faint);font-size:12px;text-decoration:line-through;}
.dg-so-new{color:var(--dg-ink);font-size:15px;font-weight:800;}
.dg-so-unit{color:var(--dg-muted);font-size:11px;}
.dg-so-nav{position:absolute;top:50%;transform:translateY(-50%);width:38px;height:38px;padding:0;border-radius:50%;background:#fff;color:var(--dg-ink-2);border:1px solid var(--dg-line);box-shadow:var(--dg-shadow);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:30;transition:all .2s ease;touch-action:manipulation;}
.dg-so-nav:hover{background:var(--dg-primary);color:#fff;border-color:var(--dg-primary);}
.dg-so-nav-left{left:2px;}
.dg-so-nav-right{right:2px;}

@media (min-width:768px){
  .dg-so-row{flex-wrap:nowrap;}
  .dg-so-aside{flex:0 0 16.6667%;max-width:16.6667%;flex-direction:column;flex-wrap:nowrap;align-items:stretch;justify-content:center;gap:0;padding:0 6px;}
  .dg-so-title,.dg-so-aside-cd,.dg-so-aside-btn{flex:0 0 auto;max-width:100%;}
  .dg-so-title{font-size:18px;line-height:40px;margin-bottom:14px;}
  .dg-so-aside-cd{margin-bottom:16px;}
  .dg-so-main{flex:1 1 0;min-width:0;max-width:none;}
  /* Tablets got no arrows either (they were only enabled at 992px) */
  .dg-so-nav{display:flex;}
}
@media (min-width:992px){
  .dg-so-card{flex:0 0 calc(20% - 10px);max-width:calc(20% - 10px);}
  .dg-so-nav{display:flex;}
}

/* ── Mobile: keep the panel header, card body and every price readable ── */
@media (max-width:767px){
  .dg-so-wrap{padding:0 10px;}
  .dg-so-panel{padding:8px 10px;border-radius:16px;}
  .dg-so-aside{gap:8px;padding:2px 0 10px;}
  .dg-so-title{font-size:14px;}
  .dg-so-countdown{gap:3px;}
  .dg-so-box{width:34px;height:34px;font-size:15px;border-radius:8px;}
  .dg-so-colon{font-size:16px;}
  .dg-so-viewall{padding:7px 12px;font-size:11px;}
  .dg-so-track{scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;}
  .dg-so-card{scroll-snap-align:start;border-radius:12px;}
  .dg-so-body{padding:8px 9px 12px;}
  .dg-so-name{height:auto;min-height:34px;font-size:12px;line-height:1.5;}
  .dg-so-price{margin-top:10px;gap:4px;}
  .dg-so-new{font-size:14px;}
  .dg-so-old{font-size:11px;padding:2px 5px;}
  .dg-so-unit{font-size:10px;}
  .dg-so-badge{font-size:12px;padding:2px 7px;min-width:0;top:6px;right:6px;}
  .dg-so-oos{font-size:10px;padding:2px 7px;top:6px;right:6px;}
  .dg-so-wish{width:26px;height:26px;top:6px;left:6px;}
  .dg-so-cart{gap:4px;padding:9px 4px;font-size:11px;}
  /* Arrows: keep them on mobile (they were hidden here before) — 38px touch
     target, pulled to the very edge and translucent so they never hide a card. */
  .dg-so-nav{display:flex;width:38px;height:38px;background:rgba(255,255,255,.92);opacity:.85;}
  .dg-so-nav-left{left:-4px;}
  .dg-so-nav-right{right:-4px;}
  .dg-so-nav:active{opacity:1;}
}
@media (max-width:575px){
  /* Title on its own line, countdown + «مشاهده همه» centered below it */
  .dg-so-title{flex:0 0 100%;max-width:100%;font-size:15px;}
  .dg-so-aside-cd{flex:0 1 auto;max-width:none;}
  .dg-so-aside-btn{flex:0 0 auto;max-width:none;}
  /* Two cards per view instead of three so nothing is squeezed out */
  .dg-so-card{flex:0 0 calc(50% - 6px);max-width:calc(50% - 6px);}
  /* Safety net: the cart label may shrink/ellipsis but never widen the card */
  .dg-so-cart span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
}
`;
export default function SpecialOffers() {
  const [offers, setOffers]     = useState<OfferWithProduct[]>([]);
  const [enabled, setEnabled]   = useState(false);
  const [title, setTitle]       = useState("پیشنهاد شگفت انگیز");
  const [viewAll, setViewAll]   = useState("/products");
  const [endAt, setEndAt]       = useState("");
  const [settings, setSettings] = useState<Settings>({ gold_markup_percent: "5", gold_fixed_fee: "0" });
  const [liked, setLiked]       = useState<Set<string>>(new Set());
  const [addedId, setAddedId]   = useState<string | null>(null);
  const [time, setTime]         = useState({ h: "00", m: "00", s: "00" });
  const [expired, setExpired]   = useState(false);
  const scrollRef               = useRef<HTMLDivElement>(null);
  const pausedRef               = useRef(false);
  /** Timestamp until which autoplay is frozen after a manual arrow press. */
  const manualHoldRef      = useRef(0);
  const { add } = useCart();

  useEffect(() => {
    fetch("/api/special-offers").then(r => r.json()).then(d => {
      if (!d.success || !d.data.enabled) return;
      setOffers(d.data.offers);
      setTitle(d.data.title);
      setViewAll(d.data.view_all_href);
      setEndAt(d.data.end_at || "");
      setEnabled(true);
    }).catch(() => {});
    fetch("/api/admin/settings").then(r => r.json()).then(d => { if (d.success) setSettings(d.data); }).catch(() => {});
  }, []);

  // Countdown — same behaviour as younesgold: hours : minutes : seconds, rolling every 24h
  useEffect(() => {
    if (!enabled) return;
    const target = endAt ? new Date(endAt).getTime() : endOfToday();
    if (Number.isNaN(target)) return;
    setExpired(false);
    const tick = () => {
      const distance = target - Date.now();
      if (distance < 0) { setExpired(true); return; }
      setTime({
        h: pad2(Math.floor((distance % 86400000) / 3600000)),
        m: pad2(Math.floor((distance % 3600000) / 60000)),
        s: pad2(Math.floor((distance % 60000) / 1000)),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled, endAt]);

  // Carousel autoplay (younesgold autoplays it) — pauses while the pointer is over the row.
  useEffect(() => {
    if (!enabled || offers.length === 0) return;
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
  }, [enabled, offers.length]);

  function toggleLike(id: string) {
    setLiked(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function handleAdd(p: OfferWithProduct, img: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (p.stock === 0) return;
    const { finalPrice } = calcFinalPrice(p, settings);
    const discounted = Math.round(finalPrice * (1 - p.discount_percent / 100));
    add({ productId: p.id, name: p.name, price: discounted, weight: p.weight, karat: p.karat, image: img, stock: p.stock });
    setAddedId(p.id);
    setTimeout(() => setAddedId(cur => cur === p.id ? null : cur), 1800);
  }

  function scroll(dir: "left" | "right") {
    // Freeze autoplay for 5s so the card the user just landed on stays put.
    manualHoldRef.current = Date.now() + MANUAL_PAUSE_MS;
    scrollRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  }

  if (!enabled || offers.length === 0) return null;

  return (
    <section style={{ marginBottom: "32px" }}>
      <style>{CSS}</style>
      <div className="dg-so-wrap">
        <div className="dg-so-panel">
          <div className="dg-so-row">

            {/* Gold panel side column: title + countdown + view-all */}
            <div className="dg-so-aside">
              <h3 className="dg-so-title">{title}</h3>
              <div className="dg-so-aside-cd">
                <div className="dg-so-countdown">
                  {expired ? (
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>پایان یافت</span>
                  ) : (
                    <>
                      <div className="dg-so-box">{time.s}</div>
                      <div className="dg-so-colon">:</div>
                      <div className="dg-so-box">{time.m}</div>
                      <div className="dg-so-colon">:</div>
                      <div className="dg-so-box">{time.h}</div>
                    </>
                  )}
                </div>
              </div>
              <div className="dg-so-aside-btn">
                <Link href={viewAll} className="dg-so-viewall">مشاهده همه</Link>
              </div>
            </div>

            {/* Product carousel */}
            <div className="dg-so-main">
              <button type="button" className="dg-so-nav dg-so-nav-left" onClick={() => scroll("left")} aria-label="قبلی">
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="dg-so-nav dg-so-nav-right" onClick={() => scroll("right")} aria-label="بعدی">
                <ChevronRight size={18} />
              </button>

              <div className="dg-so-track" ref={scrollRef}
                onMouseEnter={() => { pausedRef.current = true; }}
                onMouseLeave={() => { pausedRef.current = false; }}
                onTouchStart={() => { pausedRef.current = true; }}
                onTouchEnd={() => { pausedRef.current = false; }}>
                {offers.map(p => {
                  const img         = getImg(p.images);
                  const { finalPrice } = calcFinalPrice(p, settings);
                  const original    = finalPrice;
                  const discounted  = Math.round(finalPrice * (1 - p.discount_percent / 100));
                  const hasDiscount = p.discount_percent > 0 && discounted > 0;
                  const isLiked     = liked.has(p.id);
                  const isAdded     = addedId === p.id;
                  const oos         = p.stock === 0;
                  const vid         = firstMedia(p.videos);

                  return (
                    <div key={p.id} className="dg-so-card">
                      <div className="dg-so-media">
                        {oos
                          ? <span className="dg-so-oos">ناموجود</span>
                          : hasDiscount
                            ? <span className="dg-so-badge">{p.discount_percent}%</span>
                            : null}

                        <Link href={`/products/${p.slug}`} style={{ display: "block", width: "100%", height: "100%" }}>
                          {img
                            ? <img className="dg-so-img" src={img} alt={p.name} loading="lazy" />
                            : <div className="dg-so-noimg">بدون تصویر</div>}
                        </Link>

                        {vid && <ProductVideoPreview src={vid} />}

                        <button type="button" className={`dg-so-wish${isLiked ? " on" : ""}`}
                          aria-label="افزودن به لیست علاقه مندی" onClick={() => toggleLike(p.id)}>
                          <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                        </button>

                        <div className="dg-so-actions">
                          <button type="button" className={`dg-so-cart${isAdded ? " added" : ""}`}
                            disabled={oos || !img}
                            onClick={e => { if (img) handleAdd(p, img, e); }}>
                            {isAdded ? <Check size={14} /> : <ShoppingCart size={14} />}
                            <span>{isAdded ? "افزوده شد" : "افزودن به سبد خرید"}</span>
                          </button>
                        </div>
                      </div>

                      <div className="dg-so-body">
                        <h6 className="dg-so-name">
                          <Link href={`/products/${p.slug}`}>{p.name}</Link>
                        </h6>
                        <div className="dg-so-price">
                          {hasDiscount && <del className="dg-so-old">{original.toLocaleString("fa-IR")}</del>}
                          {discounted > 0 ? (
                            <>
                              <span className="dg-so-new">{discounted.toLocaleString("fa-IR")}</span>
                              <span className="dg-so-unit">تومان</span>
                            </>
                          ) : (
                            <span className="dg-so-new" style={{ fontSize: "13px" }}>تماس بگیرید</span>
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

