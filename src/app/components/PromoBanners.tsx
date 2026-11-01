"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Zap } from "lucide-react";

interface Banner {
  id: string;
  title: string; sub: string; href: string; image: string;
  theme: "dark" | "light";
}

export default function PromoBanners() {
  const [banners, setBanners] = useState<Banner[] | null>(null);

  useEffect(() => {
    fetch("/api/promo-banners").then(r => r.json()).then(d => {
      if (d.success) setBanners(d.data);
    }).catch(() => setBanners([]));
  }, []);

  // Before fetch resolves render nothing (avoids flashing hardcoded defaults);
  // if no banner is active the whole section hides itself.
  if (!banners || banners.length === 0) return null;

  const Card = ({ b, dark }: { b: Banner; dark: boolean }) => (
    <Link href={b.href} className={`pbx${dark ? " dark" : ""}`}>
      <div className="pbx-img" style={{ backgroundImage: `url(${b.image})` }} />
      <div className="pbx-cap">
        <div style={{ minWidth: 0 }}>
          <h3>{b.title}</h3>
          <p>{b.sub}</p>
        </div>
        <span className="pbx-go"><Zap size={15}/></span>
      </div>
    </Link>
  );

  return (
    <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 16px 32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px" }} className="pb-grid">
        {banners.map(b => <Card key={b.id} b={b} dark={b.theme === "dark"} />)}
      </div>
      <style>{`
        .pbx { position: relative; display: block; height: 230px; border-radius: 26px; overflow: hidden; text-decoration: none; background: var(--dg-bg-2); }
        .pbx-img { position: absolute; inset: 0; background-size: cover; background-position: center; transition: transform .6s ease; }
        .pbx:hover .pbx-img { transform: scale(1.05); }
        .pbx-cap { position: absolute; right: 14px; left: 14px; bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-radius: 18px; background: rgba(255,255,255,.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        .pbx.dark .pbx-cap { background: rgba(10,35,29,.72); }
        .pbx-cap h3 { color: var(--dg-ink); font-size: 17px; font-weight: 900; margin: 0 0 3px; }
        .pbx-cap p { color: var(--dg-muted); font-size: 12px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pbx.dark .pbx-cap h3 { color: #fff; }
        .pbx.dark .pbx-cap p { color: rgba(255,255,255,.7); }
        .pbx-go { width: 40px; height: 40px; border-radius: 13px; background: var(--dg-grad-gold); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        @media(max-width:640px){.pb-grid{grid-template-columns:1fr!important}.pbx{height:190px;border-radius:22px}}
      `}</style>
    </section>
  );
}
