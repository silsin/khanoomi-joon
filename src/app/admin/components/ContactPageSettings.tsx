"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Save, RefreshCw, Upload, Plus, Trash2, Phone } from "lucide-react";
import {
  CONTACT_PAGE_SETTING_KEY,
  EMPTY_CONTACT_PAGE_SETTINGS,
  parseContactPageSettings,
  serializeContactPageSettings,
  type ContactPageSettings,
} from "@/lib/contact-page-settings";

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

export default function ContactPageSettings() {
  const [content, setContent] = useState<ContactPageSettings>(EMPTY_CONTACT_PAGE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        setContent(parseContactPageSettings(data.data[CONTACT_PAGE_SETTING_KEY]));
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function patch(partial: Partial<ContactPageSettings>) {
    setContent(prev => ({ ...prev, ...partial }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [CONTACT_PAGE_SETTING_KEY]: serializeContactPageSettings(content) }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div id="contact-page-settings" style={{ ...cardStyle, marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <Phone size={16} color="#d4af37" />
        <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>صفحه تماس با ما</h3>
      </div>
      <p style={{ color: "#666", fontSize: "12px", marginBottom: "16px", lineHeight: 1.6 }}>
        محتوای صفحه <strong style={{ color: "#888" }}>/contact</strong>. تلفن، ایمیل اصلی و آدرس از بخش «اطلاعات تماس و سایت» خوانده می‌شوند.
      </p>

      {loading ? (
        <p style={{ color: "#555", fontSize: "13px" }}>در حال بارگذاری...</p>
      ) : (
        <>
          <p style={sectionTitle}>بخش بالای صفحه</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            <div>
              <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>عنوان</label>
              <input value={content.heroTitle} onChange={e => patch({ heroTitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
            </div>
            <div>
              <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>زیرعنوان</label>
              <input value={content.heroSubtitle} onChange={e => patch({ heroSubtitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
            </div>
          </div>
          <ImageField label="تصویر پس‌زمینه بالای صفحه" value={content.heroImage} onChange={v => patch({ heroImage: v })} />

          <p style={{ ...sectionTitle, marginTop: "18px" }}>اطلاعات تکمیلی (کارت‌ها)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>ایمیل دوم (اختیاری)</label>
              <input value={content.email2} onChange={e => patch({ email2: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>خط دوم آدرس (اختیاری)</label>
              <input value={content.addressLine2} onChange={e => patch({ addressLine2: e.target.value })} style={{ ...inp, direction: "rtl" }} />
            </div>
          </div>
          <p style={{ color: "#555", fontSize: "11px", marginBottom: "6px" }}>خطوط کارت «ساعات کاری» در بالای صفحه</p>
          {content.hoursCardLines.map((line, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", marginBottom: "8px" }}>
              <input value={line} onChange={e => {
                const hoursCardLines = [...content.hoursCardLines];
                hoursCardLines[i] = e.target.value;
                patch({ hoursCardLines });
              }} style={{ ...inp, direction: "rtl" }} />
              <button type="button" onClick={() => patch({ hoursCardLines: content.hoursCardLines.filter((_, idx) => idx !== i) })}
                style={{ background: "none", border: "1px solid #333", borderRadius: "6px", color: "#ef4444", cursor: "pointer", padding: "0 10px" }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => patch({ hoursCardLines: [...content.hoursCardLines, ""] })}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "1px dashed #444", color: "#888", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", marginBottom: "14px" }}>
            <Plus size={13} /> افزودن خط ساعات کاری
          </button>

          <p style={sectionTitle}>فرم تماس</p>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>عنوان فرم</label>
            <input value={content.formTitle} onChange={e => patch({ formTitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
          </div>

          <p style={sectionTitle}>نقشه</p>
          <ImageField label="تصویر نقشه" value={content.mapImage} onChange={v => patch({ mapImage: v })} />
          <div style={{ marginBottom: "14px" }}>
            <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>متن روی نقشه</label>
            <input value={content.mapLabel} onChange={e => patch({ mapLabel: e.target.value })} style={{ ...inp, direction: "rtl" }} />
          </div>

          <p style={sectionTitle}>جدول ساعات کاری (کنار نقشه)</p>
          {content.hoursTable.map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", marginBottom: "8px" }}>
              <input value={row.day} placeholder="روز" onChange={e => {
                const hoursTable = [...content.hoursTable];
                hoursTable[i] = { ...hoursTable[i], day: e.target.value };
                patch({ hoursTable });
              }} style={{ ...inp, direction: "rtl" }} />
              <input value={row.time} placeholder="ساعت" onChange={e => {
                const hoursTable = [...content.hoursTable];
                hoursTable[i] = { ...hoursTable[i], time: e.target.value };
                patch({ hoursTable });
              }} style={{ ...inp, direction: "rtl" }} />
              <button type="button" onClick={() => patch({ hoursTable: content.hoursTable.filter((_, idx) => idx !== i) })}
                style={{ background: "none", border: "1px solid #333", borderRadius: "6px", color: "#ef4444", cursor: "pointer", padding: "0 10px" }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => patch({ hoursTable: [...content.hoursTable, { day: "", time: "" }] })}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "1px dashed #444", color: "#888", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", marginBottom: "14px" }}>
            <Plus size={13} /> افزودن ردیف ساعات
          </button>

          <p style={sectionTitle}>سؤالات متداول</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <input value={content.faqTitle} placeholder="عنوان بخش" onChange={e => patch({ faqTitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
            <input value={content.faqSubtitle} placeholder="زیرعنوان بخش" onChange={e => patch({ faqSubtitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
          </div>
          {content.faq.map((item, i) => (
            <div key={i} style={{ padding: "10px", backgroundColor: "#121212", borderRadius: "8px", border: "1px solid #2a2a2a", marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#666", fontSize: "10px" }}>سؤال {i + 1}</span>
                <button type="button" onClick={() => patch({ faq: content.faq.filter((_, idx) => idx !== i) })}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0 }}>
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
          <button type="button" onClick={() => patch({ faq: [...content.faq, { q: "", a: "" }] })}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "1px dashed #444", color: "#888", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", marginBottom: "16px" }}>
            <Plus size={13} /> افزودن سؤال
          </button>

          {saved && (
            <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#10b981", fontSize: "13px" }}>
              ✓ صفحه تماس با ما ذخیره شد
            </div>
          )}

          <button type="button" onClick={handleSave} disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: saving ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "11px 24px", fontWeight: "700", fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
            {saving ? "در حال ذخیره..." : "ذخیره صفحه تماس با ما"}
          </button>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
