import Link from "next/link";

interface Props {
  title: React.ReactNode;
  eyebrow?: string;
  subtitle?: React.ReactNode;
  /** Trail between «خانه» and the current page title. */
  crumbs?: { label: string; href?: string }[];
  /** Optional content on the far side of the band (chips, counters, steps). */
  aside?: React.ReactNode;
}

/** Shared emerald header band for storefront inner pages. */
export default function PageHero({ title, eyebrow, subtitle, crumbs = [], aside }: Props) {
  return (
    <section className="ph">
      <div className="ph-band">
        <div className="ph-text">
          <nav className="ph-crumb">
            <Link href="/">خانه</Link>
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: "contents" }}>
                <i>◆</i>
                {c.href ? <Link href={c.href}>{c.label}</Link> : <b>{c.label}</b>}
              </span>
            ))}
          </nav>
          {eyebrow && <span className="ph-eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {aside && <div className="ph-aside">{aside}</div>}
      </div>
      <style>{`
        .ph { max-width: 1280px; margin: 20px auto 0; padding: 0 16px; }
        .ph-band { position: relative; overflow: hidden; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; padding: 30px 34px; border-radius: 28px; background: radial-gradient(120% 160% at 100% 0%, #17765a 0%, var(--dg-primary) 45%, var(--dg-primary-deep) 100%); }
        .ph-band::before { content: ""; position: absolute; left: -60px; top: -80px; width: 240px; height: 240px; border-radius: 50%; border: 2px solid rgba(198,161,91,.35); pointer-events: none; }
        .ph-band::after { content: ""; position: absolute; left: 60px; bottom: -110px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(198,161,91,.22), transparent 70%); pointer-events: none; }
        .ph-text { position: relative; z-index: 1; min-width: 0; }
        .ph-crumb { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 12px; color: rgba(255,255,255,.6); margin-bottom: 10px; }
        .ph-crumb a { color: rgba(255,255,255,.6); text-decoration: none; }
        .ph-crumb a:hover { color: #fff; }
        .ph-crumb i { color: var(--dg-gold); font-size: 8px; font-style: normal; }
        .ph-crumb b { color: #fff; font-weight: 600; }
        .ph-eyebrow { display: block; color: var(--dg-gold); font-size: 11px; font-weight: 800; letter-spacing: 3px; margin-bottom: 4px; }
        .ph h1 { color: #fff; font-size: 28px; font-weight: 900; margin: 0; display: flex; align-items: center; gap: 10px; }
        .ph p { color: rgba(255,255,255,.72); font-size: 13px; line-height: 1.9; margin: 8px 0 0; max-width: 560px; }
        .ph-aside { position: relative; z-index: 1; }
        @media (max-width: 640px) {
          .ph { padding: 0 8px; margin-top: 12px; }
          .ph-band { padding: 22px 20px; border-radius: 22px; }
          .ph h1 { font-size: 22px; }
        }
      `}</style>
    </section>
  );
}
