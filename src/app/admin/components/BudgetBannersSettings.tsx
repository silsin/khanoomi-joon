"use client";

import { useEffect, useState } from "react";
import { Save, RefreshCw, Plus, Trash2, ChevronUp, ChevronDown, LayoutGrid } from "lucide-react";
import {
  BUDGET_BANNERS_SETTING_KEY,
  DEFAULT_BUDGET_BANNERS,
  BUDGET_COLOR_PRESETS,
  BUDGET_MAX_ITEMS,
  parseBudgetBanners,
  serializeBudgetBanners,
  shadeColor,
  alphaColor,
  type BudgetBanner,
} from "@/lib/budget-banners";

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

/** Live mini preview of the storefront tile. */
function TilePreview({ b }: { b: BudgetBanner }) {
  const c = b.color;
  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #333", width: 150, flexShrink: 0, alignSelf: "flex-start" }}>
      <div style={{
        background: `linear-gradient(145deg, ${shadeColor(c, 14)} 0%, ${c} 40%, ${shadeColor(c, -22)} 100%)`,
        padding: "16px 8px 12px",
        textAlign: "center",
      }}>
        <span style={{
          fontSize: 22,
          fontWeight: 900,
          color: "#ffd700",
          textShadow: "0 2px 0 #b8921f, 0 4px 0 #987215, 0 4px 8px rgba(0,0,0,0.5)",
          direction: "ltr",
          display: "block",
        }}>
          {b.range || "—"}
        </span>
      </div>
      <div style={{
        backgroundColor: alphaColor(c, 0.1),
        borderTop: `1px solid ${alphaColor(c, 0.25)}`,
        padding: "6px 6px",
        textAlign: "center",
      }}>
        <span style={{ color: "#ddd", fontSize: 9, fontWeight: 700 }}>{b.label || "عنوان کاشی"}</span>
      </div>
    </div>
  );
}

/**
 * Admin editor for بنرهای بودجه — add / remove / rename / reorder the
 * homepage price-range tiles and set each tile's color (presets + custom hex).
 */
export default function BudgetBannersSettings() {
  const [items, setItems] = useState<BudgetBanner[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => setItems(
        d.success
          ? parseBudgetBanners(d.data?.[BUDGET_BANNERS_SETTING_KEY])
          : DEFAULT_BUDGET_BANNERS.map(b => ({ ...b })),
      ))
      .catch(() => setItems(DEFAULT_BUDGET_BANNERS.map(b => ({ ...b }))));
  }, []);

  const patch = (i: number, p: Partial<BudgetBanner>) =>
    setItems(prev => (prev ? prev.map((it, j) => (j === i ? { ...it, ...p } : it)) : prev));

  const move = (i: number, dir: -1 | 1) =>
    setItems(prev => {
      if (!prev) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const remove = (i: number) => setItems(prev => (prev ? prev.filter((_, j) => j !== i) : prev));

  const add = () =>
    setItems(prev =>
      prev && prev.length < BUDGET_MAX_ITEMS
        ? [...prev, { range: "0-1", label: "بازه جدید", href: "/products", color: "#c0392b" }]
        : prev,
    );

  async function handleSave() {
    if (!items) return;
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [BUDGET_BANNERS_SETTING_KEY]: serializeBudgetBanners(items) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (!items) {
    return (
      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <RefreshCw size={16} color="#d4af37" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ color: "#888", fontSize: "13px" }}>در حال بارگذاری بنرهای بودجه...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...cardStyle, marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <LayoutGrid size={18} color="#d4af37" />
          <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: 600, margin: 0 }}>بنرهای بودجه (بازه‌های قیمت)</h3>
        </div>
        <span style={{ color: "#666", fontSize: "11px" }}>{items.length} از {BUDGET_MAX_ITEMS} کاشی</span>
      </div>
      <p style={{ color: "#666", fontSize: "12px", marginBottom: "16px", lineHeight: 1.7 }}>
        کاشی‌های بازه قیمت در صفحه اصلی. «عدد» همان رقم بزرگ روی کاشی و «عنوان» متن زیر کاشی است. رنگ را از پالت انتخاب کنید یا رنگ دلخواه بزنید؛ لینک مقصد هر کاشی را هم می‌توانید عوض کنید.
      </p>

      {items.length === 0 && (
        <p style={{ color: "#888", fontSize: "12px", border: "1px dashed #444", borderRadius: 8, padding: "14px", textAlign: "center", marginBottom: "12px" }}>
          هیچ کاشی‌ای تنظیم نشده — با دکمه «افزودن بازه» شروع کنید. تا زمان افزودن، این بخش در صفحه اصلی نمایش داده نمی‌شود.
        </p>
      )}

      {items.map((b, i) => (
        <div key={i} style={{ border: "1px solid #2a2a2a", background: "#151515", borderRadius: 10, padding: "14px", marginBottom: "12px" }}>
          {/* Row: index + big number + actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{ color: "#d4af37", fontSize: "11px", fontWeight: 700 }}>#{i + 1}</span>
            <input
              value={b.range}
              onChange={e => patch(i, { range: e.target.value })}
              placeholder="عدد"
              title="عدد بزرگ روی کاشی (مثل +15)"
              style={{ ...inp, width: 90, textAlign: "center", direction: "ltr", fontWeight: 700 }}
            />
            <div style={{ flex: 1 }} />
            <button type="button" aria-label="انتقال به بالا" onClick={() => move(i, -1)} disabled={i === 0}
              style={{ ...miniBtn, opacity: i === 0 ? 0.35 : 1 }}><ChevronUp size={15} /></button>
            <button type="button" aria-label="انتقال به پایین" onClick={() => move(i, 1)} disabled={i === items.length - 1}
              style={{ ...miniBtn, opacity: i === items.length - 1 ? 0.35 : 1 }}><ChevronDown size={15} /></button>
            <button type="button" aria-label="حذف کاشی" onClick={() => remove(i)}
              style={{ ...miniBtn, color: "#dc2626", borderColor: "#4a2020" }}><Trash2 size={15} /></button>
          </div>

          {/* Preview + fields */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <TilePreview b={b} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={lab}>عنوان زیر کاشی</label>
              <input value={b.label} onChange={e => patch(i, { label: e.target.value })}
                style={{ ...inp, direction: "rtl", marginBottom: "8px" }} placeholder="از ۳ تا ۸ میلیون تومان" />

              <label style={lab}>لینک مقصد</label>
              <input value={b.href} onChange={e => patch(i, { href: e.target.value })}
                style={{ ...inp, direction: "ltr", marginBottom: "8px" }} placeholder="/products" />

              <label style={lab}>رنگ کاشی</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {BUDGET_COLOR_PRESETS.map(p => (
                  <button key={p.color} type="button" title={p.label} onClick={() => patch(i, { color: p.color })}
                    style={{
                      width: 24, height: 24, borderRadius: 6, background: p.color, cursor: "pointer", padding: 0,
                      border: b.color === p.color ? "2px solid #d4af37" : "1px solid #444",
                    }} />
                ))}
                <input
                  type="color"
                  title="رنگ دلخواه"
                  value={/^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : "#c0392b"}
                  onChange={e => patch(i, { color: e.target.value })}
                  style={{ width: 34, height: 26, padding: 0, border: "1px solid #444", borderRadius: 6, background: "none", cursor: "pointer" }}
                />
                <input value={b.color} onChange={e => patch(i, { color: e.target.value })}
                  style={{ ...inp, width: 92, direction: "ltr", fontFamily: "monospace" }} placeholder="#c0392b" />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Add + save */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
        <button type="button" onClick={add} disabled={items.length >= BUDGET_MAX_ITEMS}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            backgroundColor: "#222", color: "#d4af37", border: "1px dashed #555", borderRadius: "8px",
            padding: "9px 14px", fontSize: "12px", fontFamily: "inherit",
            cursor: items.length >= BUDGET_MAX_ITEMS ? "not-allowed" : "pointer",
            opacity: items.length >= BUDGET_MAX_ITEMS ? 0.5 : 1,
          }}>
          <Plus size={14} /> افزودن بازه
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
          {saving ? "در حال ذخیره..." : saved ? "ذخیره شد ✓" : "ذخیره بنرهای بودجه"}
        </button>
      </div>
    </div>
  );
}
