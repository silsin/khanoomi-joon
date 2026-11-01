"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Save, RefreshCw, Upload, Plus, Trash2, FileText } from "lucide-react";
import {
  ABOUT_PAGE_SETTING_KEY,
  EMPTY_ABOUT_PAGE_SETTINGS,
  parseAboutPageSettings,
  serializeAboutPageSettings,
  type AboutPageSettings,
} from "@/lib/about-page-settings";

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

export default function AboutPageSettings() {
  const [content, setContent] = useState<AboutPageSettings>(EMPTY_ABOUT_PAGE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        setContent(parseAboutPageSettings(data.data[ABOUT_PAGE_SETTING_KEY]));
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function patch(partial: Partial<AboutPageSettings>) {
    setContent(prev => ({ ...prev, ...partial }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [ABOUT_PAGE_SETTING_KEY]: serializeAboutPageSettings(content) }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div id="about-page-settings" style={{ ...cardStyle, marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <FileText size={16} color="#d4af37" />
        <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>صفحه درباره ما</h3>
      </div>
      <p style={{ color: "#666", fontSize: "12px", marginBottom: "16px", lineHeight: 1.6 }}>
        محتوای صفحه <strong style={{ color: "#888" }}>/about</strong> — فقط متنی که اینجا وارد کنید نمایش داده می‌شود.
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

          <p style={{ ...sectionTitle, marginTop: "18px" }}>داستان ما</p>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>عنوان بخش</label>
            <input value={content.storyTitle} onChange={e => patch({ storyTitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>پارagraph ۱</label>
            <textarea value={content.storyParagraph1} onChange={e => patch({ storyParagraph1: e.target.value })} rows={3} style={{ ...inp, direction: "rtl", resize: "vertical" }} />
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" }}>پارagraph ۲</label>
            <textarea value={content.storyParagraph2} onChange={e => patch({ storyParagraph2: e.target.value })} rows={3} style={{ ...inp, direction: "rtl", resize: "vertical" }} />
          </div>
          <ImageField label="تصویر بخش داستان" value={content.storyImage} onChange={v => patch({ storyImage: v })} />

          <p style={{ ...sectionTitle, marginTop: "18px" }}>آمار</p>
          {content.stats.map((stat, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", marginBottom: "8px" }}>
              <input value={stat.value} placeholder="مقدار" onChange={e => {
                const stats = [...content.stats];
                stats[i] = { ...stats[i], value: e.target.value };
                patch({ stats });
              }} style={inp} />
              <input value={stat.label} placeholder="برچسب" onChange={e => {
                const stats = [...content.stats];
                stats[i] = { ...stats[i], label: e.target.value };
                patch({ stats });
              }} style={{ ...inp, direction: "rtl" }} />
              <button type="button" onClick={() => patch({ stats: content.stats.filter((_, idx) => idx !== i) })}
                style={{ background: "none", border: "1px solid #333", borderRadius: "6px", color: "#ef4444", cursor: "pointer", padding: "0 10px" }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => patch({ stats: [...content.stats, { value: "", label: "" }] })}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "1px dashed #444", color: "#888", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", marginBottom: "14px" }}>
            <Plus size={13} /> افزودن آمار
          </button>

          <p style={sectionTitle}>ارزش‌های ما</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <input value={content.valuesTitle} placeholder="عنوان بخش" onChange={e => patch({ valuesTitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
            <input value={content.valuesSubtitle} placeholder="زیرعنوان بخش" onChange={e => patch({ valuesSubtitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
          </div>
          {content.values.map((val, i) => (
            <div key={i} style={{ padding: "10px", backgroundColor: "#121212", borderRadius: "8px", border: "1px solid #2a2a2a", marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#666", fontSize: "10px" }}>ارزش {i + 1}</span>
                <button type="button" onClick={() => patch({ values: content.values.filter((_, idx) => idx !== i) })}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0 }}>
                  <Trash2 size={13} />
                </button>
              </div>
              <input value={val.title} placeholder="عنوان" onChange={e => {
                const values = [...content.values];
                values[i] = { ...values[i], title: e.target.value };
                patch({ values });
              }} style={{ ...inp, marginBottom: "6px", direction: "rtl" }} />
              <textarea value={val.desc} placeholder="توضیح" onChange={e => {
                const values = [...content.values];
                values[i] = { ...values[i], desc: e.target.value };
                patch({ values });
              }} rows={2} style={{ ...inp, direction: "rtl", resize: "vertical" }} />
            </div>
          ))}
          <button type="button" onClick={() => patch({ values: [...content.values, { title: "", desc: "" }] })}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "1px dashed #444", color: "#888", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", marginBottom: "14px" }}>
            <Plus size={13} /> افزودن ارزش
          </button>

          <p style={sectionTitle}>تیم</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <input value={content.teamTitle} placeholder="عنوان بخش" onChange={e => patch({ teamTitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
            <input value={content.teamSubtitle} placeholder="زیرعنوان بخش" onChange={e => patch({ teamSubtitle: e.target.value })} style={{ ...inp, direction: "rtl" }} />
          </div>
          {content.team.map((member, i) => (
            <div key={i} style={{ padding: "10px", backgroundColor: "#121212", borderRadius: "8px", border: "1px solid #2a2a2a", marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#666", fontSize: "10px" }}>عضو {i + 1}</span>
                <button type="button" onClick={() => patch({ team: content.team.filter((_, idx) => idx !== i) })}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0 }}>
                  <Trash2 size={13} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                <input value={member.name} placeholder="نام" onChange={e => {
                  const team = [...content.team];
                  team[i] = { ...team[i], name: e.target.value };
                  patch({ team });
                }} style={{ ...inp, direction: "rtl" }} />
                <input value={member.role} placeholder="سمت" onChange={e => {
                  const team = [...content.team];
                  team[i] = { ...team[i], role: e.target.value };
                  patch({ team });
                }} style={{ ...inp, direction: "rtl" }} />
              </div>
              <ImageField label="عکس" value={member.image} onChange={v => {
                const team = [...content.team];
                team[i] = { ...team[i], image: v };
                patch({ team });
              }} />
            </div>
          ))}
          <button type="button" onClick={() => patch({ team: [...content.team, { name: "", role: "", image: "" }] })}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "1px dashed #444", color: "#888", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", marginBottom: "16px" }}>
            <Plus size={13} /> افزودن عضو تیم
          </button>

          {saved && (
            <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#10b981", fontSize: "13px" }}>
              ✓ صفحه درباره ما ذخیره شد
            </div>
          )}

          <button type="button" onClick={handleSave} disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: saving ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "11px 24px", fontWeight: "700", fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
            {saving ? "در حال ذخیره..." : "ذخیره صفحه درباره ما"}
          </button>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
