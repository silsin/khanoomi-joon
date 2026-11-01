"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Slide {
  id: string; tag: string;
  title1: string; title2: string; title3: string;
  subtitle: string;
  cta_label: string; cta_href: string;
  cta2_label: string; cta2_href: string;
  cta3_label: string; cta3_href: string;
  content_position: string;
  image_fit: string;
  image: string; bg_color: string; accent: string;
}

const INTERVAL = 6000;

export default function HeroSlider() {
  const [slides, setSlides]     = useState<Slide[]>([]);
  const [loaded, setLoaded]     = useState(false);
  const [cur, setCur]           = useState(0);
  const [animating, setAnim]    = useState(false);
  const [paused, setPaused]     = useState(false);
  const [progress, setProgress] = useState(0);
  const tRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/slides").then(r => r.json()).then(d => {
      if (d.success && d.data.length > 0) { setSlides(d.data); setCur(0); }
      setLoaded(true);
    }).catch(() => { setLoaded(true); });
  }, []);

  const goTo = useCallback((idx: number) => {
    if (animating || idx === cur) return;
    setAnim(true); setCur(idx); setProgress(0);
    setTimeout(() => setAnim(false), 800);
  }, [animating, cur]);

  const next = useCallback(() => goTo((cur + 1) % slides.length), [cur, goTo, slides.length]);
  const prev = useCallback(() => goTo(cur === 0 ? slides.length - 1 : cur - 1), [cur, goTo, slides.length]);

  useEffect(() => {
    if (paused || slides.length === 0) {
      tRef.current && clearInterval(tRef.current);
      pRef.current && clearInterval(pRef.current);
      return;
    }
    setProgress(0);
    tRef.current = setInterval(() => { setCur(c => (c + 1) % slides.length); setProgress(0); }, INTERVAL);
    pRef.current = setInterval(() => setProgress(p => Math.min(p + (50 / INTERVAL) * 100, 100)), 50);
    return () => {
      tRef.current && clearInterval(tRef.current);
      pRef.current && clearInterval(pRef.current);
    };
  }, [paused, cur, slides.length]);

  // The splash screen holds until the slides arrive (marker), so the hero is
  // never seen popping in after the page.
  if (!loaded) return (
    <span data-dg-pending aria-hidden="true">
      <span style={{ display: "block", maxWidth: "1280px", margin: "20px auto 0", height: "500px", borderRadius: "28px", backgroundColor: "var(--dg-bg-2)" }} />
    </span>
  );

  if (loaded && slides.length === 0) {
    return (
      <section className="hs-empty">
        <div className="hs-empty-text">
          <span className="hs-empty-eyebrow">گالری طلای خانوم جون</span>
          <h1>درخشش طلا،<br /><em>امضای سلیقه شما</em></h1>
          <p>طلا و جواهرات اصل با ضمانت کیفیت، قیمت لحظه‌ای و ارسال امن به سراسر ایران.</p>
          <div className="hs-empty-btns">
            <Link href="/products" className="hs-empty-cta">مشاهده محصولات <ChevronLeft size={16} /></Link>
            <Link href="/collections" className="hs-empty-ghost">کالکشن‌ها</Link>
          </div>
        </div>
        <div className="hs-empty-art" aria-hidden="true">
          <span className="r1" /><span className="r2" /><span className="r3" />
          <span className="gem" />
        </div>
        <style>{`
          .hs-empty { max-width: 1280px; margin: 20px auto 0; min-height: 440px; border-radius: 28px; overflow: hidden; position: relative; display: grid; grid-template-columns: 1.1fr 1fr; align-items: center; background: radial-gradient(110% 130% at 100% 0%, #17765a 0%, var(--dg-primary) 40%, var(--dg-primary-deep) 100%); }
          .hs-empty-text { padding: 56px 56px; position: relative; z-index: 2; }
          .hs-empty-eyebrow { color: var(--dg-gold); font-size: 11px; font-weight: 800; letter-spacing: 3px; }
          .hs-empty h1 { color: #fff; font-size: 44px; font-weight: 900; line-height: 1.35; margin: 14px 0 16px; }
          .hs-empty h1 em { font-style: normal; background: var(--dg-grad-gold); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .hs-empty p { color: rgba(255,255,255,.72); font-size: 14px; line-height: 2; max-width: 420px; margin-bottom: 28px; }
          .hs-empty-btns { display: flex; gap: 12px; flex-wrap: wrap; }
          .hs-empty-cta { display: inline-flex; align-items: center; gap: 6px; background: var(--dg-grad-gold); color: #fff; padding: 13px 26px; border-radius: 14px; font-weight: 800; font-size: 14px; text-decoration: none; box-shadow: 0 10px 24px rgba(0,0,0,.25); }
          .hs-empty-ghost { display: inline-flex; align-items: center; color: #fff; padding: 13px 24px; border-radius: 14px; font-weight: 700; font-size: 14px; text-decoration: none; border: 1px solid rgba(255,255,255,.3); }
          .hs-empty-ghost:hover { background: rgba(255,255,255,.1); }
          .hs-empty-art { position: relative; height: 100%; min-height: 360px; }
          .hs-empty-art span { position: absolute; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%,-50%); }
          .hs-empty-art .r1 { width: 340px; height: 340px; border: 1px solid rgba(198,161,91,.35); }
          .hs-empty-art .r2 { width: 250px; height: 250px; border: 2px solid rgba(198,161,91,.55); }
          .hs-empty-art .r3 { width: 160px; height: 160px; background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.18), rgba(255,255,255,.02)); border: 1px solid rgba(255,255,255,.2); }
          .hs-empty-art .gem { width: 56px; height: 56px; border-radius: 10px; background: var(--dg-grad-gold); transform: translate(-50%,-50%) rotate(45deg); box-shadow: 0 0 60px rgba(198,161,91,.6); }
          @media (max-width: 800px) {
            .hs-empty { grid-template-columns: 1fr; margin: 12px 8px 0; border-radius: 22px; min-height: 0; }
            .hs-empty-text { padding: 36px 24px 8px; }
            .hs-empty h1 { font-size: 30px; }
            .hs-empty-art { min-height: 220px; }
            .hs-empty-art .r1 { width: 220px; height: 220px; }
            .hs-empty-art .r2 { width: 160px; height: 160px; }
            .hs-empty-art .r3 { width: 100px; height: 100px; }
          }
        `}</style>
      </section>
    );
  }

  const slide = slides[cur];
  if (!slide) return null;

  return (
    <>
      <style>{`
        .hs-wrap {
          position: relative;
          max-width: 1280px;
          margin: 20px auto 0;
          height: 520px;
          overflow: hidden;
          border-radius: 28px;
          background: var(--dg-primary-deep);
          box-shadow: var(--dg-shadow);
        }
        .hs-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.85s ease;
          pointer-events: none;
        }
        .hs-slide.active {
          opacity: 1;
          pointer-events: auto;
        }
        .hs-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transition: transform 7s ease-out;
        }
        .hs-slide.active .hs-img {
          transform: scale(1.06);
        }
        .hs-slide:not(.active) .hs-img {
          transform: scale(1);
        }
        /* dark gradient overlay — bottom and right side for RTL text */
        .hs-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to left,
            rgba(10,61,46,0.88) 0%,
            rgba(10,61,46,0.55) 42%,
            rgba(10,61,46,0) 75%
          );
        }
        /* content sits on the right side (RTL) */
        .hs-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 7% 60px 40px;
          text-align: right;
        }
        .hs-content.pos-right  { align-items: flex-end; padding: 0 7% 60px 40px; text-align: right; }
        .hs-content.pos-center { align-items: center;   padding: 0 10% 60px;     text-align: center; }
        .hs-content.pos-left   { align-items: flex-start; padding: 0 40px 60px 7%; text-align: left; }
        .hs-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.55s ease 0.05s, transform 0.55s ease 0.05s;
        }
        .hs-slide.active .hs-tag { opacity: 1; transform: translateY(0); }

        .hs-title-line { overflow: hidden; }
        .hs-title-inner {
          display: block;
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.65s ease, transform 0.65s cubic-bezier(.25,.46,.45,.94);
        }
        .hs-slide.active .hs-title-inner { opacity: 1; transform: translateY(0); }

        .hs-subtitle {
          max-width: 380px;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.6s ease 0.38s, transform 0.6s ease 0.38s;
        }
        .hs-slide.active .hs-subtitle { opacity: 1; transform: translateY(0); }

        .hs-btns {
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.6s ease 0.52s, transform 0.6s ease 0.52s;
        }
        .hs-slide.active .hs-btns { opacity: 1; transform: translateY(0); }

        .hs-arrow {
          position: absolute;
          bottom: 22px;
          width: 46px; height: 46px;
          border-radius: 14px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          z-index: 20;
          backdrop-filter: blur(8px);
          transition: background 0.2s, transform 0.2s;
        }
        .hs-arrow:hover {
          background: #fff;
          color: var(--dg-primary);
        }

        /* dots bar */
        .hs-dots {
          position: absolute;
          bottom: 30px;
          right: 7%;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 20;
        }

        @media (max-width: 700px) {
          .hs-wrap { height: 440px; margin: 12px 8px 0; border-radius: 22px; }
          .hs-dots { right: 20px; }
          .hs-overlay {
            background: linear-gradient(
              to top,
              rgba(10,61,46,0.9) 0%,
              rgba(10,61,46,0.4) 55%,
              rgba(10,61,46,0) 100%
            );
          }
          .hs-content,
          .hs-content.pos-right,
          .hs-content.pos-center,
          .hs-content.pos-left {
            justify-content: flex-end;
            align-items: flex-start;
            padding: 0 20px 72px;
            text-align: right;
          }
          .hs-arrow { width: 36px; height: 36px; }
          .hs-subtitle { max-width: 100%; }
        }
        @media (max-width: 480px) {
          .hs-wrap { height: 400px; }
          .hs-arrow { display: none; }
          .hs-content,
          .hs-content.pos-right,
          .hs-content.pos-center,
          .hs-content.pos-left {
            padding: 0 14px 66px;
          }
          .hs-btns { gap: 8px !important; }
          .hs-btns a { padding-left: 14px !important; padding-right: 14px !important; font-size: 13px !important; }
          .hs-dots { bottom: 16px; }
        }
      `}</style>

      <section
        className="hs-wrap"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slides.map((s, idx) => {
          const isActive = idx === cur;
          const titles = [s.title1, s.title2, s.title3].filter(Boolean);
          const delays = [0.1, 0.22, 0.34];

          return (
            <div key={s.id} className={`hs-slide${isActive ? " active" : ""}`} aria-hidden={!isActive}>

              {/* Full-width background image */}
              {s.image && (
                <img
                  className="hs-img"
                  src={s.image}
                  alt={titles.join(" ")}
                  style={{
                    objectFit: (s.image_fit || "cover") as React.CSSProperties["objectFit"],
                    // Ken Burns zoom only makes sense for cover/fill
                    animation: (s.image_fit === "cover" || s.image_fit === "fill") ? undefined : "none",
                  }}
                />
              )}
              {!s.image && (
                <div style={{ position: "absolute", inset: 0, backgroundColor: s.bg_color || "#2a1a0a" }} />
              )}

              {/* Gradient overlay */}
              <div className="hs-overlay" />

              {/* Text + buttons overlaid on image */}
              <div className={`hs-content pos-${s.content_position || "right"}`}>

                {/* Tag line */}
                {s.tag && (
                  <div className="hs-tag">
                    <span style={{ display: "block", width: "28px", height: "2px", backgroundColor: s.accent || "var(--dg-primary)", borderRadius: "1px" }} />
                    <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "10px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase" }}>
                      {s.tag}
                    </span>
                  </div>
                )}

                {/* Title lines — size/font from CSS vars (--font-size-slider / --font-slider) */}
                <div style={{ marginBottom: "16px" }}>
                  {titles.map((line, li) => (
                    <div key={li} className="hs-title-line">
                      <span
                        className={`hs-title-inner${li === 1 ? " hs-title-accent" : ""}`}
                        style={{
                          fontWeight: "900",
                          lineHeight: 1.15,
                          color: li === 1 ? (s.accent || "var(--dg-primary)") : "#ffffff",
                          transitionDelay: `${delays[li]}s`,
                          display: "block",
                          textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                        }}
                      >
                        {line}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtitle — same typography section as slider title */}
                {s.subtitle && (
                  <p className="hs-subtitle" style={{ color: "rgba(255,255,255,0.75)", lineHeight: "1.7", marginBottom: "28px" }}>
                    {s.subtitle}
                  </p>
                )}

                {/* CTA buttons — on the image */}
                {(s.cta_label || s.cta2_label || s.cta3_label) && (
                  <div className="hs-btns" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    {s.cta_label && (
                      <Link
                        href={s.cta_href || "/products"}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "6px",
                          backgroundColor: s.accent || "var(--dg-primary)",
                          color: "#fff",
                          padding: "12px 28px",
                          borderRadius: "12px",
                          fontWeight: "800",
                          fontSize: "14px",
                          textDecoration: "none",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                          transition: "transform 0.2s, box-shadow 0.2s",
                        }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)"; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)"; }}
                      >
                        {s.cta_label} <ChevronLeft size={15} />
                      </Link>
                    )}
                    {s.cta2_label && (
                      <Link
                        href={s.cta2_href || "/products"}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "6px",
                          backgroundColor: "rgba(255,255,255,0.15)",
                          color: "#fff",
                          padding: "12px 24px",
                          borderRadius: "12px",
                          fontWeight: "600",
                          fontSize: "14px",
                          textDecoration: "none",
                          border: "1px solid rgba(255,255,255,0.4)",
                          backdropFilter: "blur(6px)",
                          transition: "background 0.2s, transform 0.2s",
                        }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "rgba(255,255,255,0.25)"; el.style.transform = "translateY(-2px)"; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "rgba(255,255,255,0.15)"; el.style.transform = "translateY(0)"; }}
                      >
                        {s.cta2_label}
                      </Link>
                    )}
                    {s.cta3_label && (
                      <Link
                        href={s.cta3_href || "/products"}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "6px",
                          backgroundColor: "transparent",
                          color: s.accent || "var(--dg-primary)",
                          padding: "11px 22px",
                          borderRadius: "12px",
                          fontWeight: "600",
                          fontSize: "14px",
                          textDecoration: "none",
                          border: `1px solid ${s.accent || "var(--dg-primary)"}`,
                          transition: "background 0.2s, transform 0.2s",
                        }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "rgba(15,92,69,0.15)"; el.style.transform = "translateY(-2px)"; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "transparent"; el.style.transform = "translateY(0)"; }}
                      >
                        {s.cta3_label}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Prev arrow */}
        <button onClick={prev} aria-label="قبلی" className="hs-arrow" style={{ left: "78px" }}>
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>

        {/* Next arrow */}
        <button onClick={next} aria-label="بعدی" className="hs-arrow" style={{ left: "24px" }}>
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>

        {/* Dots + progress */}
        <div className="hs-dots">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              aria-label={`اسلاید ${idx + 1}`}
              style={{
                padding: 0, border: "none", cursor: "pointer",
                height: "3px",
                width: idx === cur ? "48px" : "20px",
                borderRadius: "2px",
                backgroundColor: idx === cur ? (slide.accent || "var(--dg-primary)") : "rgba(255,255,255,0.4)",
                transition: "width 0.4s, background-color 0.3s",
                overflow: "hidden", position: "relative",
              }}
            >
              {idx === cur && !paused && (
                <span style={{ position: "absolute", inset: 0, width: `${progress}%`, backgroundColor: "rgba(255,255,255,0.5)", transition: "width 0.05s linear" }} />
              )}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
