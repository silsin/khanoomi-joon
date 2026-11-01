"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, RefreshCw, Plus, Trash2, BookOpen } from "lucide-react";
import {
  GUIDE_PAGES_SETTING_KEY,
  GUIDE_PAGE_DEFINITIONS,
  emptyGuidePagesSettings,
  parseGuidePagesSettings,
  serializeGuidePagesSettings,
  type GuidePageContent,
  type GuidePageSlug,
  type GuidePagesSettings,
} from "@/lib/guide-pages-settings";

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

const sectionTitle: React.CSSProperties = {
  color: "#d4af37",
  fontSize: "12px",
  fontWeight: 700,
  marginBottom: "10px",
};

export default function GuidePagesSettings() {
  const [pages, setPages] = useState<GuidePagesSettings>(emptyGuidePagesSettings());
  const [activeSlug, setActiveSlug] = useState<GuidePageSlug>("buying");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        setPages(parseGuidePagesSettings(data.data[GUIDE_PAGES_SETTING_KEY]));
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeDef = GUIDE_PAGE_DEFINITIONS.find(d => d.slug === activeSlug)!;
  const content = pages[activeSlug];

  function patchPage(slug: GuidePageSlug, partial: Partial<GuidePageContent>) {
    setPages(prev => ({
      ...prev,
      [slug]: { ...prev[slug], ...partial },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [GUIDE_PAGES_SETTING_KEY]: serializeGuidePagesSettings(pages) }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div id="guide-pages-settings" style={{ ...cardStyle, marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <BookOpen size={16} color="#d4af37" />
        <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>صفحات راهنما (فوتر)</h3>
      </div>
      <p style={{ color: "#666", fontSize: "12px", marginBottom: "16px", lineHeight: 1.6 }}>
        محتوای لینک‌های ستون «خرید از دلی گلد» در فوتر. هر صفحه آدرس جداگانه دارد (مثلاً <strong style={{ color: "#888" }}>/info/buying</strong>).
      </p>

      {loading ? (
        <p style={{ color: "#555", fontSize: "13px" }}>در حال بارگذاری...</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            {GUIDE_PAGE_DEFINITIONS.map(def => {
              const selected = activeSlug === def.slug;
              const hasContent = !!(pages[def.slug].heroTitle || pages[def.slug].sections.length > 0);
              return (
                <button
                  key={def.slug}
                  type="button"
                  onClick={() => setActiveSlug(def.slug)}
                  style={{
                    backgroundColor: selected ? "rgba(212,175,55,0.15)" : "#121212",
                    border: `1px solid ${selected ? "rgba(212,175,55,0.5)" : "#333"}`,
                    color: selected ? "#d4af37" : "#888",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: selected ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {def.label}
                  {!hasContent && <span style={{ color: "#555", marginRight: "6px" }}> · خالی</span>}
                </button>
              );
            })}
          </div>

          <div style={{ padding: "14px", backgroundColor: "#121212", borderRadius: "10px", border: "1px solid #2a2a2a", marginBottom: "14px" }}>
            <p style={{ color: "#888", fontSize: "11px", marginBottom: "4px" }}>آدرس صفحه</p>
            <p style={{ color: "#d4af37", fontSize: "13px", direction: "ltr", textAlign: "left" }}>{activeDef.href}</p>
            <p style={{ color: "#555", fontSize: "11px", marginTop: "6px" }}>{activeDef.description}</p>
          </div>

          <p style={sectionTitle}>بخش بالای صفحه</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            <div>
              <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>عنوان</label>
              <input
                value={content.heroTitle}
                onChange={e => patchPage(activeSlug, { heroTitle: e.target.value })}
                style={{ ...inp, direction: "rtl" }}
                placeholder={activeDef.label}
              />
            </div>
            <div>
              <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>زیرعنوان</label>
              <input
                value={content.heroSubtitle}
                onChange={e => patchPage(activeSlug, { heroSubtitle: e.target.value })}
                style={{ ...inp, direction: "rtl" }}
              />
            </div>
          </div>

          <p style={sectionTitle}>
            {activeSlug === "faq" ? "سؤالات و پاسخ‌ها" : "بخش‌های محتوا"}
          </p>
          {content.sections.map((section, i) => (
            <div key={i} style={{ padding: "10px", backgroundColor: "#121212", borderRadius: "8px", border: "1px solid #2a2a2a", marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#666", fontSize: "10px" }}>
                  {activeSlug === "faq" ? `سؤال ${i + 1}` : `بخش ${i + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => patchPage(activeSlug, { sections: content.sections.filter((_, idx) => idx !== i) })}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <input
                value={section.title}
                onChange={e => {
                  const sections = [...content.sections];
                  sections[i] = { ...sections[i], title: e.target.value };
                  patchPage(activeSlug, { sections });
                }}
                style={{ ...inp, marginBottom: "6px", direction: "rtl" }}
                placeholder={activeSlug === "faq" ? "سؤال" : "عنوان بخش"}
              />
              <textarea
                value={section.body}
                onChange={e => {
                  const sections = [...content.sections];
                  sections[i] = { ...sections[i], body: e.target.value };
                  patchPage(activeSlug, { sections });
                }}
                rows={3}
                style={{ ...inp, direction: "rtl", resize: "vertical" }}
                placeholder={activeSlug === "faq" ? "پاسخ" : "متن بخش"}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => patchPage(activeSlug, { sections: [...content.sections, { title: "", body: "" }] })}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "1px dashed #444", color: "#888", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", marginBottom: "16px" }}
          >
            <Plus size={13} />
            {activeSlug === "faq" ? "افزودن سؤال" : "افزودن بخش"}
          </button>

          {saved && (
            <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#10b981", fontSize: "13px" }}>
              ✓ صفحات راهنما ذخیره شد
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: saving ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "11px 24px", fontWeight: "700", fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {saving ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
            {saving ? "در حال ذخیره..." : "ذخیره صفحات راهنما"}
          </button>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
