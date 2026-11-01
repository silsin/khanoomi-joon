"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageHero from "../../components/PageHero";
import PageLayout from "@/app/components/PageLayout";
import {
  GUIDE_PAGES_SETTING_KEY,
  getGuidePageDefinition,
  parseGuidePagesSettings,
  type GuidePageContent,
  type GuidePageSlug,
} from "@/lib/guide-pages-settings";

export default function GuidePage() {
  const params = useParams();
  const slug = String(params.slug ?? "") as GuidePageSlug;
  const definition = getGuidePageDefinition(slug);

  const [content, setContent] = useState<GuidePageContent>({
    heroTitle: "",
    heroSubtitle: "",
    sections: [],
  });

  useEffect(() => {
    if (!definition) return;
    fetch("/api/admin/settings", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const pages = parseGuidePagesSettings(d.data[GUIDE_PAGES_SETTING_KEY]);
          setContent(pages[slug]);
        }
      })
      .catch(() => {});
  }, [slug, definition]);

  if (!definition) {
    return (
      <PageLayout>
        <div style={{ maxWidth: 720, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
          <h1 style={{ color: "var(--dg-ink)", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>صفحه یافت نشد</h1>
          <Link href="/" style={{ color: "var(--dg-primary)", fontSize: 14, textDecoration: "none" }}>بازگشت به صفحه اصلی</Link>
        </div>
      </PageLayout>
    );
  }

  const title = content.heroTitle || definition.label;
  const isFaq = slug === "faq";
  const hasContent = !!(content.heroTitle || content.heroSubtitle || content.sections.length > 0);

  return (
    <PageLayout>
      <PageHero eyebrow={isFaq ? "FAQ" : "GUIDE"} title={title} subtitle={content.heroSubtitle || undefined} crumbs={[{ label: title }]} />

      <div className={`guide-body${hasContent && !isFaq && content.sections.length > 1 ? " guide-split" : ""}`}>
        {hasContent && !isFaq && content.sections.length > 1 && (
          <aside className="guide-toc">
            <p>فهرست مطالب</p>
            {content.sections.map((sec, i) => (
              <a key={i} href={`#sec-${i}`}><span>{String(i + 1).padStart(2, "0")}</span>{sec.title || `بخش ${i + 1}`}</a>
            ))}
          </aside>
        )}
        <div style={{ minWidth: 0 }}>
        {!hasContent ? (
          <div style={{ backgroundColor: "var(--dg-bg-2)", border: "1px dashed var(--dg-line)", borderRadius: 16, padding: "32px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--dg-muted)", fontSize: 14, lineHeight: 1.8 }}>
              محتوای این صفحه هنوز در پنل مدیریت تنظیم نشده است.
            </p>
          </div>
        ) : isFaq ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {content.sections.map((item, i) => (
              <details
                key={i}
                className="guide-faq"
              >
                <summary style={{ color: "var(--dg-ink)", fontSize: 15, fontWeight: 700, cursor: "pointer", listStyle: "none" }}>
                  {item.title || `سؤال ${i + 1}`}
                </summary>
                {item.body && (
                  <p style={{ color: "var(--dg-muted)", fontSize: 14, lineHeight: 2, marginTop: 12, whiteSpace: "pre-wrap" }}>{item.body}</p>
                )}
              </details>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {content.sections.map((section, i) => (
              <div key={i} id={`sec-${i}`} className="guide-sec">
                <span className="guide-sec-n">{String(i + 1).padStart(2, "0")}</span>
                {section.title && (
                  <h2 style={{ color: "var(--dg-ink)", fontSize: 19, fontWeight: 900, marginBottom: 10 }}>{section.title}</h2>
                )}
                {section.body && (
                  <p style={{ color: "var(--dg-muted)", fontSize: 14, lineHeight: 2.1, whiteSpace: "pre-wrap" }}>{section.body}</p>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      <style>{`
        .guide-body { max-width: 900px; margin: 0 auto; padding: 28px 16px 72px; }
        .guide-split { max-width: 1280px; display: grid; grid-template-columns: 260px minmax(0,1fr); gap: 24px; align-items: start; }
        .guide-toc { position: sticky; top: 150px; background: #fff; border: 1px solid var(--dg-line); border-radius: 24px; padding: 16px; display: flex; flex-direction: column; gap: 2px; }
        .guide-toc p { font-size: 13px; font-weight: 800; color: var(--dg-ink); margin: 0 0 8px; }
        .guide-toc a { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; color: var(--dg-ink-2); text-decoration: none; font-size: 13px; }
        .guide-toc a:hover { background: var(--dg-primary-soft); color: var(--dg-primary); }
        .guide-toc a span { font-family: Georgia, serif; color: var(--dg-gold); font-weight: 800; font-size: 12px; }
        .guide-sec { position: relative; background: #fff; border: 1px solid var(--dg-line); border-radius: 24px; padding: 24px 26px; scroll-margin-top: 160px; }
        .guide-sec-n { display: block; font-family: Georgia, serif; font-size: 13px; font-weight: 800; color: var(--dg-gold-deep); letter-spacing: 2px; margin-bottom: 6px; }
        .guide-faq { background: #fff; border: 1px solid var(--dg-line); border-radius: 20px; padding: 16px 20px; }
        .guide-faq[open] { border-color: var(--dg-primary); box-shadow: var(--dg-shadow); }
        @media (max-width: 900px) { .guide-split { grid-template-columns: 1fr; } .guide-toc { position: static; } }
        @media (max-width: 768px) {
          .guide-body { padding: 28px 14px 48px !important; }
        }
      `}</style>
    </PageLayout>
  );
}
