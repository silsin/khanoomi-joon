"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Save, RefreshCw, ExternalLink, Image as ImageIcon } from "lucide-react";

interface Slide {
  id: string;
  sort_order: number;
  tag: string;
  title1: string;
  title2: string;
  title3: string;
  subtitle: string;
  cta_label: string;
  cta_href: string;
  cta2_label: string;
  cta2_href: string;
  cta3_label: string;
  cta3_href: string;
  content_position: string;
  image: string;
  active: number;
}

type SlideDraft = Omit<Slide, "id" | "sort_order" | "active" | "image" | "content_position">;

const emptyDraft = (): SlideDraft => ({
  tag: "",
  title1: "",
  title2: "",
  title3: "",
  subtitle: "",
  cta_label: "",
  cta_href: "/products",
  cta2_label: "",
  cta2_href: "/contact",
  cta3_label: "",
  cta3_href: "",
});

const cardStyle: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: "12px",
  padding: "24px",
};

const inp: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#121212",
  border: "1px solid #333",
  borderRadius: "6px",
  padding: "8px 10px",
  color: "#fff",
  fontSize: "13px",
  outline: "none",
  fontFamily: "inherit",
};

function slideToDraft(slide: Slide): SlideDraft {
  return {
    tag: slide.tag ?? "",
    title1: slide.title1 ?? "",
    title2: slide.title2 ?? "",
    title3: slide.title3 ?? "",
    subtitle: slide.subtitle ?? "",
    cta_label: slide.cta_label ?? "",
    cta_href: slide.cta_href ?? "/products",
    cta2_label: slide.cta2_label ?? "",
    cta2_href: slide.cta2_href ?? "",
    cta3_label: slide.cta3_label ?? "",
    cta3_href: slide.cta3_href ?? "",
  };
}

export default function SliderTextSettings() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [drafts, setDrafts] = useState<Record<string, SlideDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const loadSlides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/slides");
      const data = await res.json();
      if (data.success) {
        const list = data.data as Slide[];
        setSlides(list);
        setDrafts(Object.fromEntries(list.map(s => [s.id, slideToDraft(s)])));
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSlides(); }, [loadSlides]);

  function updateDraft(id: string, key: keyof SlideDraft, value: string) {
    setDrafts(prev => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }));
  }

  async function saveSlide(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    setSavedId(null);
    try {
      const res = await fetch(`/api/admin/slides/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedId(id);
        setTimeout(() => setSavedId(cur => (cur === id ? null : cur)), 2500);
        loadSlides();
      }
    } catch {}
    finally { setSavingId(null); }
  }

  return (
    <div id="slider-text-settings" style={{ ...cardStyle, marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <ImageIcon size={16} color="#d4af37" />
            <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>متن اسلایدر صفحه اصلی</h3>
          </div>
          <p style={{ color: "#666", fontSize: "12px", lineHeight: 1.6, maxWidth: "520px" }}>
            تیتر، زیرعنوان، تگ و متن دکمه‌های هر اسلاید را اینجا ویرایش کنید. برای تصویر، رنگ و ترتیب اسلایدها به بخش اسلایدر بروید.
          </p>
        </div>
        <Link
          href="/admin/slides"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#d4af37",
            fontSize: "12px",
            fontWeight: "600",
            textDecoration: "none",
            border: "1px solid rgba(212,175,55,0.35)",
            borderRadius: "8px",
            padding: "8px 12px",
            whiteSpace: "nowrap",
          }}
        >
          مدیریت کامل اسلایدر
          <ExternalLink size={13} />
        </Link>
      </div>

      {loading ? (
        <p style={{ color: "#555", fontSize: "13px" }}>در حال بارگذاری اسلایدها...</p>
      ) : slides.length === 0 ? (
        <div style={{ backgroundColor: "#121212", border: "1px dashed #333", borderRadius: "8px", padding: "20px", textAlign: "center" }}>
          <p style={{ color: "#666", fontSize: "13px", marginBottom: "12px" }}>هنوز اسلایدی ثبت نشده است.</p>
          <Link
            href="/admin/slides"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#d4af37",
              color: "#000",
              borderRadius: "6px",
              padding: "8px 16px",
              fontWeight: "700",
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            ساخت اولین اسلاید
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {slides.map((slide, index) => {
            const draft = drafts[slide.id] ?? slideToDraft(slide);
            const titles = [draft.title1, draft.title2, draft.title3].filter(Boolean).join(" · ");

            return (
              <div
                key={slide.id}
                style={{
                  padding: "16px",
                  backgroundColor: "#121212",
                  border: "1px solid #2a2a2a",
                  borderRadius: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                  {slide.image ? (
                    <img
                      src={slide.image}
                      alt=""
                      style={{ width: "72px", height: "44px", objectFit: "cover", borderRadius: "6px", border: "1px solid #333" }}
                    />
                  ) : (
                    <div style={{ width: "72px", height: "44px", borderRadius: "6px", backgroundColor: "#222", border: "1px solid #333" }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#fff", fontSize: "13px", fontWeight: "700" }}>
                      اسلاید {index + 1}
                      <span style={{ color: slide.active ? "#10b981" : "#ef4444", fontSize: "10px", fontWeight: "600", marginRight: "8px" }}>
                        {slide.active ? " · فعال" : " · غیرفعال"}
                      </span>
                    </p>
                    <p style={{ color: "#666", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {titles || "بدون عنوان"}
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>تگ بالای عنوان</label>
                  <input
                    value={draft.tag}
                    onChange={e => updateDraft(slide.id, "tag", e.target.value)}
                    style={{ ...inp, direction: "ltr" }}
                    placeholder="متن تگ"
                  />
                </div>

                <p style={{ color: "#d4af37", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "8px" }}>عنوان (۳ خط)</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                  {(["title1", "title2", "title3"] as const).map((key, i) => (
                    <div key={key}>
                      <label style={{ color: "#888", fontSize: "10px", display: "block", marginBottom: "3px" }}>
                        خط {i + 1}{i === 1 ? " (طلایی)" : ""}
                      </label>
                      <input
                        value={draft[key]}
                        onChange={e => updateDraft(slide.id, key, e.target.value)}
                        style={{ ...inp, direction: "rtl" }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>زیرعنوان</label>
                  <input
                    value={draft.subtitle}
                    onChange={e => updateDraft(slide.id, "subtitle", e.target.value)}
                    style={{ ...inp, direction: "rtl" }}
                  />
                </div>

                <p style={{ color: "#d4af37", fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "8px" }}>دکمه‌ها</p>
                {[
                  { label: "دکمه اول", lk: "cta_label" as const, hk: "cta_href" as const },
                  { label: "دکمه دوم", lk: "cta2_label" as const, hk: "cta2_href" as const },
                  { label: "دکمه سوم", lk: "cta3_label" as const, hk: "cta3_href" as const },
                ].map(btn => (
                  <div key={btn.lk} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                    <div>
                      <label style={{ color: "#666", fontSize: "10px", display: "block", marginBottom: "3px" }}>{btn.label} — متن</label>
                      <input
                        value={draft[btn.lk]}
                        onChange={e => updateDraft(slide.id, btn.lk, e.target.value)}
                        style={{ ...inp, direction: "rtl" }}
                      />
                    </div>
                    <div>
                      <label style={{ color: "#666", fontSize: "10px", display: "block", marginBottom: "3px" }}>{btn.label} — لینک</label>
                      <input
                        value={draft[btn.hk]}
                        onChange={e => updateDraft(slide.id, btn.hk, e.target.value)}
                        style={{ ...inp, direction: "ltr" }}
                      />
                    </div>
                  </div>
                ))}

                <div style={{
                  background: "linear-gradient(135deg, #7b1a1a 0%, #8b2020 100%)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "12px",
                  textAlign: "right",
                }}>
                  {draft.tag && (
                    <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "9px", letterSpacing: "1px", marginBottom: "6px" }}>{draft.tag}</p>
                  )}
                  {[draft.title1, draft.title2, draft.title3].filter(Boolean).map((line, i) => (
                    <p key={i} style={{ color: i === 1 ? "#f0c040" : "#fff", fontSize: i === 1 ? "18px" : "15px", fontWeight: 900, lineHeight: 1.2, marginBottom: "2px" }}>
                      {line}
                    </p>
                  ))}
                  {draft.subtitle && (
                    <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "11px", marginTop: "6px", lineHeight: 1.5 }}>{draft.subtitle}</p>
                  )}
                  {(draft.cta_label || draft.cta2_label || draft.cta3_label) && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                      {draft.cta_label && <span style={{ backgroundColor: "#c8a12a", color: "#fff", fontSize: "10px", padding: "4px 10px", borderRadius: "5px", fontWeight: 700 }}>{draft.cta_label}</span>}
                      {draft.cta2_label && <span style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", fontSize: "10px", padding: "4px 10px", borderRadius: "5px" }}>{draft.cta2_label}</span>}
                      {draft.cta3_label && <span style={{ border: "1px solid #c8a12a", color: "#c8a12a", fontSize: "10px", padding: "4px 10px", borderRadius: "5px" }}>{draft.cta3_label}</span>}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => saveSlide(slide.id)}
                  disabled={savingId === slide.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: savingId === slide.id ? "#a08020" : "#d4af37",
                    color: "#000",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontWeight: "700",
                    fontSize: "12px",
                    cursor: savingId === slide.id ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {savingId === slide.id ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
                  {savingId === slide.id ? "در حال ذخیره..." : "ذخیره متن این اسلاید"}
                </button>
                {savedId === slide.id && (
                  <span style={{ color: "#10b981", fontSize: "12px", marginRight: "10px" }}>✓ ذخیره شد</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
