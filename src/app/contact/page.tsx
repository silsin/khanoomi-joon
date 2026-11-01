"use client";

import { useEffect, useMemo, useState } from "react";
import { Phone, MapPin, Mail, Clock, Send, CheckCircle } from "lucide-react";
import PageHero from "../components/PageHero";
import PageLayout from "../components/PageLayout";
import {
  CONTACT_PAGE_SETTING_KEY,
  EMPTY_CONTACT_PAGE_SETTINGS,
  parseContactPageSettings,
  type ContactPageSettings,
} from "@/lib/contact-page-settings";

interface SiteContact {
  phone1: string;
  phone2: string;
  email: string;
  address: string;
}

export default function ContactPage() {
  const [content, setContent] = useState<ContactPageSettings>(EMPTY_CONTACT_PAGE_SETTINGS);
  const [site, setSite] = useState<SiteContact>({ phone1: "", phone2: "", email: "", address: "" });
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setContent(parseContactPageSettings(d.data[CONTACT_PAGE_SETTING_KEY]));
          setSite({
            phone1: d.data.site_phone1 ?? "",
            phone2: d.data.site_phone2 ?? "",
            email: d.data.site_email ?? "",
            address: d.data.site_address ?? "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const contactCards = useMemo(() => {
    const cards: { icon: React.ReactNode; title: string; lines: string[] }[] = [];
    const phoneLines = [site.phone1, site.phone2].filter(Boolean);
    if (phoneLines.length) {
      cards.push({ icon: <Phone size={20} />, title: "تلفن تماس", lines: phoneLines });
    }
    const emailLines = [site.email, content.email2].filter(Boolean);
    if (emailLines.length) {
      cards.push({ icon: <Mail size={20} />, title: "ایمیل", lines: emailLines });
    }
    const addressLines = [site.address, content.addressLine2].filter(Boolean);
    if (addressLines.length) {
      cards.push({ icon: <MapPin size={20} />, title: "آدرس", lines: addressLines });
    }
    if (content.hoursCardLines.length) {
      cards.push({ icon: <Clock size={20} />, title: "ساعات کاری", lines: content.hoursCardLines });
    }
    return cards;
  }, [site, content.email2, content.addressLine2, content.hoursCardLines]);

  const hasHero = !!(content.heroTitle || content.heroSubtitle || content.heroImage);
  const hasMapSection = !!(content.mapImage || content.mapLabel || content.hoursTable.length > 0);
  const hasFaq = !!(content.faqTitle || content.faqSubtitle || content.faq.length > 0);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          subject: form.subject,
          message: form.message,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setSent(true);
      }
    } catch {
      // keep silent, UI stays on form
    } finally {
      setSending(false);
    }
  }

  return (
    <PageLayout>
      {!hasHero && <PageHero eyebrow="CONTACT US" title="تماس با ما" crumbs={[{ label: "تماس با ما" }]} />}
      {hasHero && (
        <div className="contact-hero" style={{ position: "relative", height: 280, overflow: "hidden", maxWidth: 1248, margin: "20px auto 0", borderRadius: 32, background: "radial-gradient(120% 160% at 100% 0%, #17765a 0%, var(--dg-primary) 45%, var(--dg-primary-deep) 100%)" }}>
          {content.heroImage && (
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${content.heroImage})`, backgroundSize: "cover", backgroundPosition: "center", opacity: .35 }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to left, rgba(10,61,46,.85), rgba(10,61,46,.3))" }} />
          <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 16px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: 48, paddingLeft: 48 }}>
            <span style={{ color: "var(--dg-gold)", fontSize: 11, fontWeight: 800, letterSpacing: 3, marginBottom: 8 }}>CONTACT US</span>
            {content.heroTitle && (
              <h1 className="contact-hero-title" style={{ color: "#fff", fontSize: 36, fontWeight: 900, marginBottom: 8 }}>{content.heroTitle}</h1>
            )}
            {content.heroSubtitle && (
              <p style={{ color: "rgba(255,255,255,.75)", fontSize: 14 }}>{content.heroSubtitle}</p>
            )}
          </div>
        </div>
      )}

      <div className="contact-page-body" style={{ maxWidth: 1280, margin: "0 auto", padding: hasHero ? "0 16px 48px" : "32px 16px 48px" }}>
        {contactCards.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 48 }} className={`info-grid${hasHero ? " info-lift" : ""}`}>
            {contactCards.map((c, i) => (
              <div key={i} className="ct-card">
                <div className="ct-card-ic">{c.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ color: "var(--dg-ink)", fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{c.title}</h3>
                  {c.lines.map((l, j) => <p key={j} style={{ color: "var(--dg-muted)", fontSize: 12, lineHeight: 1.8 }}>{l}</p>)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: hasMapSection ? "1fr 1fr" : "1fr", gap: 32, marginBottom: 64, ...(hasMapSection ? {} : { maxWidth: 640, marginLeft: "auto", marginRight: "auto" }) }} className="form-grid">
            <div className="ct-form">
              {content.formTitle && (
                <h2 className="ct-form-title"><Send size={18} /> {content.formTitle}</h2>
              )}

              {sent ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <CheckCircle size={48} color="#10b981" style={{ margin: "0 auto 16px", display: "block" }} />
                  <h3 style={{ color: "var(--dg-ink)", fontSize: 18, marginBottom: 8 }}>پیام شما ارسال شد!</h3>
                  <p style={{ color: "var(--dg-muted)", fontSize: 14 }}>در اسرع وقت پاسخ خواهیم داد.</p>
                  <button onClick={() => { setSent(false); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); }}
                    style={{ marginTop: 20, backgroundColor: "transparent", color: "var(--dg-primary)", border: "1px solid var(--dg-primary)", borderRadius: 12, padding: "8px 20px", cursor: "pointer", fontFamily: "inherit" }}>
                    ارسال پیام دیگر
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    {[
                      { name: "name", label: "نام و نام خانوادگی", type: "text", required: true },
                      { name: "phone", label: "شماره تماس", type: "tel", required: false },
                    ].map(f => (
                      <div key={f.name}>
                        <label style={{ color: "var(--dg-muted)", fontSize: 12, display: "block", marginBottom: 5 }}>{f.label}{f.required && " *"}</label>
                        <input name={f.name} type={f.type} value={(form as Record<string, string>)[f.name]} onChange={handleChange} required={f.required}
                          style={{ width: "100%", backgroundColor: "var(--dg-bg-2)", border: "1px solid var(--dg-line)", borderRadius: 14, padding: "12px 14px", color: "var(--dg-ink)", fontSize: 13, outline: "none" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: "var(--dg-muted)", fontSize: 12, display: "block", marginBottom: 5 }}>ایمیل *</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} required
                      style={{ width: "100%", backgroundColor: "var(--dg-bg-2)", border: "1px solid var(--dg-line)", borderRadius: 14, padding: "12px 14px", color: "var(--dg-ink)", fontSize: 13, outline: "none", direction: "ltr" }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: "var(--dg-muted)", fontSize: 12, display: "block", marginBottom: 5 }}>موضوع</label>
                    <select name="subject" value={form.subject} onChange={handleChange}
                      style={{ width: "100%", backgroundColor: "var(--dg-bg-2)", border: "1px solid var(--dg-line)", borderRadius: 14, padding: "12px 14px", color: form.subject ? "var(--dg-ink)" : "var(--dg-muted)", fontSize: 13, outline: "none" }}>
                      <option value="">انتخاب کنید</option>
                      <option value="order">پیگیری سفارش</option>
                      <option value="return">مرجوعی</option>
                      <option value="custom">سفارش اختصاصی</option>
                      <option value="other">سایر</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: "var(--dg-muted)", fontSize: 12, display: "block", marginBottom: 5 }}>پیام *</label>
                    <textarea name="message" value={form.message} onChange={handleChange} required rows={5}
                      style={{ width: "100%", backgroundColor: "var(--dg-bg-2)", border: "1px solid var(--dg-line)", borderRadius: 14, padding: "12px 14px", color: "var(--dg-ink)", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
                  </div>
                  <button type="submit" disabled={sending}
                    style={{ width: "100%", background: "var(--dg-grad-gold)", color: "#fff", border: "none", borderRadius: 14, padding: "14px", fontWeight: 700, fontSize: 15, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Send size={16} />
                    {sending ? "در حال ارسال..." : "ارسال پیام"}
                  </button>
                </form>
              )}
            </div>

            {hasMapSection && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {(content.mapImage || content.mapLabel) && (
                  <div style={{ flex: 1, backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: 26, boxShadow: "var(--dg-shadow-sm)", overflow: "hidden", minHeight: 280, position: "relative" }}>
                    {content.mapImage && (
                      <img src={content.mapImage} alt="نقشه" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.4) saturate(0)" }} />
                    )}
                    {content.mapLabel && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                        <div style={{ width: 48, height: 48, backgroundColor: "var(--dg-primary)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <MapPin size={24} color="#fff" />
                        </div>
                        <p style={{ color: "var(--dg-ink)", fontSize: 14, fontWeight: 600 }}>{content.mapLabel}</p>
                      </div>
                    )}
                  </div>
                )}
                {content.hoursTable.length > 0 && (
                  <div style={{ background: "var(--dg-ink)", borderRadius: 26, padding: 22 }}>
                    <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <Clock size={16} color="#c6a15b" /> ساعات کاری
                    </h3>
                    {content.hoursTable.map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < content.hoursTable.length - 1 ? "1px dashed rgba(255,255,255,.15)" : "none" }}>
                        {r.day && <span style={{ color: "rgba(255,255,255,.65)", fontSize: 13 }}>{r.day}</span>}
                        {r.time && <span style={{ color: r.time === "تعطیل" ? "#f87171" : "var(--dg-gold)", fontSize: 13, fontWeight: 600 }}>{r.time}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        {hasFaq && (
          <div className="ct-faq">
            <div className="ct-faq-head">
              <span className="ct-faq-eyebrow">FAQ</span>
            {content.faqTitle && (
              <h2 style={{ color: "var(--dg-ink)", fontSize: 26, fontWeight: 900, marginBottom: 8 }}>{content.faqTitle}</h2>
            )}
            {content.faqSubtitle && (
              <p style={{ color: "var(--dg-muted)", fontSize: 14, lineHeight: 1.9 }}>{content.faqSubtitle}</p>
            )}
            </div>
            {content.faq.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {content.faq.map((item, i) => (
                  <div key={i} style={{ backgroundColor: "var(--dg-surface)", border: `1px solid ${openFaq === i ? "var(--dg-primary)" : "var(--dg-line)"}`, borderRadius: 20, boxShadow: openFaq === i ? "var(--dg-shadow)" : "none", overflow: "hidden", transition: "border-color 0.2s" }}>
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", color: "var(--dg-ink)", fontSize: 14, fontWeight: 600, fontFamily: "inherit", textAlign: "right" }}>
                      {item.q}
                      <span style={{ color: "var(--dg-primary)", fontSize: 20, flexShrink: 0, marginRight: 8, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "rotate(0)" }}>+</span>
                    </button>
                    {openFaq === i && item.a && (
                      <div style={{ padding: "0 20px 16px", color: "var(--dg-muted)", fontSize: 13, lineHeight: 1.8 }}>{item.a}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .info-lift { position: relative; margin-top: -48px; z-index: 2; padding: 0 24px; }
        .ct-card { display: flex; align-items: flex-start; gap: 14px; background: #fff; border: 1px solid var(--dg-line); border-radius: 22px; padding: 18px; box-shadow: var(--dg-shadow); }
        .ct-card-ic { width: 46px; height: 46px; border-radius: 15px; background: var(--dg-gold-soft); color: var(--dg-gold-deep); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ct-form { background: #fff; border: 1px solid var(--dg-line); border-radius: 28px; box-shadow: var(--dg-shadow-sm); padding: 0 28px 28px; overflow: hidden; }
        .ct-form-title { margin: 0 -28px 24px; padding: 18px 28px; background: var(--dg-primary-soft); color: var(--dg-primary-deep); font-size: 18px; font-weight: 900; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--dg-primary-line); }
        .ct-form:not(:has(.ct-form-title)) { padding-top: 28px; }
        .ct-faq { display: grid; grid-template-columns: 320px minmax(0,1fr); gap: 36px; align-items: start; }
        .ct-faq-head { position: sticky; top: 150px; }
        .ct-faq-eyebrow { display: inline-block; color: var(--dg-gold-deep); background: var(--dg-gold-soft); font-size: 11px; font-weight: 800; letter-spacing: 2px; padding: 5px 12px; border-radius: 999px; margin-bottom: 12px; }
        @media (max-width: 900px) {
          .info-lift { margin-top: -32px; padding: 0 10px; }
          .ct-faq { grid-template-columns: 1fr; gap: 18px; }
          .ct-faq-head { position: static; }
          .info-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .form-grid { grid-template-columns: 1fr !important; }
          .contact-page-body { padding: 28px 14px 40px !important; }
          .contact-hero { height: 220px !important; margin: 12px 8px 0 !important; border-radius: 22px !important; }
          .contact-hero-title { font-size: 24px !important; }
        }
        @media (max-width: 480px) {
          .info-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </PageLayout>
  );
}
