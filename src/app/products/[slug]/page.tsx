"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, ShoppingCart, Check, ChevronLeft, ChevronRight, Shield, Truck,
  RotateCcw, Coins, Play, Minus, Plus, Star, CreditCard, Gift,
  Maximize2, X,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import { useCart, cartLineKey } from "../../components/CartContext";
import ProductVideoPreview from "../../components/ProductVideoPreview";
import { calcFinalPrice } from "@/lib/pricing";
import { parseMedia, firstMedia } from "@/lib/media";
import {
  parseVariants, parseSpecs, buildDefaultSpecs, karatLabel,
  type ProductVariant, type ProductSpec,
} from "@/lib/product-variants";
import {
  parseProductPageSettings, NO_POSTCARD_LABEL,
} from "@/lib/product-page-settings";

interface Product {
  id: string; name: string; slug: string; description: string | null;
  price: number; weight: number; karat: number; stock: number;
  images: string; videos: string; featured: number; published: number;
  express_shipping: number; low_wage: number; coin: number;
  variants: string; specs: string;
  category_name: string | null; category_slug: string | null;
  ajrat_override: number; ajrat_percent: number | null; ajrat_fixed: number | null;
  fixed_price?: number;
}
interface Settings {
  gold_markup_percent: string;
  gold_fixed_fee: string;
  gold_tax_percent?: string;
  /** «قیمت‌گذاری خودکار» master switch + the live 18k rate it uses. */
  live_pricing_enabled?: string;
  gold_live_rate?: string;
  product_page_json?: string;
}
interface Review { id: string; name: string; rating: number; body: string; createdAt: string; }
interface ReviewSummary { count: number; average: number; }
interface CardProduct {
  id: string; name: string; slug: string; price: number; weight: number;
  karat: number; stock: number; images: string; videos: string;
  ajrat_override: number; ajrat_percent: number | null; ajrat_fixed: number | null;
}

const fallbackImgs = [
  "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80",
  "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80",
  "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80",
  "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80",
];

/** Gallery images — falls back to the stock photos when the product has none. */
function imagesOf(raw: string): string[] {
  const list = parseMedia(raw);
  return list.length ? list : fallbackImgs;
}
function firstImgOf(raw: string, i = 0): string {
  return imagesOf(raw)[i % imagesOf(raw).length];
}
function fa(n: number) { return Math.round(n).toLocaleString("fa-IR"); }

/** Rating stars — halves are rounded to the nearest whole star. */
function Stars({ value, size = 13 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="pd-stars">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} color="var(--dg-primary)" fill={i <= full ? "#0f5c45" : "none"} />
      ))}
    </span>
  );
}

const CSS = `
.pd-wrap{max-width:1280px;margin:0 auto;padding:28px 16px 40px;}
.pd-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px;align-items:start;}
.pd-sticky{position:sticky;top:20px;}
.pd-gallery{display:flex;gap:12px;align-items:flex-start;}
.pd-thumbs{display:flex;flex-direction:column;gap:8px;max-height:520px;overflow-y:auto;flex-shrink:0;}
.pd-thumb{width:64px;height:64px;border-radius:12px;overflow:hidden;border:2px solid var(--dg-line);padding:0;background:none;cursor:pointer;position:relative;flex-shrink:0;transition:border-color .2s;}
.pd-thumb.on{border-color:var(--dg-primary);}
.pd-main{position:relative;flex:1;min-width:0;border:1px solid var(--dg-line);border-radius:16px;overflow:hidden;background:var(--dg-bg-2);aspect-ratio:1/1;}
.pd-main img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .25s ease;}
.pd-main.zoom img{transform:scale(1.8);}
.pd-badge{position:absolute;z-index:2;top:12px;right:12px;background:var(--dg-primary);color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;}
.pd-oos{position:absolute;inset:0;z-index:3;background:rgba(255,255,255,.82);display:flex;align-items:center;justify-content:center;}
.pd-oos span{color:#dc2626;font-size:16px;font-weight:700;border:1px solid rgba(220,38,38,.3);padding:8px 20px;border-radius:12px;background:#fff;}
.pd-fs-btn{position:absolute;z-index:4;top:12px;left:12px;width:34px;height:34px;border-radius:12px;border:none;background:rgba(255,255,255,.9);box-shadow:0 2px 8px rgba(0,0,0,.15);color:var(--dg-ink-2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;opacity:.9;}
.pd-fs-btn:hover{background:var(--dg-primary);color:#fff;opacity:1;}
.pd-fs{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.94);display:flex;align-items:center;justify-content:center;animation:pd-fs-in .18s ease;}
@keyframes pd-fs-in{from{opacity:0;}to{opacity:1;}}
.pd-fs-media{max-width:100vw;max-height:100vh;object-fit:contain;display:block;cursor:default;}
.pd-fs-close{position:absolute;top:16px;left:16px;width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.12);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s;}
.pd-fs-close:hover{background:rgba(255,255,255,.28);}
.pd-fs-nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:none;background:rgba(255,255,255,.12);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s;}
.pd-fs-nav:hover{background:rgba(255,255,255,.28);}
.pd-fs-nav.prev{right:16px;}
.pd-fs-nav.next{left:16px;}
.pd-fs-count{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,.75);font-size:13px;background:rgba(255,255,255,.1);padding:4px 14px;border-radius:20px;direction:ltr;}
.pd-cat{display:inline-flex;align-items:center;gap:4px;color:var(--dg-primary);font-size:12px;font-weight:600;text-decoration:none;margin-bottom:8px;}
.pd-title{color:var(--dg-ink);font-size:22px;font-weight:800;line-height:1.5;margin:0 0 8px;}
.pd-stars{display:inline-flex;align-items:center;gap:2px;}
.pd-review-link{color:var(--dg-muted);font-size:12px;text-decoration:none;}
.pd-review-link:hover{color:var(--dg-primary);}
.pd-meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--dg-muted);margin-bottom:16px;}
.pd-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:8px;font-weight:700;}
.pd-chip.in{color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;}
.pd-chip.out{color:#dc2626;background:#fef2f2;border:1px solid #fecaca;}
.pd-chip.exp{color:#0f766e;background:#f0fdfa;border:1px solid #99f6e4;}
.pd-opt{margin-bottom:14px;}
.pd-opt-label{display:flex;align-items:center;gap:6px;color:var(--dg-ink-2);font-size:12px;font-weight:700;margin-bottom:6px;}
.pd-free{color:#16a34a;font-size:10px;font-weight:700;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:1px 6px;}
.pd-select{width:100%;border:1px solid var(--dg-line);border-radius:12px;padding:9px 12px;font-size:13px;color:var(--dg-ink-2);background:#fff;font-family:inherit;outline:none;cursor:pointer;}
.pd-select:focus{border-color:var(--dg-primary);}
.pd-weights{display:flex;flex-wrap:wrap;gap:6px;}
.pd-weight{border:1px solid var(--dg-line);background:#fff;color:var(--dg-ink-2);font-size:12px;padding:6px 10px;border-radius:10px;cursor:pointer;font-family:inherit;transition:all .15s;}
.pd-weight:hover:not(:disabled){border-color:var(--dg-primary);color:var(--dg-primary);}
.pd-weight.on{background:var(--dg-primary);border-color:var(--dg-primary);color:#fff;font-weight:700;}
.pd-weight:disabled{opacity:.45;cursor:not-allowed;text-decoration:line-through;}
.pd-price{border:1px solid var(--dg-primary-line);background:var(--dg-primary-soft);border-radius:16px;padding:16px 20px;margin-bottom:16px;}
.pd-price-total{display:flex;align-items:baseline;gap:8px;}
.pd-price-num{color:var(--dg-primary);font-size:28px;font-weight:900;line-height:1;}
.pd-price-unit{color:var(--dg-faint);font-size:13px;}
.pd-price-rows{display:flex;flex-direction:column;gap:5px;border-top:1px solid var(--dg-primary-line);margin-top:10px;padding-top:10px;}
.pd-price-row{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--dg-muted);}
.pd-price-row b{color:var(--dg-muted);font-weight:600;}
.pd-formula{border:1px solid var(--dg-line);background:var(--dg-bg-2);border-radius:14px;padding:12px 14px;font-size:11.5px;color:var(--dg-muted);line-height:2;margin-bottom:16px;}
.pd-formula b{color:var(--dg-ink-2);}
.pd-qty-row{display:flex;gap:8px;align-items:stretch;margin-bottom:10px;}
.pd-qty{display:flex;align-items:center;gap:4px;border:1px solid var(--dg-line);border-radius:12px;padding:3px;}
.pd-qty button{width:30px;height:30px;border:none;background:var(--dg-bg-2);border-radius:10px;cursor:pointer;color:var(--dg-ink-2);display:flex;align-items:center;justify-content:center;}
.pd-qty button:disabled{opacity:.4;cursor:not-allowed;}
.pd-qty span{min-width:26px;text-align:center;font-size:14px;font-weight:700;color:var(--dg-ink-2);}
.pd-add{flex:1;border:none;border-radius:12px;padding:12px 20px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--dg-primary);color:#fff;transition:background-color .2s;}
.pd-add:hover:not(:disabled){background:#b08f22;}
.pd-add.added{background:#16a34a;}
.pd-add:disabled{background:var(--dg-line);cursor:not-allowed;color:#fff;}
.pd-wish{width:50px;border:1px solid var(--dg-line);border-radius:12px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--dg-faint);transition:all .2s;}
.pd-wish.on{border-color:var(--dg-primary);background:var(--dg-primary-soft);color:var(--dg-primary);}
.pd-buy{width:100%;background:#fff;color:var(--dg-primary);border:2px solid var(--dg-primary);border-radius:12px;padding:11px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;margin-bottom:16px;transition:all .2s;}
.pd-buy:hover{background:var(--dg-primary);color:#fff;}
.pd-incart{display:flex;align-items:center;gap:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:8px 14px;margin-bottom:12px;font-size:12px;color:#16a34a;}
.pd-trust{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px;}
.pd-trust-item{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;background:var(--dg-bg-2);border:1px solid var(--dg-line);border-radius:12px;text-align:center;}
.pd-trust-item p{color:var(--dg-ink-2);font-size:11px;font-weight:700;}
.pd-trust-item small{color:var(--dg-faint);font-size:10px;}
.pd-section{margin-top:56px;}
.pd-h2{color:var(--dg-ink);font-size:18px;font-weight:800;margin:0 0 18px;display:flex;align-items:center;gap:8px;}
.pd-table{width:100%;border-collapse:collapse;border:1px solid var(--dg-line);border-radius:16px;overflow:hidden;}
.pd-table th,.pd-table td{padding:11px 16px;font-size:12.5px;text-align:right;border-bottom:1px solid var(--dg-line);}
.pd-table tr:last-child th,.pd-table tr:last-child td{border-bottom:none;}
.pd-table th{width:220px;color:var(--dg-muted);font-weight:600;background:var(--dg-bg-2);}
.pd-table td{color:var(--dg-ink-2);}
.pd-desc{color:var(--dg-muted);font-size:13px;line-height:2;}
.pd-summary{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:var(--dg-bg-2);border:1px solid var(--dg-line);border-radius:16px;padding:14px 18px;margin-bottom:16px;}
.pd-summary strong{color:var(--dg-primary);font-size:22px;font-weight:900;}
.pd-summary span{color:var(--dg-muted);font-size:12px;}
.pd-review{border:1px solid var(--dg-line);border-radius:14px;padding:14px 16px;margin-bottom:10px;}
.pd-review header{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.pd-review header p{color:var(--dg-ink-2);font-size:12.5px;font-weight:700;}
.pd-review header aside{color:var(--dg-faint);font-size:11px;margin-right:auto;}
.pd-review>p{color:var(--dg-muted);font-size:12.5px;line-height:1.9;}
.pd-form{border:1px solid var(--dg-line);border-radius:16px;padding:16px;background:var(--dg-bg-2);}
.pd-textarea{width:100%;border:1px solid var(--dg-line);border-radius:12px;padding:10px 12px;font-size:13px;font-family:inherit;color:var(--dg-ink-2);outline:none;resize:vertical;min-height:90px;background:#fff;}
.pd-textarea:focus{border-color:var(--dg-primary);}
.pd-pick{display:flex;align-items:center;gap:4px;margin-bottom:10px;}
.pd-pick button{background:none;border:none;padding:0;cursor:pointer;display:flex;}
.pd-muted{color:var(--dg-muted);font-size:12px;line-height:1.9;}
.pd-faq-item{border:1px solid var(--dg-line);border-radius:14px;margin-bottom:8px;overflow:hidden;background:#fff;}
.pd-faq-q{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 16px;background:none;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;color:var(--dg-ink-2);text-align:right;}
.pd-faq-a{padding:0 16px 14px;color:var(--dg-muted);font-size:12.5px;line-height:1.9;}
.pd-rail-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;}
.pd-rail-nav{display:flex;gap:6px;}
.pd-rail-nav button{width:30px;height:30px;border-radius:50%;border:1px solid var(--dg-line);background:#fff;color:var(--dg-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;}
.pd-rail-nav button:hover{background:var(--dg-primary);color:#fff;border-color:var(--dg-primary);}
.pd-carousel{display:flex;gap:12px;overflow-x:auto;scroll-behavior:smooth;padding:2px;scrollbar-width:none;-ms-overflow-style:none;}
.pd-carousel::-webkit-scrollbar{display:none;}
.pd-card{flex:0 0 calc(25% - 9px);max-width:calc(25% - 9px);background:#fff;border:1px solid var(--dg-line);border-radius:14px;overflow:hidden;text-decoration:none;transition:box-shadow .2s,transform .2s,border-color .2s;}
.pd-card:hover{border-color:var(--dg-primary);transform:translateY(-3px);box-shadow:0 6px 18px rgba(0,0,0,.08);}
.pd-card-media{position:relative;padding-bottom:100%;background:var(--dg-bg-2);}
.pd-card-media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.pd-card-body{padding:12px;}
.pd-card-body h4{color:var(--dg-ink-2);font-size:12px;font-weight:600;line-height:1.5;margin:0 0 4px;height:36px;overflow:hidden;}
.pd-card-body small{color:var(--dg-faint);font-size:10px;display:block;margin-bottom:5px;}
.pd-card-body strong{color:var(--dg-primary);font-size:13px;font-weight:800;}
.pd-card-body strong span{color:var(--dg-faint);font-size:10px;font-weight:400;}
.pd-card-oos{position:absolute;top:8px;right:8px;z-index:2;background:var(--dg-faint);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:3px;}
.pd-bar{position:fixed;left:0;right:0;bottom:0;z-index:60;background:#fff;border-top:1px solid var(--dg-line);box-shadow:0 -4px 20px rgba(0,0,0,.08);transform:translateY(110%);transition:transform .25s ease;}
.pd-bar.show{transform:translateY(0);}
.pd-bar-inner{max-width:1280px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:14px;}
.pd-bar-thumb{width:46px;height:46px;border-radius:12px;object-fit:cover;border:1px solid var(--dg-line);flex-shrink:0;}
.pd-bar-name{color:var(--dg-ink-2);font-size:13px;font-weight:600;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pd-bar-price{color:var(--dg-primary);font-size:15px;font-weight:800;}
.pd-bar-btn{background:var(--dg-primary);color:#fff;border:none;border-radius:12px;padding:10px 22px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:6px;flex-shrink:0;}
.pd-bar-btn:disabled{background:var(--dg-line);cursor:not-allowed;}
@media (max-width:900px){.pd-card{flex:0 0 calc(40% - 8px);max-width:calc(40% - 8px);}}
@media (max-width:768px){
  .pd-wrap{padding:20px 12px 32px;}
  .pd-grid{grid-template-columns:1fr;gap:20px;}
  .pd-sticky{position:static;}
  .pd-gallery{flex-direction:column-reverse;}
  .pd-thumbs{flex-direction:row;max-height:none;width:100%;overflow-x:auto;overflow-y:hidden;padding-bottom:2px;}
  .pd-main.zoom img{transform:none;}
  .pd-trust{grid-template-columns:repeat(2,1fr);}
  .pd-table th{width:110px;padding:9px 10px;}
  .pd-table td{padding:9px 10px;}
  .pd-card{flex:0 0 calc(62% - 6px);max-width:calc(62% - 6px);}
  .pd-h2{font-size:16px;}
  .pd-qty-row{flex-wrap:wrap;}
  .pd-bar-inner{gap:10px;padding:8px 12px;}
  .pd-bar-thumb{width:38px;height:38px;}
  .pd-bar-name{font-size:12px;}
  .pd-bar-price{font-size:13px;}
  .pd-bar-btn{padding:9px 14px;font-size:12px;}
  .pd-fs-nav{width:38px;height:38px;}
  .pd-fs-nav.prev{right:8px;}
  .pd-fs-nav.next{left:8px;}
  .pd-fs-close{top:10px;left:10px;width:36px;height:36px;}
}
@media (max-width:480px){
  .pd-title{font-size:18px;}
  .pd-card{flex:0 0 calc(72% - 6px);max-width:calc(72% - 6px);}
  .pd-price-num{font-size:24px;}
  .pd-qty{flex:1;}
  .pd-add{padding:12px 10px;font-size:13px;}
  .pd-bar-name{display:none;}
  .pd-bar-btn{flex:1;justify-content:center;}
  .pd-review header{flex-wrap:wrap;row-gap:4px;}
}
/* ── Redesign layer ── */
.pd-wrap{padding:24px 16px 48px;}
.pd-grid{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:28px;}
.pd-sticky{top:150px;}
.pd-gallery{flex-direction:column;gap:12px;background:#fff;border:1px solid var(--dg-line);border-radius:28px;padding:14px;box-shadow:var(--dg-shadow-sm);}
.pd-thumbs{flex-direction:row;max-height:none;width:100%;overflow-x:auto;overflow-y:hidden;order:2;}
.pd-thumb{width:72px;height:72px;border-radius:16px;}
.pd-thumb.on{border-color:var(--dg-gold);box-shadow:0 0 0 3px var(--dg-gold-soft);}
.pd-main{width:100%;border:none;border-radius:20px;background:radial-gradient(circle at 50% 40%,#fff 0%,var(--dg-bg-2) 100%);}
.pd-badge{background:var(--dg-grad-gold);border-radius:999px;}
.pd-sticky + div{background:#fff;border:1px solid var(--dg-line);border-radius:28px;padding:28px;box-shadow:var(--dg-shadow-sm);}
.pd-cat{background:var(--dg-gold-soft);color:var(--dg-gold-deep);padding:5px 12px;border-radius:999px;margin-bottom:12px;}
.pd-title{font-size:26px;line-height:1.45;}
.pd-chip{border-radius:999px;padding:4px 11px;}
.pd-weight{border-radius:12px;padding:8px 14px;}
.pd-weight.on{background:var(--dg-ink);border-color:var(--dg-ink);}
.pd-price{background:radial-gradient(120% 140% at 100% 0%,#17765a 0%,var(--dg-primary) 45%,var(--dg-primary-deep) 100%);border:none;border-radius:22px;padding:20px 22px;}
.pd-price-num{background:var(--dg-grad-gold);-webkit-background-clip:text;background-clip:text;color:transparent;font-size:32px;}
.pd-price-unit{color:rgba(255,255,255,.6);}
.pd-price-rows{border-top:1px solid rgba(255,255,255,.15);}
.pd-price-row{color:rgba(255,255,255,.65);}
.pd-price-row b{color:#fff;}
.pd-formula{background:var(--dg-gold-soft);border-color:#eadfc8;border-radius:16px;}
.pd-qty{border-radius:14px;}
.pd-add{border-radius:14px;padding:14px 20px;background:var(--dg-ink);}
.pd-add:hover:not(:disabled){background:var(--dg-primary-deep);}
.pd-wish{border-radius:14px;}
.pd-wish.on{border-color:#fecdd3;background:#fff1f2;color:#e11d48;}
.pd-buy{border-radius:14px;border:none;background:var(--dg-grad-gold);color:#fff;padding:13px;}
.pd-buy:hover{background:var(--dg-grad-gold);color:#fff;filter:brightness(1.05);}
.pd-trust-item{background:#fff;border-radius:16px;}
.pd-section{margin-top:28px;background:#fff;border:1px solid var(--dg-line);border-radius:28px;padding:26px 28px;box-shadow:var(--dg-shadow-sm);}
.pd-h2{font-size:19px;}
.pd-h2::before{content:"";width:10px;height:10px;background:var(--dg-grad-gold);transform:rotate(45deg);border-radius:2px;box-shadow:0 0 0 4px var(--dg-gold-soft);flex-shrink:0;}
.pd-table{border-radius:18px;}
.pd-card{border-radius:18px;padding:7px;}
.pd-card:hover{border-color:var(--dg-primary-line);box-shadow:var(--dg-shadow);}
.pd-card-media{border-radius:13px;overflow:hidden;background:radial-gradient(circle at 50% 40%,#fff 0%,var(--dg-bg-2) 100%);}
.pd-card-body strong{color:var(--dg-ink);}
.pd-card-oos{border-radius:999px;}
.pd-rail-nav button{width:38px;height:38px;color:var(--dg-ink-2);}
.pd-bar{left:12px;right:12px;bottom:12px;border:1px solid var(--dg-line);border-radius:20px;box-shadow:var(--dg-shadow-lg);transform:translateY(140%);}
.pd-bar-btn{background:var(--dg-ink);}
@media (max-width:768px){
  .pd-sticky + div{padding:18px;border-radius:22px;}
  .pd-gallery{border-radius:22px;padding:10px;}
  .pd-section{padding:18px;border-radius:22px;}
  .pd-title{font-size:20px;}
}
/* ── Redesign layer 2: stage + swapped columns ── */
.pd-grid{position:relative;padding:28px;border-radius:34px;background:linear-gradient(155deg,var(--dg-primary-soft) 0%,#f3f1e8 55%,var(--dg-gold-soft) 100%);border:1px solid var(--dg-line);overflow:clip;}
.pd-grid::before{content:"";position:absolute;right:-90px;top:-90px;width:260px;height:260px;border-radius:50%;border:2px solid rgba(198,161,91,.3);pointer-events:none;}
.pd-grid > .pd-sticky{order:2;}
.pd-gallery{box-shadow:var(--dg-shadow);}
.pd-sticky + div{box-shadow:var(--dg-shadow);}
.pd-title{font-size:28px;font-weight:900;}
.pd-trust{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}
.pd-duo{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px;align-items:start;}
.pd-duo .pd-section{margin-top:28px;}
.pd-section{border-radius:26px;}
.pd-h2{padding-bottom:14px;margin-bottom:18px;border-bottom:1px dashed var(--dg-line-strong);}
@media (max-width:900px){
  .pd-grid{padding:12px;border-radius:24px;}
  .pd-grid > .pd-sticky{order:0;}
  .pd-duo{grid-template-columns:1fr;gap:0;}
}
/* ── Redesign layer 3: dark stage + tabs ── */
.pd-grid{background:radial-gradient(120% 120% at 100% 0%,#17765a 0%,var(--dg-primary-deep) 45%,var(--dg-ink) 100%);border:none;}
.pd-grid::before{border-color:rgba(198,161,91,.35);}
.pd-grid::after{content:"";position:absolute;left:-60px;bottom:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(198,161,91,.25),transparent 70%);pointer-events:none;}
.pd-gallery,.pd-sticky + div{position:relative;z-index:1;border:none;}
.pd-wrap [hidden]{display:none !important;}
.pd-tabs{position:sticky;top:128px;z-index:20;display:flex;gap:6px;margin-top:28px;padding:6px;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border:1px solid var(--dg-line);border-radius:20px;box-shadow:var(--dg-shadow-sm);overflow-x:auto;scrollbar-width:none;}
.pd-tabs button{flex:1;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;border:none;background:transparent;border-radius:14px;font-family:inherit;font-size:14px;font-weight:700;color:var(--dg-muted);cursor:pointer;transition:all .2s;}
.pd-tabs button span{font-size:11px;background:var(--dg-bg-2);color:var(--dg-ink-2);padding:2px 8px;border-radius:999px;}
.pd-tabs button.on{background:var(--dg-ink);color:#fff;}
.pd-tabs button.on span{background:var(--dg-grad-gold);color:#fff;}
.pd-tabs + .pd-duo .pd-section,.pd-tabs ~ .pd-section{margin-top:14px;}
@media (max-width:900px){
  .pd-tabs{top:68px;border-radius:16px;}
  .pd-tabs button{flex:0 0 auto;font-size:13px;padding:10px 14px;}
  .pd-bar{bottom:96px;}
}
`;
/** Horizontal product rail — used for «محصولات مرتبط» and «محصولاتی که شاید بپسندید». */
function Rail({ title, href, items, settings }: {
  title: string; href: string; items: CardProduct[]; settings: Settings;
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (items.length === 0) return null;
  return (
    <section className="pd-section">
      <div className="pd-rail-head">
        <h2 className="pd-h2" style={{ margin: 0 }}>{title}</h2>
        <div className="pd-rail-nav">
          <Link href={href} className="pd-review-link" style={{ alignSelf: "center", marginLeft: 6, fontWeight: 600 }}>
            مشاهده همه
          </Link>
          <button type="button" aria-label="قبلی"
            onClick={() => ref.current?.scrollBy({ left: 320, behavior: "smooth" })}>
            <ChevronRight size={16} />
          </button>
          <button type="button" aria-label="بعدی"
            onClick={() => ref.current?.scrollBy({ left: -320, behavior: "smooth" })}>
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>
      <div className="pd-carousel" ref={ref}>
        {items.map(p => {
          const fp  = calcFinalPrice(p, settings).finalPrice;
          const vid = firstMedia(p.videos);
          return (
            <Link key={p.id} href={`/products/${p.slug}`} className="pd-card">
              <div className="pd-card-media">
                {p.stock === 0 && <span className="pd-card-oos">ناموجود</span>}
                <img src={firstImgOf(p.images)} alt={p.name} loading="lazy" />
                {vid && <ProductVideoPreview src={vid} />}
              </div>
              <div className="pd-card-body">
                <h4>{p.name}</h4>
                <small>{p.karat} عیار · {p.weight} گرم</small>
                <strong>{fa(fp)} <span>تومان</span></strong>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { add, update, items } = useCart();

  const [product, setProduct]     = useState<Product | null>(null);
  const [settings, setSettings]   = useState<Settings>({ gold_markup_percent: "5", gold_fixed_fee: "0" });
  const [loading, setLoading]     = useState(true);
  const [liked, setLiked]         = useState(false);
  const [added, setAdded]         = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [related, setRelated]     = useState<CardProduct[]>([]);
  const [alsoLike, setAlsoLike]   = useState<CardProduct[]>([]);
  const [qty, setQty]             = useState(1);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [giftPack, setGiftPack]   = useState("");
  const [postcard, setPostcard]   = useState(NO_POSTCARD_LABEL);
  const [zoom, setZoom]           = useState({ active: false, x: 50, y: 50 });
  const [fsOpen, setFsOpen]       = useState(false);
  const [openFaq, setOpenFaq]     = useState<number | null>(0);
  const [reviews, setReviews]     = useState<Review[]>([]);
  const [summary, setSummary]     = useState<ReviewSummary>({ count: 0, average: 0 });
  const [myRating, setMyRating]   = useState(5);
  const [myReview, setMyReview]   = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [sending, setSending]     = useState(false);
  const [loggedIn, setLoggedIn]   = useState(false);
  const [dayRate, setDayRate]     = useState(0);
  const [showBar, setShowBar]     = useState(false);
  const [pdTab, setPdTab]         = useState<"specs" | "reviews" | "faq">("specs");
  const buyRef = useRef<HTMLDivElement>(null);

  // Store settings (اجرت/سود/مالیات + product-page JSON) and auth state.
  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json())
      .then(d => { if (d.success) setSettings(d.data); }).catch(() => {});
    fetch("/api/auth/me").then(r => r.json())
      .then(d => setLoggedIn(!!d.success)).catch(() => {});
  }, []);

  // Today's gold rate — on mount and every 60s, so the figure the shopper reads
  // keeps tracking the market while the page stays open (the poller refreshes the
  // server cache every 5 minutes).
  const fetchDayRate = useCallback(() => {
    fetch("/api/admin/gold-price", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d.success && d.data.price > 0) setDayRate(d.data.price); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchDayRate();
    const id = setInterval(fetchDayRate, 60_000);
    return () => clearInterval(id);
  }, [fetchDayRate]);

  // Product, its approved reviews and the two product rails.
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/products/${slug}`).then(r => r.json()).then(d => {
      if (!d.success || !d.data) return;
      const p = d.data as Product;
      setProduct(p);
      setVariantId(parseVariants(p.variants)[0]?.id ?? null);

      fetch(`/api/products/${p.slug}/reviews`).then(r => r.json())
        .then(rd => { if (rd.success) { setReviews(rd.data.reviews); setSummary(rd.data.summary); } })
        .catch(() => {});

      const catQuery = p.category_slug ? `category=${p.category_slug}&` : "";
      fetch(`/api/products?${catQuery}limit=12`).then(r => r.json())
        .then(rd => {
          if (!rd.success) return;
          setRelated((rd.data.products as CardProduct[]).filter(x => x.slug !== p.slug).slice(0, 8));
        }).catch(() => {});

      fetch("/api/products?featured=true&limit=12").then(r => r.json())
        .then(rd => {
          if (!rd.success) return;
          setAlsoLike((rd.data.products as CardProduct[]).filter(x => x.slug !== p.slug).slice(0, 8));
        }).catch(() => {});
    }).finally(() => setLoading(false));
  }, [slug]);

  // Sticky buy bar — appears once the buy column scrolls out of view.
  useEffect(() => {
    const el = buyRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(entries => setShowBar(!entries[0].isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, [product]);

  const pps      = useMemo(() => parseProductPageSettings(settings.product_page_json), [settings.product_page_json]);
  const variants = useMemo(() => (product ? parseVariants(product.variants) : []), [product]);
  const selectedVariant: ProductVariant | null = variants.find(v => v.id === variantId) ?? variants[0] ?? null;
  const weight         = selectedVariant ? selectedVariant.weight : product?.weight ?? 0;
  const basePrice      = selectedVariant ? selectedVariant.price : product?.price ?? 0;
  const availableStock = selectedVariant ? selectedVariant.stock : product?.stock ?? 0;

  const pricing = useMemo(() => calcFinalPrice({
    price: basePrice,
    weight,
    // Live pricing derives the base from the live rate × weight × (karat/18);
    // a product marked «قیمت ثابت» keeps its stored base (see lib/pricing.ts).
    karat: product?.karat ?? 18,
    fixed_price: product?.fixed_price ?? 0,
    ajrat_override: product?.ajrat_override ?? 0,
    ajrat_percent: product?.ajrat_percent ?? null,
    ajrat_fixed: product?.ajrat_fixed ?? null,
  }, settings), [basePrice, weight, product, settings]);

  const specs = useMemo<ProductSpec[]>(() => {
    if (!product) return [];
    const custom = parseSpecs(product.specs);
    return custom.length
      ? custom
      : buildDefaultSpecs({
          karat: product.karat,
          weight,
          categoryName: product.category_name,
          packaging: pps.packaging,
        });
  }, [product, weight, pps.packaging]);

  const images = useMemo(() => (product ? imagesOf(product.images) : []), [product]);
  const media  = useMemo(() => (product ? [
    ...parseMedia(product.videos).map(src => ({ type: "video" as const, src })),
    ...images.map(src => ({ type: "image" as const, src })),
  ] : []), [product, images]);

  // Fullscreen lightbox — Esc closes, arrow keys navigate (RTL: left = next),
  // and the page behind is scroll-locked while it's open.
  useEffect(() => {
    if (!fsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFsOpen(false);
      else if (media.length > 1 && e.key === "ArrowLeft") setActiveImg(i => (i + 1) % media.length);
      else if (media.length > 1 && e.key === "ArrowRight") setActiveImg(i => (i - 1 + media.length) % media.length);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fsOpen, media.length]);

  const lineKey   = product ? cartLineKey({ productId: product.id, variantWeight: selectedVariant?.weight }) : "";
  const inCartQty = items.find(i => cartLineKey(i) === lineKey)?.quantity ?? 0;
  const oos       = availableStock === 0;
  const isMaxed   = inCartQty >= availableStock;
  const perGram   = weight > 0 ? Math.round(pricing.finalPrice / weight) : 0;
  // Per-gram value of the base the price was ACTUALLY built from (live or stored).
  // Deriving this from the stored `basePrice` made the breakdown disagree with the
  // total once live pricing was on.
  const goldGram  = weight > 0 ? Math.round(pricing.basePrice / weight) : 0;
  const productKarat = product?.karat ?? 18;
  const packName  = giftPack || pps.packs[0];

  const handleAdd = useCallback(() => {
    if (!product || oos) return;
    const payload = {
      productId: product.id,
      name: product.name,
      price: pricing.finalPrice,
      weight,
      karat: product.karat,
      image: images[0],
      stock: availableStock,
      variantWeight: selectedVariant ? selectedVariant.weight : undefined,
      giftPack: packName || undefined,
      postcard: postcard && postcard !== NO_POSTCARD_LABEL ? postcard : undefined,
    };
    add(payload);
    if (qty > 1) update(cartLineKey(payload), inCartQty + qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }, [product, oos, pricing.finalPrice, weight, images, availableStock, selectedVariant, packName, postcard, add, qty, update, inCartQty]);

  async function submitReview() {
    if (!product || sending) return;
    setSending(true); setReviewMsg("");
    try {
      const res = await fetch(`/api/products/${product.slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: myRating, body: myReview }),
      });
      const d = await res.json();
      if (d.success) {
        setMyReview("");
        setReviewMsg("دیدگاه شما ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.");
      } else {
        setReviewMsg(d.error || "خطا در ثبت دیدگاه");
      }
    } catch {
      setReviewMsg("خطای شبکه. دوباره تلاش کنید");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <div style={{ color: "var(--dg-primary)", fontSize: 14 }}>در حال بارگذاری...</div>
        </div>
      </PageLayout>
    );
  }

  if (!product) {
    return (
      <PageLayout>
        <div style={{ textAlign: "center", padding: "80px 16px" }}>
          <p style={{ color: "var(--dg-muted)", fontSize: 16, marginBottom: 12 }}>محصول یافت نشد</p>
          <Link href="/products" style={{ color: "var(--dg-primary)", textDecoration: "none", fontSize: 14 }}>← بازگشت به محصولات</Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <style>{CSS}</style>

      {/* Breadcrumb */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 0" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--dg-muted)", flexWrap: "wrap", background: "#fff", border: "1px solid var(--dg-line)", borderRadius: 999, padding: "8px 16px" }}>
          <Link href="/" style={{ color: "var(--dg-muted)", textDecoration: "none" }}>خانه</Link>
          <span style={{ color: "var(--dg-gold)", fontSize: 8 }}>◆</span>
          <Link href="/products" style={{ color: "var(--dg-muted)", textDecoration: "none" }}>محصولات</Link>
          {product.category_name && (
            <>
              <span style={{ color: "var(--dg-gold)", fontSize: 8 }}>◆</span>
              <Link href={`/products?category=${product.category_slug}`} style={{ color: "var(--dg-muted)", textDecoration: "none" }}>{product.category_name}</Link>
            </>
          )}
          <span style={{ color: "var(--dg-gold)", fontSize: 8 }}>◆</span>
          <span style={{ color: "var(--dg-ink)", fontWeight: 700 }}>{product.name}</span>
        </div>
      </div>

      <div className="pd-wrap">
        <div className="pd-grid">

          {/* ── Gallery (sticky on desktop) ── */}
          <div className="pd-sticky">
            <div className="pd-gallery">
              {media.length > 1 && (
                <div className="pd-thumbs">
                  {media.map((m, i) => (
                    <button key={i} type="button" aria-label={`تصویر ${i + 1}`}
                      className={`pd-thumb${activeImg === i ? " on" : ""}`}
                      onClick={() => setActiveImg(i)}>
                      {m.type === "video" ? (
                        <>
                          <video src={m.src} muted playsInline preload="metadata"
                            style={{ width: "100%", height: "100%", objectFit: "cover", backgroundColor: "#000" }} />
                          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)", color: "#fff" }}>
                            <Play size={16} fill="#fff" />
                          </span>
                        </>
                      ) : (
                        <img src={m.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div
                className={`pd-main${zoom.active && media[activeImg]?.type === "image" ? " zoom" : ""}`}
                onMouseEnter={() => setZoom(z => ({ ...z, active: true }))}
                onMouseLeave={() => setZoom(z => ({ ...z, active: false }))}
                onMouseMove={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setZoom({
                    active: true,
                    x: ((e.clientX - r.left) / r.width) * 100,
                    y: ((e.clientY - r.top) / r.height) * 100,
                  });
                }}>
                {media[activeImg]?.type === "video" ? (
                  <video key={media[activeImg].src} src={media[activeImg].src} controls autoPlay playsInline
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", backgroundColor: "#000" }} />
                ) : media[activeImg] ? (
                  <img src={media[activeImg].src} alt={product.name}
                    style={{ transformOrigin: `${zoom.x}% ${zoom.y}%` }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dg-line-strong)" }}>
                    <Coins size={34} />
                  </div>
                )}
                {media[activeImg]?.type === "image" && (
                  <button type="button" className="pd-fs-btn" title="نمایش تمام‌صفحه" aria-label="نمایش تمام‌صفحه"
                    onClick={() => setFsOpen(true)}>
                    <Maximize2 size={15} />
                  </button>
                )}
                {product.featured === 1 && <span className="pd-badge">ویژه</span>}
                {oos && <div className="pd-oos"><span>ناموجود</span></div>}
              </div>
            </div>
          </div>

          {/* ── Buy column ── */}
          <div ref={buyRef}>
            {product.category_name && (
              <Link href={`/products?category=${product.category_slug}`} className="pd-cat">
                <ChevronLeft size={12} /> {product.category_name}
              </Link>
            )}

            <h1 className="pd-title">{product.name}</h1>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <Stars value={summary.average || 5} />
              <a href="#pd-reviews" className="pd-review-link" onClick={() => setPdTab("reviews")}>
                ({fa(summary.count)} دیدگاه)
              </a>
            </div>

            <div className="pd-meta">
              <span>کد محصول: {product.id.slice(0, 8).toUpperCase()}</span>
              <span aria-hidden>·</span>
              <span>{karatLabel(product.karat)}</span>
              <span aria-hidden>·</span>
              <span>{weight} گرم</span>
              {!oos && <span className="pd-chip in"><Check size={11} /> موجود در انبار</span>}
              {product.express_shipping === 1 && !oos && <span className="pd-chip exp">ارسال فوری</span>}
            </div>

            {/* Weight variants — price and stock follow the picked weight */}
            {variants.length > 0 && (
              <div className="pd-opt">
                <p className="pd-opt-label">وزن :</p>
                <div className="pd-weights">
                  {variants.map(v => (
                    <button key={v.id} type="button"
                      className={`pd-weight${selectedVariant?.id === v.id ? " on" : ""}`}
                      disabled={v.stock === 0}
                      onClick={() => { setVariantId(v.id); setQty(1); }}>
                      {v.weight} گرم
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Free gift options — like the reference shop’s pre-purchase selects */}
            {pps.packs.length > 0 && (
              <div className="pd-opt">
                <p className="pd-opt-label">بسته بندی <span className="pd-free">رایگان</span></p>
                <select className="pd-select" value={giftPack || pps.packs[0]}
                  onChange={e => setGiftPack(e.target.value)}>
                  {pps.packs.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            {pps.postcards.length > 0 && (
              <div className="pd-opt">
                <p className="pd-opt-label">هدیه کارت پستال <span className="pd-free">رایگان</span></p>
                <select className="pd-select" value={postcard}
                  onChange={e => setPostcard(e.target.value)}>
                  <option value={NO_POSTCARD_LABEL}>{NO_POSTCARD_LABEL}</option>
                  {pps.postcards.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {/* Price block — full breakdown */}
            <div className="pd-price">
              <div className="pd-price-total">
                <span className="pd-price-num">{fa(pricing.finalPrice)}</span>
                <span className="pd-price-unit">تومان</span>
              </div>
              <div className="pd-price-rows">
                <div className="pd-price-row">
                  <span>
                    {pricing.isLive
                      ? `ارزش طلا (${weight} گرم${goldGram > 0 ? ` × ${fa(goldGram)}` : ""})`
                      : `قیمت پایه  (${weight} گرم)`}
                  </span>
                  <b>{fa(pricing.basePrice)} تومان</b>
                </div>
                <div className="pd-price-row">
                  <span>اجرت و سود ({pricing.markupPct}%{pricing.fixedFee > 0 ? ` + ${fa(pricing.fixedFee)} ت/گرم` : ""})</span>
                  <b>+{fa(pricing.ajrat)} تومان</b>
                </div>
                {pricing.taxPct > 0 && (
                  <div className="pd-price-row">
                    <span>مالیات ({pricing.taxPct}%)</span>
                    <b>+{fa(pricing.tax)} تومان</b>
                  </div>
                )}
                <div className="pd-price-row">
                  <span>قیمت هر گرم (با اجرت و سود)</span>
                  <b>{fa(perGram)} تومان</b>
                </div>
              </div>
            </div>

            {/* How the price is calculated. The market rate is ALWAYS shown and is
                the LIVE, self-refreshing figure; the price rows above show what this
                product actually sells for. */}
            <div className="pd-formula">
              <b>نحوه محاسبه قیمت</b><br />
              فرمول : (نرخ طلای روز + اجرت + سود + مالیات) × وزن
              {dayRate > 0 && (
                <>
                  <br />
                  نرخ روز طلای ۱۸ عیار: <b>{fa(dayRate)}</b> تومان
                  {productKarat !== 18 && (
                    <>
                      <br />
                      معادل {fa(productKarat)} عیار: <b>{fa(Math.round(dayRate * (productKarat / 18)))}</b> تومان / گرم
                    </>
                  )}
                </>
              )}
              {pricing.isLive ? (
                <>
                  <br />
                  <span className="pd-muted">این محصول از نرخ لحظه‌ای بالا قیمت‌گذاری می‌شود و با تغییر بازار به‌روز می‌شود.</span>
                </>
              ) : pricing.isLocked ? (
                <>
                  <br />
                  <span className="pd-muted">این محصول «قیمت ثابت» است و از نرخ روز طلا پیروی نمی‌کند.</span>
                </>
              ) : (
                <>
                  <br />
                  <span className="pd-muted">قیمت این محصول از قیمت پایه ذخیره‌شده محاسبه شده و با نرخ لحظه‌ای بالا تغییر نمی‌کند.</span>
                </>
              )}
              <br />
              <span className="pd-muted">
                مالیات تنها بر روی سود و اجرت محاسبه می‌شود
                {pricing.taxPct === 0 ? " (در حال حاضر مالیات اعمال نمی‌شود)" : ""}.
              </span>
            </div>

            {inCartQty > 0 && (
              <div className="pd-incart">
                <Check size={14} />
                {fa(inCartQty)} عدد در سبد خرید شما
                <Link href="/cart" style={{ color: "var(--dg-primary)", marginRight: "auto", fontSize: 11, fontWeight: 700 }}>مشاهده سبد ←</Link>
              </div>
            )}

            {/* Quantity + add to cart */}
            <div className="pd-qty-row">
              <div className="pd-qty">
                <button type="button" aria-label="کاهش"
                  disabled={qty <= 1} onClick={() => setQty(q => Math.max(1, q - 1))}>
                  <Minus size={13} />
                </button>
                <span>{fa(qty)}</span>
                <button type="button" aria-label="افزایش"
                  disabled={qty >= availableStock} onClick={() => setQty(q => Math.min(availableStock, q + 1))}>
                  <Plus size={13} />
                </button>
              </div>

              <button type="button" className={`pd-add${added ? " added" : ""}`}
                disabled={oos || isMaxed}
                onClick={handleAdd}>
                {added ? <><Check size={16} /> افزوده شد!</>
                  : oos ? "ناموجود"
                  : <><ShoppingCart size={16} /> افزودن به سبد خرید</>}
              </button>

              <button type="button" aria-label="افزودن به علاقه‌مندی"
                className={`pd-wish${liked ? " on" : ""}`}
                onClick={() => setLiked(l => !l)}>
                <Heart size={18} fill={liked ? "#0f5c45" : "none"} />
              </button>
            </div>

            {isMaxed && !oos && (
              <p className="pd-muted" style={{ marginBottom: 10 }}>حداکثر موجودی این وزن در سبد شما است.</p>
            )}

            {!oos && (
              <button type="button" className="pd-buy"
                onClick={() => { handleAdd(); router.push("/cart"); }}>
                خرید این محصول
              </button>
            )}

            {/* Trust strip */}
            <div className="pd-trust">
              {[
                { icon: <RotateCcw size={18} color="var(--dg-primary)" />, title: "بازگشت کالا", sub: "تا ۱۴ روز" },
                { icon: <Truck size={18} color="var(--dg-primary)" />, title: "ارسال کالا", sub: "به سراسر ایران" },
                { icon: <CreditCard size={18} color="var(--dg-primary)" />, title: "خرید اقساطی", sub: "بدون سود و کارمزد" },
                { icon: <Gift size={18} color="var(--dg-primary)" />, title: "بسته بندی", sub: "کادویی و رایگان" },
              ].map((b, i) => (
                <div key={i} className="pd-trust-item">
                  {b.icon}
                  <p>{b.title}</p>
                  <small>{b.sub}</small>
                </div>
              ))}
            </div>

            <p className="pd-muted" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <Shield size={13} color="var(--dg-primary)" /> همراه با فاکتور معتبر و ضمانت اصالت کالا
            </p>
          </div>
        </div>

        {/* ── Detail tabs ── */}
        <div className="pd-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={pdTab === "specs"} className={pdTab === "specs" ? "on" : ""} onClick={() => setPdTab("specs")}>مشخصات و توضیحات</button>
          <button type="button" role="tab" aria-selected={pdTab === "reviews"} className={pdTab === "reviews" ? "on" : ""} onClick={() => setPdTab("reviews")}>
            دیدگاه‌ها <span>{summary.count.toLocaleString("fa-IR")}</span>
          </button>
          {pps.faq.length > 0 && (
            <button type="button" role="tab" aria-selected={pdTab === "faq"} className={pdTab === "faq" ? "on" : ""} onClick={() => setPdTab("faq")}>سوالات متداول</button>
          )}
        </div>

        <div className="pd-duo" hidden={pdTab !== "specs"}>
        {/* ── «خصوصیات محصولات طلا» ── */}
        <section className="pd-section">
          <h2 className="pd-h2"><Coins size={18} color="var(--dg-primary)" /> خصوصیات محصولات طلا</h2>
          <div className="pd-table-wrap">
            <table className="pd-table">
              <tbody>
                {specs.map(s => (
                  <tr key={s.label}>
                    <th>{s.label}</th>
                    <td>{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Description ── */}
        {product.description && (
          <section className="pd-section">
            <h2 className="pd-h2">مشخصات {product.name}</h2>
            <p className="pd-desc">{product.description}</p>
          </section>
        )}

        </div>

        {/* ── «دیدگاه‌ها» ── */}
        <section className="pd-section" id="pd-reviews" hidden={pdTab !== "reviews"}>
          <h2 className="pd-h2">دیدگاه‌ها</h2>

          <div className="pd-summary">
            <Stars value={summary.average || 5} size={16} />
            <strong>{summary.average ? `${summary.average} از ۵` : "بدون امتیاز"}</strong>
            <span>({fa(summary.count)} دیدگاه ثبت‌شده)</span>
          </div>

          {reviews.length === 0 ? (
            <p className="pd-muted" style={{ marginBottom: 16 }}>
              هنوز دیدگاهی برای این محصول ثبت نشده است — اولین نفر باشید!
            </p>
          ) : (
            reviews.map(r => (
              <div key={r.id} className="pd-review">
                <header>
                  <p>{r.name}</p>
                  <Stars value={r.rating} size={12} />
                  <aside>{new Date(r.createdAt).toLocaleDateString("fa-IR")}</aside>
                </header>
                <p>{r.body}</p>
              </div>
            ))
          )}

          <div className="pd-form">
            <p className="pd-opt-label" style={{ marginBottom: 10 }}>ثبت دیدگاه</p>
            {!loggedIn ? (
              <p className="pd-muted">
                برای ثبت دیدگاه ابتدا{" "}
                <Link href={`/login?redirect=/products/${product.slug}`} style={{ color: "var(--dg-primary)", fontWeight: 700 }}>وارد شوید</Link>
                {" "}یا{" "}
                <Link href={`/login?tab=register&redirect=/products/${product.slug}`} style={{ color: "var(--dg-primary)", fontWeight: 700 }}>ثبت‌نام کنید</Link>.
              </p>
            ) : (
              <>
                <div className="pd-pick">
                  <span className="pd-muted" style={{ marginLeft: 6 }}>امتیاز شما:</span>
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} type="button" aria-label={`${i} ستاره`} onClick={() => setMyRating(i)}>
                      <Star size={20} color="var(--dg-primary)" fill={i <= myRating ? "#0f5c45" : "none"} />
                    </button>
                  ))}
                </div>
                <textarea className="pd-textarea" value={myReview} placeholder="تجربه خود از این محصول را بنویسید..."
                  onChange={e => setMyReview(e.target.value)} />
                {reviewMsg && <p className="pd-muted" style={{ marginTop: 8 }}>{reviewMsg}</p>}
                <button type="button" className="pd-bar-btn" disabled={sending}
                  style={{ marginTop: 10, borderRadius: 12, padding: "10px 24px" }}
                  onClick={submitReview}>
                  {sending ? "در حال ارسال..." : "ثبت دیدگاه"}
                </button>
              </>
            )}
          </div>
        </section>

        {/* ── «سوالات متداول» ── */}
        {pps.faq.length > 0 && (
          <section className="pd-section" hidden={pdTab !== "faq"}>
            <h2 className="pd-h2">سوالات متداول</h2>
            {pps.faq.map((item, i) => (
              <div key={i} className="pd-faq-item">
                <button type="button" className="pd-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{item.q}</span>
                  <ChevronLeft size={16} style={{ transform: openFaq === i ? "rotate(-90deg)" : "none", transition: "transform .2s" }} />
                </button>
                {openFaq === i && <p className="pd-faq-a">{item.a}</p>}
              </div>
            ))}
          </section>
        )}

        {/* ── «محصولات مرتبط» + «محصولاتی که شاید بپسندید» ── */}
        <Rail
          title="محصولات مرتبط"
          href={product.category_slug ? `/products?category=${product.category_slug}` : "/products"}
          items={related}
          settings={settings}
        />
        <Rail title="محصولاتی که شاید بپسندید" href="/products" items={alsoLike} settings={settings} />
      </div>

      {/* ── Sticky buy bar — shows once the buy column scrolls out of view ── */}
      <div className={`pd-bar${showBar && !oos ? " show" : ""}`}>
        <div className="pd-bar-inner">
          <img className="pd-bar-thumb" src={images[0]} alt="" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="pd-bar-name">{product.name}</p>
            <span className="pd-bar-price">{fa(pricing.finalPrice)} تومان</span>
          </div>
          <button type="button" className="pd-bar-btn" disabled={isMaxed} onClick={handleAdd}>
            {added
              ? <><Check size={15} /> افزوده شد</>
              : <><ShoppingCart size={15} /> افزودن به سبد خرید</>}
          </button>
        </div>
      </div>
      {/* ── Fullscreen lightbox for the gallery image ── */}
      {fsOpen && media[activeImg] && (
        <div className="pd-fs" onClick={() => setFsOpen(false)} role="dialog" aria-modal="true" aria-label="نمایش تمام‌صفحه">
          <button type="button" className="pd-fs-close" title="بستن" aria-label="بستن"
            onClick={() => setFsOpen(false)}>
            <X size={20} />
          </button>
          {media.length > 1 && (
            <>
              <button type="button" className="pd-fs-nav prev" title="قبلی" aria-label="قبلی"
                onClick={e => { e.stopPropagation(); setActiveImg(i => (i - 1 + media.length) % media.length); }}>
                <ChevronRight size={22} />
              </button>
              <button type="button" className="pd-fs-nav next" title="بعدی" aria-label="بعدی"
                onClick={e => { e.stopPropagation(); setActiveImg(i => (i + 1) % media.length); }}>
                <ChevronLeft size={22} />
              </button>
            </>
          )}
          {media[activeImg].type === "video" ? (
            <video key={media[activeImg].src} src={media[activeImg].src} controls autoPlay playsInline
              className="pd-fs-media" style={{ backgroundColor: "#000", cursor: "default" }}
              onClick={e => e.stopPropagation()} />
          ) : (
            <img src={media[activeImg].src} alt={product.name} className="pd-fs-media"
              onClick={e => e.stopPropagation()} />
          )}
          {media.length > 1 && (
            <span className="pd-fs-count">{activeImg + 1} / {media.length}</span>
          )}
        </div>
      )}
    </PageLayout>
  );
}
