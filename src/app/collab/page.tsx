"use client";

import { useEffect, useState } from "react";
import { Handshake, Send, CheckCircle, ListChecks, Gift, ChevronDown } from "lucide-react";
import PageHero from "../components/PageHero";
import PageLayout from "../components/PageLayout";
import {
  COLLAB_PAGE_SETTING_KEY,
  DEFAULT_COLLAB_PAGE_SETTINGS,
  parseCollabPageSettings,
  type CollabPageSettings,
} from "@/lib/collab-page-settings";

const COLLAP_TYPES = [
  "فروشگاه آنلاین",
  "عکاسی",
  "تالار عروسی",
  "صنف‌های دیگر",
  "سایر",
];

const inp: React.CSSProperties = {
  width: "100%",
  backgroundColor: "var(--dg-surface)",
  border: "1px solid var(--dg-line)",
  borderRadius: "12px",
  padding: "10px 14px",
  color: "var(--dg-ink)",
  fontSize: "14px",
  outline: "none",
  fontFamily: "inherit",
  direction: "rtl",
};

export default function CollabPage() {
  const [content, setContent] = useState<CollabPageSettings>(DEFAULT_COLLAB_PAGE_SETTINGS);
  const [form, setForm] = useState({ name: "", phone: "", email: "", type: COLLAP_TYPES[0], message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.[COLLAB_PAGE_SETTING_KEY]) {
          setContent(parseCollabPageSettings(d.data[COLLAB_PAGE_SETTING_KEY]));
        }
      })
      .catch(() => {});
  }, []);

  const hasHero = !!(content.heroTitle || content.heroSubtitle || content.heroImage);
  const hasIntro = !!(content.introTitle || content.introSubtitle || content.cards.length > 0);
  const hasSteps = !!(content.stepsTitle || content.stepsSubtitle || content.steps.length > 0);
  const hasPerks = !!(content.perksTitle || content.perksSubtitle || content.perks.length > 0);
  const hasForm = !!(content.formTitle || content.formSubtitle);
  const hasFaq = !!(content.faqTitle || content.faqSubtitle || content.faq.length > 0);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr("");
    if (!form.name.trim()) {
      setFormErr("لطفاً نام و نام خانوادگی را وارد کنید");
      return;
    }
    if (!form.phone.trim()) {
      setFormErr("لطفاً شماره تماس را وارد کنید");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || "collab@khanoomijoon.local",
          phone: form.phone.trim(),
          subject: `درخواست همکاری: ${form.type}`,
          message: `نوع همکاری: ${form.type}\nشماره تماس: ${form.phone.trim()}\n\n${form.message.trim()}`,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setSent(true);
      } else {
        setFormErr(data?.error || "خطا در ارسال درخواست. لطفاً دوباره تلاش کنید");
      }
    } catch {
      setFormErr("خطای شبکه. لطفاً دوباره تلاش کنید");
    } finally {
      setSending(false);
    }
  }


  return (
    <PageLayout>
      {!hasHero && <PageHero eyebrow="PARTNERSHIP" title="همکاری با ما" crumbs={[{ label: "همکاری با ما" }]} />}
      {hasHero && (
        <div className="collab-hero" style={{ position: "relative", height: 320, overflow: "hidden", maxWidth: 1248, margin: "20px auto 0", borderRadius: 32, background: "radial-gradient(120% 160% at 100% 0%, #17765a 0%, var(--dg-primary) 45%, var(--dg-primary-deep) 100%)" }}>
          {content.heroImage && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${content.heroImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.35,
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to left, rgba(10,61,46,.9), rgba(10,61,46,.35))",
            }}
          />
          <div
            style={{
              position: "relative",
              maxWidth: 1280,
              margin: "0 auto",
              padding: "0 16px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              textAlign: "right",
              paddingRight: 48,
              paddingLeft: 48,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "var(--dg-grad-gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                transform: "rotate(-6deg)",
                marginBottom: 14,
              }}
            >
              <Handshake size={28} />
            </div>
            {content.heroTitle && (
              <h1 className="collab-hero-title" style={{ color: "#fff", fontSize: 36, fontWeight: 900, marginBottom: 10 }}>{content.heroTitle}</h1>
            )}
            {content.heroSubtitle && (
              <p style={{ color: "rgba(255,255,255,.75)", fontSize: 15, maxWidth: 560, lineHeight: 1.9 }}>{content.heroSubtitle}</p>
            )}
          </div>
        </div>
      )}

      <div className="collab-page-body" style={{ maxWidth: 1280, margin: "0 auto", padding: "52px 16px" }}>
        {hasIntro && (
          <section style={{ marginBottom: 56 }}>
            {content.introTitle && (
              <h2 className="section-title" style={{ fontSize: 24, marginBottom: 8 }}>{content.introTitle}</h2>
            )}
            {content.introSubtitle && (
              <p style={{ color: "var(--dg-muted)", fontSize: 14, marginBottom: 32 }}>{content.introSubtitle}</p>
            )}
            {content.cards.length > 0 && (
              <div className="collab-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, textAlign: "right" }}>
                {content.cards.map((card, i) => (
                  <div
                    key={i}
                    className="cb-card"
                  >
                    <span className="cb-card-n">{String(i + 1).padStart(2, "0")}</span>
                    {card.title && (
                      <h3 style={{ color: "var(--dg-ink)", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{card.title}</h3>
                    )}
                    {card.desc && (
                      <p style={{ color: "var(--dg-muted)", fontSize: 13, lineHeight: 1.9 }}>{card.desc}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {(hasSteps || hasPerks) && (
          <section className="collab-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 64 }}>
            {hasSteps && (
              <div style={{ background: "var(--dg-ink)", borderRadius: 28, padding: 30 }}>
                <h2 style={{ color: "#fff", fontSize: 19, fontWeight: 900, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <ListChecks size={18} color="#c6a15b" /> {content.stepsTitle || "مراحل شروع همکاری"}
                </h2>
                {content.stepsSubtitle && (
                  <p style={{ color: "rgba(255,255,255,.6)", fontSize: 13, marginBottom: 20 }}>{content.stepsSubtitle}</p>
                )}
                <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                  {content.steps.map((step, i) => (
                    <li key={i} className="cb-step" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ width: 30, height: 30, borderRadius: 10, background: "var(--dg-grad-gold)", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <span style={{ color: "rgba(255,255,255,.85)", fontSize: 14, lineHeight: 2 }}>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {hasPerks && (
              <div style={{ borderRadius: 28, padding: 30, background: "var(--dg-gold-soft)", border: "1px solid #eadfc8" }}>
                <h2 style={{ color: "var(--dg-ink)", fontSize: 18, fontWeight: 800, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <Gift size={18} color="var(--dg-primary)" /> {content.perksTitle || "چرا خانوم جون؟"}
                </h2>
                {content.perksSubtitle && (
                  <p style={{ color: "var(--dg-muted)", fontSize: 13, marginBottom: 20 }}>{content.perksSubtitle}</p>
                )}
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {content.perks.map((perk, i) => (
                    <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "var(--dg-ink)", fontSize: 14, lineHeight: 1.9 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 8, background: "#fff", color: "var(--dg-gold-deep)", fontWeight: 900, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4 }}>✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}


        {hasForm && (
          <section style={{ marginBottom: 64 }}>
            <div className="cb-form-wrap">
              <div className="cb-form-head">
                <span className="cb-form-ic"><Send size={20} /></span>
                <h2 style={{ color: "var(--dg-ink)", fontSize: 26, fontWeight: 900, margin: "14px 0 8px" }}>{content.formTitle}</h2>
                {content.formSubtitle && (
                  <p style={{ color: "var(--dg-muted)", fontSize: 14, lineHeight: 1.9 }}>{content.formSubtitle}</p>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
              {sent ? (
                <div style={{ backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: 18, boxShadow: "var(--dg-shadow-sm)", padding: "48px 32px", textAlign: "center" }}>
                  <CheckCircle size={44} color="var(--dg-primary)" style={{ marginBottom: 12 }} />
                  <h3 style={{ color: "var(--dg-ink)", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>درخواست شما با موفقیت ثبت شد</h3>
                  <p style={{ color: "var(--dg-muted)", fontSize: 13, lineHeight: 2 }}>
                    از علاقه‌مندی شما به همکاری با خانوم جون سپاسگزاریم.
                    کارشناسان ما پس از بررسی، با شما تماس می‌گیرند.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: 28, boxShadow: "var(--dg-shadow)", padding: 30 }}>
                  <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: "block", color: "var(--dg-ink)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>نام و نام خانوادگی *</label>
                      <input name="name" value={form.name} onChange={handleChange} style={inp} placeholder="نام شما" />
                    </div>
                    <div>
                      <label style={{ display: "block", color: "var(--dg-ink)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>شماره تماس *</label>
                      <input name="phone" value={form.phone} onChange={handleChange} style={{ ...inp, direction: "ltr", textAlign: "right" }} placeholder="۰۹۱۲۳۴۵۶۷۸۹" />
                    </div>
                    <div>
                      <label style={{ display: "block", color: "var(--dg-ink)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>ایمیل</label>
                      <input name="email" type="email" dir="ltr" value={form.email} onChange={handleChange} style={inp} placeholder="you@email.com" />
                    </div>
                    <div>
                      <label style={{ display: "block", color: "var(--dg-ink)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>نوع همکاری</label>
                      <select name="type" value={form.type} onChange={handleChange} style={{ ...inp, cursor: "pointer" }}>
                        {COLLAP_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", color: "var(--dg-ink)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>توضیحات</label>
                    <textarea name="message" value={form.message} onChange={handleChange} rows={4} style={{ ...inp, resize: "vertical" }} placeholder="درباره کسب‌وکار خود و نوع همکاری موردنظر بنویسید..." />
                  </div>
                  {formErr && (
                    <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{formErr}</p>
                  )}
                  <button
                    type="submit"
                    disabled={sending}
                    style={{
                      width: "100%",
                      background: "var(--dg-grad-gold)",
                      opacity: sending ? 0.7 : 1,
                      color: "#fff",
                      border: "none",
                      borderRadius: 14,
                      padding: "14px",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: sending ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Send size={16} />
                    {sending ? "در حال ارسال..." : "ارسال درخواست همکاری"}
                  </button>
                </form>
              )}
              </div>
            </div>
          </section>
        )}


        {hasFaq && (
          <section>
            {content.faqTitle && (
              <h2 style={{ color: "var(--dg-ink)", fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>{content.faqTitle}</h2>
            )}
            {content.faqSubtitle && (
              <p style={{ color: "var(--dg-muted)", fontSize: 14, textAlign: "center", marginBottom: 32 }}>{content.faqSubtitle}</p>
            )}
            {content.faq.length > 0 && (
              <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
                {content.faq.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: "var(--dg-surface)",
                      border: `1px solid ${openFaq === i ? "var(--dg-primary)" : "var(--dg-line)"}`,
                      borderRadius: 20,
                      overflow: "hidden",
                      transition: "border-color 0.2s",
                      boxShadow: openFaq === i ? "var(--dg-shadow)" : "none",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "16px 20px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--dg-ink)",
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "inherit",
                        textAlign: "right",
                      }}
                    >
                      {item.q}
                      <ChevronDown
                        size={16}
                        style={{
                          color: "var(--dg-primary)",
                          flexShrink: 0,
                          marginRight: 8,
                          transition: "transform 0.2s",
                          transform: openFaq === i ? "rotate(180deg)" : "rotate(0)",
                        }}
                      />
                    </button>
                    {openFaq === i && item.a && (
                      <div style={{ padding: "0 20px 16px", color: "var(--dg-muted)", fontSize: 13, lineHeight: 1.8 }}>{item.a}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <style>{`
        .cb-card { background: #fff; border: 1px solid var(--dg-line); border-radius: 24px; padding: 24px; transition: transform .25s, box-shadow .25s; }
        .cb-card:hover { transform: translateY(-4px); box-shadow: var(--dg-shadow); }
        .cb-card-n { display: block; font-family: Georgia, serif; font-size: 38px; font-weight: 900; line-height: 1; color: var(--dg-gold); opacity: .6; margin-bottom: 14px; }
        .cb-step + .cb-step { padding-top: 14px; border-top: 1px dashed rgba(255,255,255,.12); }
        .cb-form-wrap { display: grid; grid-template-columns: 340px minmax(0,1fr); gap: 36px; align-items: start; }
        .cb-form-head { position: sticky; top: 150px; }
        .cb-form-ic { width: 52px; height: 52px; border-radius: 17px; background: var(--dg-primary); color: #fff; display: flex; align-items: center; justify-content: center; }
        @media (max-width: 900px) {
          .cb-form-wrap { grid-template-columns: 1fr; gap: 16px; }
          .cb-form-head { position: static; }
          .collab-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .collab-grid-2 { grid-template-columns: 1fr !important; }
          .form-grid { grid-template-columns: 1fr !important; }
          .collab-page-body { padding: 30px 14px 40px !important; }
          .collab-hero { height: 230px !important; margin: 12px 8px 0 !important; border-radius: 22px !important; }
          .collab-hero-title { font-size: 24px !important; }
        }
        @media (max-width: 480px) {
          .collab-grid-4 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </PageLayout>
  );
}

