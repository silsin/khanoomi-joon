"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, RefreshCw, Plus, Trash2, Gift } from "lucide-react";
import {
  PRODUCT_PAGE_SETTING_KEY,
  parseProductPageSettings,
  serializeProductPageSettings,
  type ProductPageSettings,
} from "@/lib/product-page-settings";

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
  direction: "rtl",
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

/** Editable list of short labels (gift packs / postcards) with add/remove. */
function LabelListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (list: string[]) => void;
  placeholder: string;
}) {
  return (
    <>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
          <input
            value={item}
            onChange={e => {
              const list = [...items];
              list[i] = e.target.value;
              onChange(list);
            }}
            style={inp}
            placeholder={placeholder}
          />
          <button
            type="button"
            title="حذف"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px", flexShrink: 0 }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} style={addBtn}>
        <Plus size={13} />
        افزودن
      </button>
    </>
  );
}

export default function ProductPageSettings() {
  const [settings, setSettings] = useState<ProductPageSettings>(() =>
    parseProductPageSettings(null)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(parseProductPageSettings(data.data[PRODUCT_PAGE_SETTING_KEY]));
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function patch(partial: Partial<ProductPageSettings>) {
    setSettings(prev => ({ ...prev, ...partial }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [PRODUCT_PAGE_SETTING_KEY]: serializeProductPageSettings(settings) }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div id="product-page-settings" style={{ ...cardStyle, marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <Gift size={16} color="#d4af37" />
        <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>صفحه محصول</h3>
      </div>
      <p style={{ color: "#666", fontSize: "12px", marginBottom: "16px", lineHeight: 1.6 }}>
        گزینه‌های هدیه بالای دکمه خرید، سطر «بسته بندی» جدول مشخصات و آکاردئون سؤالات متداول در صفحه محصول.
      </p>

      {loading ? (
        <p style={{ color: "#555", fontSize: "13px" }}>در حال بارگذاری...</p>
      ) : (
        <>
          <p style={sectionTitle}>پک‌های هدیه (اولی به‌صورت پیش‌فرض انتخاب می‌شود)</p>
          <LabelListEditor
            items={settings.packs}
            onChange={packs => patch({ packs })}
            placeholder="نام پک"
          />

          <p style={sectionTitle}>پست‌کارت‌های رایگان</p>
          <LabelListEditor
            items={settings.postcards}
            onChange={postcards => patch({ postcards })}
            placeholder="مناسبت پست‌کارت"
          />
          <p style={{ color: "#555", fontSize: "11px", marginTop: "-8px", marginBottom: "16px" }}>
            گزینه «نمی‌خواهم» به‌صورت خودکار در صفحه محصول اضافه می‌شود و نیازی به ثبت آن نیست.
          </p>


          <p style={sectionTitle}>سطر «بسته بندی» جدول مشخصات</p>
          <input
            value={settings.packaging}
            onChange={e => patch({ packaging: e.target.value })}
            style={{ ...inp, direction: "rtl", marginBottom: "16px" }}
            placeholder="متن بسته‌بندی"
          />

          <p style={sectionTitle}>سؤالات متداول (آکاردئون زیر نظرات)</p>
          {settings.faq.map((item, i) => (
            <div
              key={i}
              style={{ padding: "10px", backgroundColor: "#121212", borderRadius: "8px", border: "1px solid #2a2a2a", marginBottom: "8px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#666", fontSize: "10px" }}>سؤال {i + 1}</span>
                <button
                  type="button"
                  title="حذف"
                  onClick={() => patch({ faq: settings.faq.filter((_, idx) => idx !== i) })}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <input
                value={item.q}
                onChange={e => {
                  const faq = [...settings.faq];
                  faq[i] = { ...faq[i], q: e.target.value };
                  patch({ faq });
                }}
                style={{ ...inp, marginBottom: "6px", direction: "rtl" }}
                placeholder="سؤال"
              />
              <textarea
                value={item.a}
                onChange={e => {
                  const faq = [...settings.faq];
                  faq[i] = { ...faq[i], a: e.target.value };
                  patch({ faq });
                }}
                rows={3}
                style={{ ...inp, direction: "rtl", resize: "vertical" }}
                placeholder="پاسخ"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => patch({ faq: [...settings.faq, { q: "", a: "" }] })}
            style={addBtn}
          >
            <Plus size={13} />
            افزودن سؤال
          </button>

          {saved && (
            <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#10b981", fontSize: "13px" }}>
              ✓ تنظیمات صفحه محصول ذخیره شد
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: saving ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "11px 24px", fontWeight: "700", fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {saving ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
            {saving ? "در حال ذخیره..." : "ذخیره تنظیمات صفحه محصول"}
          </button>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

