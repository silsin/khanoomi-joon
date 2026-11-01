"use client";

import { useEffect, useState } from "react";
import PageHero from "../components/PageHero";
import PageLayout from "../components/PageLayout";
import {
  ABOUT_PAGE_SETTING_KEY,
  EMPTY_ABOUT_PAGE_SETTINGS,
  parseAboutPageSettings,
  type AboutPageSettings,
} from "@/lib/about-page-settings";

export default function AboutPage() {
  const [content, setContent] = useState<AboutPageSettings>(EMPTY_ABOUT_PAGE_SETTINGS);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setContent(parseAboutPageSettings(d.data[ABOUT_PAGE_SETTING_KEY]));
        }
      })
      .catch(() => {});
  }, []);

  const hasHero = !!(content.heroTitle || content.heroSubtitle || content.heroImage);
  const hasStory = !!(content.storyTitle || content.storyParagraph1 || content.storyParagraph2 || content.storyImage);
  const hasStats = content.stats.length > 0;
  const hasValues = !!(content.valuesTitle || content.valuesSubtitle || content.values.length > 0);
  const hasTeam = !!(content.teamTitle || content.teamSubtitle || content.team.length > 0);

  return (
    <PageLayout>
      {!hasHero && <PageHero eyebrow="ABOUT US" title="درباره ما" crumbs={[{ label: "درباره ما" }]} />}
      {hasHero && (
        <div className="about-hero" style={{ position: "relative", height: 360, overflow: "hidden", maxWidth: 1248, margin: "20px auto 0", borderRadius: 32, background: "var(--dg-primary-deep)" }}>
          {content.heroImage && (
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${content.heroImage})`, backgroundSize: "cover", backgroundPosition: "center", filter: "saturate(.9)" }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to left, rgba(10,61,46,.92) 0%, rgba(10,61,46,.7) 45%, rgba(10,61,46,.2) 100%)" }} />
          <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 16px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", textAlign: "right", paddingRight: 48, paddingLeft: 48 }}>
            <span style={{ color: "var(--dg-gold)", fontSize: 11, fontWeight: 800, letterSpacing: 3, marginBottom: 8 }}>ABOUT US</span>
            {content.heroTitle && (
              <h1 className="about-hero-title" style={{ color: "#fff", fontSize: 38, fontWeight: 900, marginBottom: 10 }}>{content.heroTitle}</h1>
            )}
            {content.heroSubtitle && (
              <p style={{ color: "rgba(255,255,255,.75)", fontSize: 15, maxWidth: 500, lineHeight: 1.9 }}>{content.heroSubtitle}</p>
            )}
          </div>
        </div>
      )}

      <div className="about-page-body" style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 16px" }}>
        {hasStory && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginBottom: 72, alignItems: "center" }} className="story-grid">
            <div>
              <span style={{ display: "inline-block", color: "var(--dg-gold-deep)", background: "var(--dg-gold-soft)", fontSize: 11, fontWeight: 800, letterSpacing: 2, padding: "5px 12px", borderRadius: 999, marginBottom: 14 }}>OUR STORY</span>
              {content.storyTitle && (
                <h2 style={{ color: "var(--dg-ink)", fontSize: 30, fontWeight: 900, marginBottom: 16, lineHeight: 1.5 }}>{content.storyTitle}</h2>
              )}
              {content.storyParagraph1 && (
                <p style={{ color: "var(--dg-muted)", fontSize: 14, lineHeight: 2, marginBottom: 16 }}>{content.storyParagraph1}</p>
              )}
              {content.storyParagraph2 && (
                <p style={{ color: "var(--dg-muted)", fontSize: 14, lineHeight: 2 }}>{content.storyParagraph2}</p>
              )}
            </div>
            {content.storyImage && (
              <div className="about-story-frame">
                <img className="about-story-img" src={content.storyImage} alt={content.storyTitle || ""} style={{ width: "100%", height: 360, objectFit: "cover", display: "block", borderRadius: 28, position: "relative" }} />
              </div>
            )}
          </div>
        )}

        {hasStats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 72 }} className="stats-grid about-stats">
            {content.stats.map((s, i) => (
              <div key={i} className="about-stat">
                {s.value && <p className="about-stat-num">{s.value}</p>}
                {s.label && <p style={{ color: "rgba(255,255,255,.65)", fontSize: 13 }}>{s.label}</p>}
              </div>
            ))}
          </div>
        )}

        {hasValues && (
          <div style={{ marginBottom: 72 }}>
            {content.valuesTitle && (
              <h2 className="section-title" style={{ fontSize: 24, marginBottom: 8 }}>{content.valuesTitle}</h2>
            )}
            {content.valuesSubtitle && (
              <p style={{ color: "var(--dg-muted)", fontSize: 14, marginBottom: 28 }}>{content.valuesSubtitle}</p>
            )}
            {content.values.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="values-grid">
                {content.values.map((v, i) => (
                  <div key={i} className="about-value">
                    <span className="about-value-n">{String(i + 1).padStart(2, "0")}</span>
                    {v.title && <h3 style={{ color: "var(--dg-ink)", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{v.title}</h3>}
                    {v.desc && <p style={{ color: "var(--dg-muted)", fontSize: 12, lineHeight: 1.7 }}>{v.desc}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {hasTeam && (
          <div>
            {content.teamTitle && (
              <h2 style={{ color: "var(--dg-ink)", fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>{content.teamTitle}</h2>
            )}
            {content.teamSubtitle && (
              <p style={{ color: "var(--dg-muted)", fontSize: 14, textAlign: "center", marginBottom: 36 }}>{content.teamSubtitle}</p>
            )}
            {content.team.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 700, margin: "0 auto" }} className="team-grid">
                {content.team.map((m, i) => (
                  <div key={i} style={{ textAlign: "center", background: "#fff", border: "1px solid var(--dg-line)", borderRadius: 24, padding: 14 }}>
                    {m.image && (
                      <div style={{ width: "100%", aspectRatio: "1", borderRadius: 18, overflow: "hidden", marginBottom: 12 }}>
                        <img src={m.image} alt={m.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    {m.name && <h3 style={{ color: "var(--dg-ink)", fontSize: 15, fontWeight: 700 }}>{m.name}</h3>}
                    {m.role && <p style={{ color: "var(--dg-primary)", fontSize: 12 }}>{m.role}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .about-story-frame { position: relative; }
        .about-story-frame::before { content: ""; position: absolute; inset: 18px -18px -18px 18px; border: 2px solid var(--dg-gold); border-radius: 28px; }
        .about-stats { background: var(--dg-ink); border-radius: 28px; padding: 10px; position: relative; overflow: hidden; }
        .about-stat { text-align: center; padding: 26px 16px; position: relative; }
        .about-stat + .about-stat::before { content: ""; position: absolute; right: 0; top: 25%; bottom: 25%; width: 1px; background: rgba(255,255,255,.12); }
        .about-stat-num { font-size: 36px; font-weight: 900; margin-bottom: 4px; background: var(--dg-grad-gold); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .about-value { position: relative; overflow: hidden; background: #fff; border: 1px solid var(--dg-line); border-radius: 24px; padding: 26px 22px; transition: transform .25s, box-shadow .25s; }
        .about-value:hover { transform: translateY(-4px); box-shadow: var(--dg-shadow); }
        .about-value-n { display: block; font-family: Georgia, serif; font-size: 40px; font-weight: 900; line-height: 1; color: var(--dg-gold); opacity: .55; margin-bottom: 14px; }
        @media (max-width: 900px) {
          .about-stat::before { display: none; }
          .about-story-frame::before { inset: 10px -10px -10px 10px; }
          .story-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .values-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .team-grid { grid-template-columns: 1fr !important; }
          .about-page-body { padding: 32px 14px 44px !important; }
          .about-hero { height: 240px !important; margin: 12px 8px 0 !important; border-radius: 22px !important; }
          .about-hero-title { font-size: 24px !important; }
          .about-story-img { height: 210px !important; }
        }
      `}</style>
    </PageLayout>
  );
}
