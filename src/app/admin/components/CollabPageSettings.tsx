"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Save, RefreshCw, Upload, Plus, Trash2, Handshake } from "lucide-react";
import {
  COLLAB_PAGE_SETTING_KEY,
  DEFAULT_COLLAB_PAGE_SETTINGS,
  parseCollabPageSettings,
  serializeCollabPageSettings,
  type CollabPageSettings,
} from "@/lib/collab-page-settings";

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

const addBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "none",
  border: "1px dashed #444",
  color: "#888",
  borderRadius: "6px",
  padding: "6px 10px",
  fontSize: "11px",
  cursor: "pointer",
  fontFamily: "inherit",
  marginBottom: "16px",
};

const rowBox: React.CSSProperties = {
  padding: "10px",
  backgroundColor: "#121212",
  borderRadius: "8px",
  border: "1px solid #2a2a2a",
  marginBottom: "8px",
};

const delBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#ef4444",
  cursor: "pointer",
  padding: 0,
};

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = await res.json();
  return data.success ? data.data.url : null;
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      if (url) onChange(url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ marginBottom: "10px" }}>
      <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>{label}</label>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#222", color: "#aaa", border: "1px dashed #444", borderRadius: "6px", padding: "7px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
          <Upload size={13} />
          {uploading ? "در حال آپلود..." : "آپلود تصویر"}
        </button>
        {value && (
          <img src={value} alt="" style={{ width: "56px", height: "36px", objectFit: "cover", borderRadius: "4px", border: "1px solid #333" }} />
        )}
      </div>
      <input value={value} onChange={e => onChange(e.target.value)} style={{ ...inp, marginTop: "6px" }} placeholder="یا URL تصویر" />
    </div>
  );
}

export default function CollabPageSettings() {
  const [content, setContent] = useState<CollabPageSettings>(DEFAULT_COLLAB_PAGE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success && data.data?.[COLLAB_PAGE_SETTING_KEY]) {
        setContent(parseCollabPageSettings(data.data[COLLAB_PAGE_SETTING_KEY]));
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function patch(partial: Partial<CollabPageSettings>) {
    setContent(prev => ({ ...prev, ...partial }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [COLLAB_PAGE_SETTING_KEY]: serializeCollabPageSettings(content) }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div id="collab-page-settings" style={{ ...cardStyle, marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <Handshake size={16} color="#d4af37" />
        <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>صفحه همکاری با ما</h3>
      </div>
      <p style={{ color: "#666", fontSize: "12px", marginBottom: "16px", lineHeight: 1.6 }}>
        محتوای صفحه «همکاری با ما» با آدرس <strong style={{ color: "#888" }}>/collab</strong>.
        درخواست‌های همکاری از طریق فرم همین صفحه به بخش «تیکت‌ها» می‌رسند.
      </p>

      {loading ? (
        <p style={{ color: "#555", fontSize: "13px" }}>در حال بارگذاری...</p>
      ) : (
        <>
          <p style={sectionTitle}>بنر بالای صفحه</p>
          <input value={content.heroTitle} placeholder="عنوان" onChange={e => patch({ heroTitle: e.target.value })} style={{ ...inp, marginBottom: "8px", direction: "rtl" }} />
          <textarea value={content.heroSubtitle} placeholder="زیرعنوان" onChange={e => patch({ heroSubtitle: e.target.value })} rows={2} style={{ ...inp, marginBottom: "10px", direction: "rtl", resize: "vertical" }} />
          <ImageField label="تصویر پس‌زمینه بنر" value={content.heroImage} onChange={v => patch({ heroImage: v })} />

          <p style={sectionTitle}>روش‌های همکاری</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <input value={content.introTitle} placeholder="عنوان بخش" onChange={e => patch({ introTitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
            <input value={content.introSubtitle} placeholder="زیرعنوان بخش" onChange={e => patch({ introSubtitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
          </div>
          {content.cards.map((card, i) => (
            <div key={i} style={rowBox}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#666", fontSize: "10px" }}>روش {i + 1}</span>
                <button type="button" title="حذف" onClick={() => patch({ cards: content.cards.filter((_, idx) => idx !== i) })} style={delBtn}>
                  <Trash2 size={13} />
                </button>
              </div>
              <input value={card.title} placeholder="عنوان روش" onChange={e => {
                const cards = [...content.cards];
                cards[i] = { ...cards[i], title: e.target.value };
                patch({ cards });
              }} style={{ ...inp, marginBottom: "6px", direction: "rtl" }} />
              <textarea value={card.desc} placeholder="توضیحات" onChange={e => {
                const cards = [...content.cards];
                cards[i] = { ...cards[i], desc: e.target.value };
                patch({ cards });
              }} rows={2} style={{ ...inp, direction: "rtl", resize: "vertical" }} />
            </div>
          ))}
          <button type="button" onClick={() => patch({ cards: [...content.cards, { title: "", desc: "" }] })} style={addBtn}>
            <Plus size={13} /> افزودن روش همکاری
          </button>


          <p style={sectionTitle}>مراحل شروع همکاری</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <input value={content.stepsTitle} placeholder="عنوان بخش" onChange={e => patch({ stepsTitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
            <input value={content.stepsSubtitle} placeholder="زیرعنوان بخش" onChange={e => patch({ stepsSubtitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
          </div>
          {content.steps.map((step, i) => (
            <div key={i} style={{ ...rowBox, display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ color: "#d4af37", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <input value={step} placeholder={`مرحله ${i + 1}`} onChange={e => {
                const steps = [...content.steps];
                steps[i] = e.target.value;
                patch({ steps });
              }} style={{ ...inp, direction: "rtl" }} />
              <button type="button" title="حذف" onClick={() => patch({ steps: content.steps.filter((_, idx) => idx !== i) })} style={{ ...delBtn, flexShrink: 0 }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => patch({ steps: [...content.steps, ""] })} style={addBtn}>
            <Plus size={13} /> افزودن مرحله
          </button>

          <p style={sectionTitle}>چرا دلی گلد؟</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <input value={content.perksTitle} placeholder="عنوان بخش" onChange={e => patch({ perksTitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
            <input value={content.perksSubtitle} placeholder="زیرعنوان بخش" onChange={e => patch({ perksSubtitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
          </div>
          {content.perks.map((perk, i) => (
            <div key={i} style={{ ...rowBox, display: "flex", gap: "6px", alignItems: "center" }}>
              <input value={perk} placeholder={`مورد ${i + 1}`} onChange={e => {
                const perks = [...content.perks];
                perks[i] = e.target.value;
                patch({ perks });
              }} style={{ ...inp, direction: "rtl" }} />
              <button type="button" title="حذف" onClick={() => patch({ perks: content.perks.filter((_, idx) => idx !== i) })} style={{ ...delBtn, flexShrink: 0 }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => patch({ perks: [...content.perks, ""] })} style={addBtn}>
            <Plus size={13} /> افزودن مورد
          </button>


          <p style={sectionTitle}>فرم درخواست</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            <input value={content.formTitle} placeholder="عنوان فرم" onChange={e => patch({ formTitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
            <input value={content.formSubtitle} placeholder="زیرعنوان فرم" onChange={e => patch({ formSubtitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
          </div>

          <p style={sectionTitle}>سؤالات متداول</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <input value={content.faqTitle} placeholder="عنوان بخش" onChange={e => patch({ faqTitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
            <input value={content.faqSubtitle} placeholder="زیرعنوان بخش" onChange={e => patch({ faqSubtitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
          </div>
          {content.faq.map((item, i) => (
            <div key={i} style={rowBox}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#666", fontSize: "10px" }}>سؤال {i + 1}</span>
                <button type="button" title="حذف" onClick={() => patch({ faq: content.faq.filter((_, idx) => idx !== i) })} style={delBtn}>
                  <Trash2 size={13} />
                </button>
              </div>
              <input value={item.q} placeholder="سؤال" onChange={e => {
                const faq = [...content.faq];
                faq[i] = { ...faq[i], q: e.target.value };
                patch({ faq });
              }} style={{ ...inp, marginBottom: "6px", direction: "rtl" }} />
              <textarea value={item.a} placeholder="پاسخ" onChange={e => {
                const faq = [...content.faq];
                faq[i] = { ...faq[i], a: e.target.value };
                patch({ faq });
              }} rows={2} style={{ ...inp, direction: "rtl", resize: "vertical" }} />
            </div>
          ))}
          <button type="button" onClick={() => patch({ faq: [...content.faq, { q: "", a: "" }] })} style={addBtn}>
            <Plus size={13} /> افزودن سؤال
          </button>

          {saved && (
            <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#10b981", fontSize: "13px" }}>
              ✓ صفحه همکاری با ما ذخیره شد
            </div>
          )}

          <button type="button" onClick={handleSave} disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: saving ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "11px 24px", fontWeight: "700", fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
            {saving ? "در حال ذخیره..." : "ذخیره صفحه همکاری با ما"}
          </button>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

