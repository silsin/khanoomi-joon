"use client";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import PageHero from "../components/PageHero";
import PageLayout from "../components/PageLayout";
import Link from "next/link";

interface Category { id: string; name: string; slug: string; description: string | null; product_count: number; }

const collectionImages: Record<string, string> = {
  necklaces: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=700&q=80",
  rings: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=700&q=80",
  bracelets: "https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=700&q=80",
  earrings: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=700&q=80",
};
const fallbacks = [
  "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=700&q=80",
  "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=700&q=80",
  "https://images.unsplash.com/photo-1629134073875-6c8f6b2c7e71?w=700&q=80",
  "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=700&q=80",
];

const highlights = [
  { title: "کالکشن مینیمال", desc: "طرح‌های ساده و زیبا برای روزهای خاص", image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&q=80" },
  { title: "کالکشن کلاسیک", desc: "طلاهایی با طراحی کلاسیک و ماندگار", image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=900&q=80" },
  { title: "کالکشن روزمره", desc: "سبک و راحت برای استفاده روزانه", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=900&q=80" },
];

export default function CollectionsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <PageHero eyebrow="COLLECTIONS" title="کالکشن‌ها" subtitle="مجموعه‌ای از بهترین طلاها برای هر سلیقه" crumbs={[{ label: "کالکشن‌ها" }]} />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 16px" }} className="collections-body">

        {/* Featured collections row */}
        <h2 className="section-title" style={{ fontSize: 22, marginBottom: 20 }}>کالکشن‌های ویژه</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 56 }} className="highlights-grid">
          {highlights.map((h, i) => (
            <Link
              key={i}
              href="/products"
              className="highlight-card"
              >
              <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${h.image})`, backgroundSize: "cover", backgroundPosition: "center", transition: "transform .6s" }} className="hl-img" />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,35,29,0.9) 0%, rgba(10,35,29,0) 65%)" }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, left: 0, padding: 20 }}>
                <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 900, marginBottom: 4 }}>{h.title}</h3>
                <p style={{ color: "rgba(255,255,255,.7)", fontSize: 12, marginBottom: 12 }}>{h.desc}</p>
                <span style={{ color: "#fff", background: "var(--dg-grad-gold)", padding: "7px 14px", borderRadius: 999, fontWeight: 800, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>مشاهده <ChevronLeft size={12} /></span>
              </div>
            </Link>
          ))}
        </div>

        {/* Categories */}
        <h2 className="section-title" style={{ fontSize: 22, marginBottom: 20 }}>دسته‌بندی محصولات</h2>
        {loading ? (
          <div className="cat-skeleton-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ backgroundColor: "var(--dg-surface)", borderRadius: 16, height: 320, border: "1px solid var(--dg-line)", opacity: 0.4 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
            {categories.map((cat, i) => {
              const img = collectionImages[cat.slug] || fallbacks[i % fallbacks.length];
              return (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  className="collection-card"
                  >
                  <div className="cc-media">
                    <img src={img} alt={cat.name} />
                    <span className="cc-count">{cat.product_count} محصول</span>
                  </div>
                  <div className="cc-body">
                    <h3 className="collection-card-title">{cat.name}</h3>
                    {cat.description && <p>{cat.description}</p>}
                    <span className="cc-go">مشاهده کالکشن <ChevronLeft size={14} /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .collections-body { padding: 32px 16px 48px; }
        .highlight-card { display: block; position: relative; overflow: hidden; height: 260px; border-radius: 28px; text-decoration: none; }
        .highlights-grid { grid-template-columns: 1.4fr 1fr 1fr !important; }
        .highlight-card:hover .hl-img { transform: scale(1.06); }
        .collection-card { display: flex !important; flex-direction: column; background: #fff; border: 1px solid var(--dg-line); border-radius: 26px; padding: 8px; text-decoration: none; transition: transform .25s, box-shadow .25s, border-color .25s; }
        .collection-card:hover { transform: translateY(-4px); box-shadow: var(--dg-shadow); border-color: var(--dg-primary-line); }
        .cc-media { position: relative; height: 220px; border-radius: 20px; overflow: hidden; }
        .cc-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s; }
        .collection-card:hover .cc-media img { transform: scale(1.06); }
        .cc-count { position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,.9); color: var(--dg-primary-deep); font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 999px; }
        .cc-body { padding: 14px 10px 8px; }
        .cc-body h3 { color: var(--dg-ink); font-size: 18px; font-weight: 900; margin: 0 0 4px; }
        .cc-body p { color: var(--dg-muted); font-size: 12px; margin: 0; }
        .cc-go { margin-top: 12px; display: inline-flex; align-items: center; gap: 4px; color: var(--dg-primary); font-size: 13px; font-weight: 700; }
        @media (max-width: 768px) {
          .collections-body { padding: 28px 14px 40px !important; }
          .highlights-grid { grid-template-columns: 1fr !important; }
          .highlight-card { height: 200px !important; }
          .collection-card-title { font-size: 18px !important; }
          .cat-skeleton-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .highlight-card { height: 180px !important; }
          .cat-skeleton-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </PageLayout>
  );
}
