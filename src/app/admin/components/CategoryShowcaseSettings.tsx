"use client";

import { useEffect, useRef, useState } from "react";
import { Save, RefreshCw, Plus, Trash2, ChevronUp, ChevronDown, ImageIcon, Upload, X } from "lucide-react";
import {
  CATEGORY_SHOWCASE_SETTING_KEY,
  DEFAULT_CATEGORY_SHOWCASE,
  SHOWCASE_MAX_ITEMS,
  SHOWCASE_COLUMNS_MIN,
  SHOWCASE_COLUMNS_MAX,
  parseCategoryShowcase,
  serializeCategoryShowcase,
  type CategoryShowcaseConfig,
  type CategoryShowcaseItem,
} from "@/lib/category-showcase";

interface Category { id: string; name: string; slug: string; product_count: number; banner_image?: string; image?: string; }

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

const lab: React.CSSProperties = { color: "#888", fontSize: "11px", display: "block", marginBottom: "4px" };

const miniBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 30,
  backgroundColor: "#222",
  color: "#aaa",
  border: "1px solid #333",
  borderRadius: 6,
  cursor: "pointer",
  padding: 0,
};

/**
 * Admin editor for ویترین دسته‌بندی — the big homepage tiles («مشاهده همه …»):
 * grid size (columns), tile width/height/gap, color vs. black-and-white images,
 * and the ordered tile list (which categories + per-tile title/image override).
 */
export default function CategoryShowcaseSettings() {
  const [cfg, setCfg] = useState<CategoryShowcaseConfig | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadingIdx = useRef<number>(-1);
  const [addSel, setAddSel] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => setCfg(
        d.success && d.data?.[CATEGORY_SHOWCASE_SETTING_KEY] != null
          ? parseCategoryShowcase(d.data[CATEGORY_SHOWCASE_SETTING_KEY])
          : { ...DEFAULT_CATEGORY_SHOWCASE, items: [] },
      ))
      .catch(() => setCfg({ ...DEFAULT_CATEGORY_SHOWCASE, items: [] }));
    fetch("/api/categories").then(r => r.json()).then(d => { if (d.success) setCats(d.data); }).catch(() => {});
  }, []);

  async function uploadImage(file: File) {
    const idx = uploadingIdx.current;
    if (idx < 0) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) setCfg(prev => prev ? { ...prev, items: prev.items.map((it, j) => j === idx ? { ...it, image: data.data.url } : it) } : prev);
      else setError(data.error || "خطا در آپلود");
    } catch { setError("خطای شبکه در آپلود"); }
  }

  if (!cfg) {
    return (
      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <RefreshCw size={16} color="#d4af37" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ color: "#888", fontSize: "13px" }}>در حال بارگذاری ویترین دسته‌بندی...</span>
        </div>
      </div>
    );
  }

  const catById = new Map(cats.map(c => [c.id, c]));
  const chosenIds = new Set(cfg.items.map(i => i.category_id));
  const available = cats.filter(c => !chosenIds.has(c.id));

  const patch = (p: Partial<CategoryShowcaseConfig>) => setCfg(prev => (prev ? { ...prev, ...p } : prev));
  const patchItem = (i: number, p: Partial<CategoryShowcaseItem>) =>
    setCfg(prev => (prev ? { ...prev, items: prev.items.map((it, j) => (j === i ? { ...it, ...p } : it)) } : prev));

  const move = (i: number, dir: -1 | 1) =>
    setCfg(prev => {
      if (!prev) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.items.length) return prev;
      const items = [...prev.items];
      [items[i], items[j]] = [items[j], items[i]];
      return { ...prev, items };
    });

  const addItem = (cat: Category) =>
    setCfg(prev => (prev && prev.items.length < SHOWCASE_MAX_ITEMS ? { ...prev, items: [...prev.items, { category_id: cat.id, title: "", image: "", href: "" }] } : prev));

  const addAll = () =>
    setCfg(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      for (const c of cats) {
        if (items.length >= SHOWCASE_MAX_ITEMS) break;
        if (!items.some(i => i.category_id === c.id)) items.push({ category_id: c.id, title: "", image: "", href: "" });
      }
      return { ...prev, items };
    });

  const removeItem = (i: number) =>
    setCfg(prev => (prev ? { ...prev, items: prev.items.filter((_, j) => j !== i) } : prev));

  async function handleSave() {
    if (!cfg) return;
    setSaving(true); setSaved(false); setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [CATEGORY_SHOWCASE_SETTING_KEY]: serializeCategoryShowcase(cfg) }),
      });
      const d = await res.json();
      if (d.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError(d.message || "خطا در ذخیره");
    } catch { setError("خطا در ارتباط با سرور"); }
    setSaving(false);
  }

  return (
    <div style={{ ...cardStyle, marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ImageIcon size={18} color="#d4af37" />
          <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: 600, margin: 0 }}>ویترین دسته‌بندی (تصاویر بزرگ صفحه اصلی)</h3>
        </div>
        <span style={{ color: "#666", fontSize: "11px" }}>{cfg.items.length} از {SHOWCASE_MAX_ITEMS} کاشی</span>
      </div>
      <p style={{ color: "#666", fontSize: "12px", marginBottom: "18px" }}>
        اندازه گرید، عرض/ارتفاع کاشی‌ها و خود کاشی‌ها را از اینجا تغییر دهید. لیست خالی = نمایش همه دسته‌بندی‌ها.
      </p>

      {saved && <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#10b981", fontSize: "13px" }}>✓ ویترین دسته‌بندی ذخیره شد</div>}
      {error && <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#ef4444", fontSize: "13px" }}>{error}</div>}

      {/* ── Layout settings ── */}
      <div style={{ marginBottom: "18px" }}>
        <label style={lab}>تعداد ستون گرید (اندازه گرید)</label>
        <div style={{ display: "flex", gap: "6px" }}>
          {Array.from({ length: SHOWCASE_COLUMNS_MAX - SHOWCASE_COLUMNS_MIN + 1 }, (_, k) => SHOWCASE_COLUMNS_MIN + k).map(n => (
            <button key={n} type="button" onClick={() => patch({ columns: n })}
              style={{
                width: 40, height: 34, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                backgroundColor: cfg.columns === n ? "#d4af37" : "#222",
                color: cfg.columns === n ? "#000" : "#aaa",
                border: cfg.columns === n ? "1px solid #d4af37" : "1px solid #333",
              }}>{n}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "14px" }}>
        <div>
          <label style={lab}>عرض کاشی (پیکسل) — ۰ = خودکار (پر کردن ستون)</label>
          <input type="number" min={0} max={800} value={cfg.item_width}
            onChange={e => patch({ item_width: Math.min(800, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
            style={{ ...inp, direction: "ltr" }} />
        </div>
        <div>
          <label style={lab}>ارتفاع کاشی (پیکسل)</label>
          <input type="number" min={120} max={1200} value={cfg.item_height}
            onChange={e => patch({ item_height: Math.min(1200, Math.max(120, parseInt(e.target.value, 10) || 520)) })}
            style={{ ...inp, direction: "ltr" }} />
        </div>
        <div>
          <label style={lab}>فاصله بین کاشی‌ها (پیکسل)</label>
          <input type="number" min={0} max={48} value={cfg.gap}
            onChange={e => patch({ gap: Math.min(48, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
            style={{ ...inp, direction: "ltr" }} />
        </div>
      </div>

      <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#ccc", fontSize: "13px", cursor: "pointer", marginBottom: "20px", userSelect: "none" }}>
        <input type="checkbox" checked={cfg.grayscale} onChange={e => patch({ grayscale: e.target.checked })} style={{ accentColor: "#d4af37", width: 16, height: 16 }} />
        تصاویر سیاه‌وسفید باشند (غیرفعال = رنگی)
      </label>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />

      {/* ── Tiles list ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {cfg.items.map((it, i) => {
          const cat = catById.get(it.category_id);
          const img = it.image || cat?.banner_image || cat?.image || null;
          return (
            <div key={it.category_id} style={{ backgroundColor: "#121212", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <span style={{ color: "#555", fontSize: "12px", width: "20px" }}>{i + 1}</span>
                <span style={{ color: "#fff", fontSize: "13px", fontWeight: 600, flex: 1 }}>{cat?.name ?? "دسته‌بندی حذف‌شده"}</span>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="بالا"
                  style={{ ...miniBtn, opacity: i === 0 ? 0.35 : 1 }}><ChevronUp size={15} /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === cfg.items.length - 1} title="پایین"
                  style={{ ...miniBtn, opacity: i === cfg.items.length - 1 ? 0.35 : 1 }}><ChevronDown size={15} /></button>
                <button type="button" onClick={() => removeItem(i)} title="حذف کاشی"
                  style={{ ...miniBtn, color: "#dc2626", borderColor: "#4a2020" }}><Trash2 size={15} /></button>
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {/* thumb + upload */}
                <div style={{ width: 110, flexShrink: 0 }}>
                  {img ? (
                    <div style={{ position: "relative" }}>
                      <img src={img} alt="" style={{ width: "110px", height: "82px", objectFit: "cover", borderRadius: "7px", border: "1px solid #333" }} />
                      {it.image && (
                        <button type="button" title="حذف تصویر اختصاصی"
                          onClick={() => patchItem(i, { image: "" })}
                          style={{ position: "absolute", top: "5px", right: "5px", backgroundColor: "rgba(239,68,68,0.9)", border: "none", borderRadius: "50%", width: "20px", height: "20px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ width: "110px", height: "82px", borderRadius: "7px", border: "1px dashed #444", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: "10px" }}>بدون تصویر</div>
                  )}
                  <button type="button" title="آپلود تصویر برای این کاشی"
                    onClick={() => { uploadingIdx.current = i; fileRef.current?.click(); }}
                    style={{ marginTop: "6px", width: "110px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "5px", backgroundColor: "#222", color: "#d4af37", border: "1px dashed #555", borderRadius: "6px", padding: "5px 0", fontSize: "11px", fontFamily: "inherit", cursor: "pointer" }}>
                    <Upload size={12} /> تصویر کاشی
                  </button>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={lab}>عنوان کاشی (خالی = نام دسته‌بندی) — پیشوند «مشاهده همه» خودکار اضافه می‌شود</label>
                  <input value={it.title} onChange={e => patchItem(i, { title: e.target.value })}
                    style={{ ...inp, direction: "rtl", marginBottom: "8px" }} placeholder={cat?.name ?? ""} />
                  <label style={lab}>لینک مقصد (خالی = محصولات همان دسته‌بندی)</label>
                  <input value={it.href} onChange={e => patchItem(i, { href: e.target.value })}
                    style={{ ...inp, direction: "ltr", marginBottom: "8px" }} placeholder={`/products?category=${it.category_id}`} />
                  <label style={lab}>URL تصویر (اختیاری — به جای تصویر دسته‌بندی)</label>
                  <input value={it.image} onChange={e => patchItem(i, { image: e.target.value })}
                    style={{ ...inp, direction: "ltr" }} placeholder="/uploads/....jpg" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add tiles picker ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", margin: "14px 0 4px" }}>
        <label style={{ color: "#888", fontSize: "12px" }}>افزودن کاشی:</label>
        {available.length > 0 && (
          <>
            <select value={addSel} onChange={e => setAddSel(e.target.value)}
              style={{ ...inp, width: "auto", minWidth: "180px", maxWidth: "280px", direction: "rtl" }}>
              <option value="">یک دسته‌بندی انتخاب کنید…</option>
              {available.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" disabled={!addSel || cfg.items.length >= SHOWCASE_MAX_ITEMS}
              onClick={() => {
                const cat = available.find(c => c.id === addSel);
                if (cat) { addItem(cat); setAddSel(""); }
              }}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                backgroundColor: "#222", color: "#d4af37", border: "1px dashed #555", borderRadius: "8px",
                padding: "9px 14px", fontSize: "12px", fontFamily: "inherit",
                cursor: !addSel || cfg.items.length >= SHOWCASE_MAX_ITEMS ? "not-allowed" : "pointer",
                opacity: !addSel || cfg.items.length >= SHOWCASE_MAX_ITEMS ? 0.5 : 1,
              }}>
              <Plus size={14} /> افزودن
            </button>
          </>
        )}
        {available.length > 0 && cfg.items.length < SHOWCASE_MAX_ITEMS && (
          <button type="button" onClick={addAll}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#222", color: "#ccc", border: "1px solid #333", borderRadius: "8px", padding: "9px 14px", fontSize: "12px", fontFamily: "inherit", cursor: "pointer" }}>
            <Plus size={14} /> افزودن همه دسته‌بندی‌ها
          </button>
        )}
        {cfg.items.length >= SHOWCASE_MAX_ITEMS && (
          <span style={{ color: "#666", fontSize: "11px" }}>حداکثر {SHOWCASE_MAX_ITEMS} کاشی مجاز است</span>
        )}
      </div>

      {/* ── Save ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
        <button type="button" onClick={() => setCfg({ ...DEFAULT_CATEGORY_SHOWCASE, items: [] })}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#222", color: "#ccc", border: "1px solid #333", borderRadius: "8px", padding: "9px 14px", fontSize: "12px", fontFamily: "inherit", cursor: "pointer" }}>
          <RefreshCw size={14} /> بازنشانی پیش‌فرض
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={handleSave} disabled={saving}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            backgroundColor: saving ? "#a08020" : saved ? "#2e7d32" : "#d4af37",
            color: "#000", border: "none", borderRadius: "8px",
            padding: "10px 22px", fontWeight: 700, fontSize: "13px",
            cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}>
          {saving ? <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
          {saving ? "در حال ذخیره..." : saved ? "ذخیره شد ✓" : "ذخیره ویترین دسته‌بندی"}
        </button>
      </div>
    </div>
  );
}

