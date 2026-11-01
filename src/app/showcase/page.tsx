"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, Star } from "lucide-react";
import PageHero from "../components/PageHero";
import PageLayout from "../components/PageLayout";
import ProductVideoPreview from "../components/ProductVideoPreview";
import Link from "next/link";
import { firstMedia } from "@/lib/media";

interface Product {
  id: string; name: string; slug: string; price: number; weight: number;
  karat: number; stock: number; images: string; videos: string; category_name: string;
}

const showcases = [
  {
    id: "economic",
    title: "ویترین اقتصادی",
    desc: "طلاهای سبک و مقرون‌به‌صرفه، شروع از ۵۰۰ هزار تومان. مناسب برای هدیه و استفاده روزمره.",
    icon: "💎",
    badge: "اقتصادی",
    color: "#10b981",
    image: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80",
    maxPrice: 2000000,
  },
  {
    id: "student",
    title: "ویترین دانشجویی",
    desc: "طرح‌های شیک و مدرن با قیمت مناسب. انتخاب ایده‌آل برای نسل جوان و دانشجویان.",
    icon: "🎓",
    badge: "دانشجویی",
    color: "#3b82f6",
    image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80",
    maxPrice: 3000000,
  },
  {
    id: "special",
    title: "پیشنهاد ویژه",
    desc: "بهترین پیشنهادهای خانوم جون با تخفیف‌های اختصاصی. محدود و با کیفیت استثنایی.",
    icon: "🎁",
    badge: "ویژه",
    color: "#0f5c45",
    image: "https://images.unsplash.com/photo-1629134073875-6c8f6b2c7e71?w=800&q=80",
    maxPrice: 5000000,
  },
];

const goldImages = [
  "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80",
  "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80",
  "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80",
  "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80",
  "https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=400&q=80",
  "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=400&q=80",
];

export default function ShowcasePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("economic");

  useEffect(() => {
    fetch("/api/products?limit=50")
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.data.products); })
      .finally(() => setLoading(false));
  }, []);

  const activeShowcase = showcases.find(s => s.id === active)!;
  const filteredProducts = products.filter(p => p.price <= activeShowcase.maxPrice).slice(0, 6);

  return (
    <PageLayout>
      <PageHero eyebrow="SHOWCASE" title="ویترین‌ها" subtitle="مجموعه‌های ویژه برای هر بودجه و سلیقه" crumbs={[{ label: "ویترین‌ها" }]} />

      <div className="showcase-page-body" style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px 48px" }}>

        {/* Tab buttons */}
        <div className="sc-tabs">
          {showcases.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={`sc-tab${active === s.id ? " on" : ""}`} style={{ ["--sc" as string]: s.color }}>
              <span className="sc-tab-ic">{s.icon}</span>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: active === s.id ? s.color : "var(--dg-ink)", fontSize: 15, fontWeight: 700 }}>{s.title}</p>
                <p style={{ color: "var(--dg-muted)", fontSize: 11 }}>تا {(s.maxPrice / 1000000).toLocaleString("fa-IR")} میلیون</p>
              </div>
            </button>
          ))}
        </div>

        {/* Active showcase info */}
        <div className="showcase-info sc-info">
          <div className="sc-info-img" style={{ backgroundImage: `url(${activeShowcase.image})` }} />
          <div className="sc-info-text">
            <span style={{ fontSize: 34, display: "block", marginBottom: 6 }}>{activeShowcase.icon}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 900 }}>{activeShowcase.title}</h2>
              <span style={{ background: "var(--dg-grad-gold)", color: "#fff", fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>{activeShowcase.badge}</span>
            </div>
            <p style={{ color: "rgba(255,255,255,.75)", fontSize: 14, lineHeight: 1.9 }}>{activeShowcase.desc}</p>
          </div>
        </div>

        {/* Products */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h3 className="section-title" style={{ fontSize: 20 }}>محصولات این ویترین</h3>
          <Link href="/products" className="dg-head-link">مشاهده همه <ChevronLeft size={14} /></Link>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ backgroundColor: "var(--dg-surface)", borderRadius: 14, height: 260, opacity: 0.5, border: "1px solid var(--dg-line)" }} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--dg-muted)" }}>
            <p>محصولی در این ویترین موجود نیست</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {filteredProducts.map((p, i) => (
              <Link key={p.id} href={`/products/${p.slug}`} className="sc-card" style={{ textDecoration: "none" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = activeShowcase.color; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--dg-line)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
                <div style={{ paddingBottom: "100%", position: "relative", overflow: "hidden", borderRadius: 16 }}>
                  <img src={goldImages[i % goldImages.length]} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  {firstMedia(p.videos) && <ProductVideoPreview src={firstMedia(p.videos)!} />}
                </div>
                <div style={{ padding: 12 }}>
                  <p style={{ color: "var(--dg-ink)", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{p.name}</p>
                  <p style={{ color: "var(--dg-muted)", fontSize: 11, marginBottom: 6 }}>{p.karat} عیار · {p.weight} گرم</p>
                  <p style={{ color: "var(--dg-ink)", fontSize: 15, fontWeight: 900, borderTop: "1px dashed var(--dg-line)", paddingTop: 8 }}>
                    {p.price.toLocaleString("fa-IR")} <span style={{ color: "var(--dg-muted)", fontSize: 11, fontWeight: 400 }}>تومان</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Testimonials */}
        <div className="sc-reviews">
          <span style={{ display: "block", color: "var(--dg-gold)", fontSize: 11, fontWeight: 800, letterSpacing: 3, marginBottom: 6 }}>REVIEWS</span>
          <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 900, marginBottom: 22 }}>نظرات مشتریان</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="reviews-grid">
            {[
              { name: "سارا محمدی", text: "کیفیت طلاها فوق‌العاده‌ست. گردنبندم بعد از ۶ ماه هنوز مثل روز اول درخشنده.", stars: 5 },
              { name: "علی رضایی", text: "قیمت‌گذاری منصفانه و ارسال سریع. قطعاً دوباره خرید می‌کنم.", stars: 5 },
              { name: "مریم احمدی", text: "بسته‌بندی شیک و ارزان‌قیمت. هدیه‌ای که همه دوستم داشتن.", stars: 4 },
            ].map((r, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 22, padding: 22 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                  {Array.from({ length: r.stars }).map((_, s) => <Star key={s} size={14} fill="#c6a15b" color="#c6a15b" />)}
                </div>
                <p style={{ color: "rgba(255,255,255,.8)", fontSize: 13, lineHeight: 1.9, marginBottom: 14 }}>«{r.text}»</p>
                <p style={{ color: "var(--dg-gold)", fontSize: 12, fontWeight: 800 }}>{r.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .sc-tabs { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .sc-tab { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 22px; border: 1px solid var(--dg-line); background: #fff; cursor: pointer; font-family: inherit; transition: all .2s; text-align: right; }
        .sc-tab:hover { border-color: var(--sc); }
        .sc-tab-ic { width: 46px; height: 46px; border-radius: 15px; background: var(--dg-bg-2); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .sc-tab.on { border-color: var(--sc); box-shadow: 0 0 0 3px color-mix(in srgb, var(--sc) 18%, transparent), var(--dg-shadow-sm); }
        .sc-tab.on .sc-tab-ic { background: color-mix(in srgb, var(--sc) 16%, #fff); }
        .sc-info { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); border-radius: 28px; overflow: hidden; margin-bottom: 36px; background: radial-gradient(120% 160% at 100% 0%, #17765a 0%, var(--dg-primary) 45%, var(--dg-primary-deep) 100%); min-height: 220px; }
        .sc-info-img { order: 2; background-size: cover; background-position: center; min-height: 200px; }
        .sc-info-text { padding: 30px 32px; display: flex; flex-direction: column; justify-content: center; }
        .sc-card { display: block; background: #fff; border: 1px solid var(--dg-line); border-radius: 22px; padding: 7px; transition: transform .25s, box-shadow .25s, border-color .25s; }
        .sc-card:hover { transform: translateY(-4px); box-shadow: var(--dg-shadow); border-color: var(--dg-primary-line); }
        .sc-reviews { margin-top: 56px; background: var(--dg-ink); border-radius: 32px; padding: 34px; }
        @media (max-width: 768px) {
          .sc-info { grid-template-columns: 1fr; }
          .sc-info-img { order: 0; min-height: 160px; }
          .sc-info-text { padding: 22px; }
          .sc-reviews { padding: 22px; border-radius: 24px; }
          .reviews-grid { grid-template-columns: 1fr !important; }

          .showcase-page-body { padding: 26px 14px 36px !important; }
        }
      `}</style>
    </PageLayout>
  );
}
