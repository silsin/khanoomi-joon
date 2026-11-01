"use client";
import { useState, useEffect } from "react";
import { Send, Phone, MapPin, Mail } from "lucide-react";
import Link from "next/link";
import { buildSocialLinks } from "@/lib/social-platforms";
import SocialIconLink from "./SocialIconLink";
import { GUIDE_PAGE_DEFINITIONS } from "@/lib/guide-pages-settings";

const footerLinks = {
  "خرید از خانوم جون": GUIDE_PAGE_DEFINITIONS.map(def => ({
    label: def.label,
    href: def.href,
  })),
  "حساب کاربری": [
    { label: "وضعیت سفارش‌ها", href: "/account?tab=orders" },
    { label: "علاقه‌مندی‌ها",  href: "/account" },
    { label: "تنظیمات حساب",   href: "/account" },
  ],
  "خانوم جون": [
    { label: "درباره ما",  href: "/about" },
    { label: "تماس با ما", href: "/contact" },
    { label: "همکاری با ما", href: "/collab" },
    { label: "محصولات",    href: "/products" },
    { label: "تابلو طلا",  href: "/rates-board" },
  ],
};

interface SiteSettings {
  site_phone1: string; site_phone2: string;
  site_address: string; site_email: string;
  site_brand_desc: string;
  [key: string]: string;
}

const DEFAULTS: SiteSettings = {
  site_phone1: "", site_phone2: "",
  site_address: "", site_email: "",
  site_brand_desc: "خانوم جون؛ ارائه‌دهنده بهترین طلاها با تضمین کیفیت و اعتماد",
};

export default function Footer() {
  const [s, setS] = useState<SiteSettings>(DEFAULTS);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" }).then(r => r.json()).then(d => {
      if (d.success) setS({ ...DEFAULTS, ...d.data });
    }).catch(() => {});
  }, []);

  const socials = buildSocialLinks(s);

  const contacts = [
    s.site_phone1  && { icon: <Phone  size={13}/>, text: s.site_phone1 },
    s.site_phone2  && { icon: <Phone  size={13}/>, text: s.site_phone2 },
    s.site_address && { icon: <MapPin size={13}/>, text: s.site_address },
    s.site_email   && { icon: <Mail   size={13}/>, text: s.site_email },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  const heading = (title: string) => (
    <h4 style={{ color: "#fff", fontSize: "14px", fontWeight: "800", marginBottom: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ width: "6px", height: "6px", background: "var(--dg-gold)", transform: "rotate(45deg)", display: "inline-block" }} />
      {title}
    </h4>
  );

  return (
    <footer className="dg-footer">
      <div className="dg-footer-inner">
        {/* ── Band: brand + newsletter ── */}
        <div className="dg-footer-band">
          <div className="dg-footer-brand">
            <span className="dgh-mark" style={{ width: 48, height: 48, borderRadius: 14 }}><span>خ</span></span>
            <div>
              <div style={{ color: "#fff", fontSize: "22px", fontWeight: "900" }}><span style={{ color: "var(--dg-gold)", fontSize: "14px", fontWeight: "700", marginLeft: "6px" }}>گالری طلای</span>خانوم جون</div>
              <p style={{ color: "rgba(255,255,255,0.68)", fontSize: "12.5px", lineHeight: "1.9", marginTop: "4px", maxWidth: "420px" }}>{s.site_brand_desc}</p>
            </div>
          </div>
          <div className="dg-footer-news">
            <p style={{ color: "#fff", fontSize: "13px", fontWeight: "800", marginBottom: "10px" }}>از جدیدترین طرح‌ها و تخفیف‌ها باخبر شوید</p>
            <div className="dg-footer-news-box">
              <input type="email" placeholder="ایمیل شما" />
              <button><Send size={13}/> عضویت</button>
            </div>
          </div>
        </div>

        {/* ── Columns ── */}
        <div className="footer-grid">
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              {heading(title)}
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {links.map(link => (
                  <li key={link.label} style={{ marginBottom: "11px" }}>
                    <Link href={link.href} className="dg-footer-link">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            {heading("اطلاعات تماس")}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {contacts.length > 0 ? contacts.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "rgba(255,255,255,0.75)", fontSize: "12.5px", lineHeight: 1.8 }}>
                  <span style={{ color: "var(--dg-gold)", flexShrink: 0, width: "30px", height: "30px", borderRadius: "10px", backgroundColor: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</span>
                  <span style={{ paddingTop: "3px" }}>{c.text}</span>
                </div>
              )) : (
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>به‌زودی</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="dg-footer-bottom">
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px" }}>تمامی حقوق این سایت متعلق به گالری طلای خانوم جون است · ۱۴۰۴</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {socials.map(sc => (
              <SocialIconLink
                key={sc.type}
                href={sc.href}
                label={sc.label}
                type={sc.type}
                iconUrl={sc.iconUrl}
                hover={sc.hover}
                size={16}
                variant="footer"
              />
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .dg-footer { margin-top: 64px; padding: 0 16px 16px; }
        .dg-footer-inner { max-width: 1280px; margin: 0 auto; border-radius: 28px; overflow: hidden; padding: 0 36px; background: radial-gradient(120% 120% at 100% 0%, #13684f 0%, var(--dg-primary-deep) 45%, #08251c 100%); }
        .dg-footer-band { display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap; padding: 36px 0; border-bottom: 1px solid rgba(255,255,255,0.12); }
        .dg-footer-brand { display: flex; align-items: center; gap: 16px; }
        .dg-footer-news { width: min(420px, 100%); }
        .dg-footer-news-box { display: flex; gap: 4px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); border-radius: 14px; padding: 5px; }
        .dg-footer-news-box input { flex: 1; min-width: 0; background: transparent; border: none; outline: none; padding: 9px 12px; color: #fff; font-size: 12.5px; direction: ltr; font-family: inherit; }
        .dg-footer-news-box input::placeholder { color: rgba(255,255,255,0.45); }
        .dg-footer-news-box button { background: var(--dg-grad-gold); color: #fff; border: none; border-radius: 10px; padding: 9px 18px; font-weight: 800; font-size: 12.5px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit; }
        .footer-grid { display: grid; grid-template-columns: repeat(3, 1fr) 1.3fr; gap: 32px; padding: 36px 0; }
        .dg-footer-link { color: rgba(255,255,255,0.68); text-decoration: none; font-size: 12.5px; transition: color .2s, padding .2s; display: inline-block; }
        .dg-footer-link:hover { color: var(--dg-gold); padding-right: 4px; }
        .dg-footer-bottom { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 18px 0 22px; border-top: 1px solid rgba(255,255,255,0.12); }
        @media(max-width:900px){ .footer-grid{grid-template-columns:1fr 1fr} .dg-footer-inner{padding:0 22px} }
        @media(max-width:540px){ .dg-footer{padding:0 8px 8px} .footer-grid{grid-template-columns:1fr} .dg-footer-bottom{justify-content:center;text-align:center} .dg-footer-inner{border-radius:22px} }
      `}</style>
    </footer>
  );
}
