"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { GripVertical, ChevronUp, ChevronDown, Save, RotateCcw, RefreshCw } from "lucide-react";
import AdminGuard from "../AdminGuard";
import {
  HOME_SECTIONS,
  HOME_SECTIONS_SETTING_KEY,
  DEFAULT_HOME_SECTION_ORDER,
  parseHomeSectionOrder,
} from "@/lib/home-sections";

const LABELS: Record<string, string> = Object.fromEntries(HOME_SECTIONS.map(s => [s.key, s.label]));

export default function AdminSectionsPage() {
  const [order, setOrder]         = useState<string[] | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(d => {
      setOrder(parseHomeSectionOrder(d.success ? d.data?.[HOME_SECTIONS_SETTING_KEY] : null));
    }).catch(() => setOrder([...DEFAULT_HOME_SECTION_ORDER]));
  }, []);

  const move = useCallback((from: number, to: number) => {
    setOrder(prev => {
      if (!prev) return prev;
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  function handleDrop(target: number) {
    if (dragIndex !== null && dragIndex !== target) move(dragIndex, target);
    setDragIndex(null);
    setOverIndex(null);
  }

  async function handleSave() {
    if (!order) return;
    setSaving(true); setSaved(false); setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [HOME_SECTIONS_SETTING_KEY]: JSON.stringify(order) }),
      });
      const d = await res.json();
      if (d.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError(d.message || "خطا در ذخیره");
    } catch { setError("خطا در ارتباط با سرور"); }
    setSaving(false);
  }

  const isDefault = order !== null && JSON.stringify(order) === JSON.stringify(DEFAULT_HOME_SECTION_ORDER);


  return (
    <AdminGuard>
      <div style={{ padding: "24px", maxWidth: "640px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "12px" }}>
          <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: "700" }}>چیدمان صفحه اصلی</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setOrder([...DEFAULT_HOME_SECTION_ORDER])} disabled={!order || isDefault}
              style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#2a2a2a", color: !order || isDefault ? "#555" : "#ccc", border: "none", borderRadius: "8px", padding: "9px 16px", fontWeight: "600", cursor: !order || isDefault ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: "13px" }}>
              <RotateCcw size={15} /> بازنشانی پیش‌فرض
            </button>
            <button onClick={handleSave} disabled={saving || !order}
              style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: saving || !order ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "9px 20px", fontWeight: "700", cursor: saving || !order ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: "13px" }}>
              {saving ? <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
              {saving ? "در حال ذخیره..." : "ذخیره چیدمان"}
            </button>
          </div>
        </div>
        <p style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}>
          بخش‌های صفحه اصلی را با کشیدن و رها کردن یا دکمه‌های بالا/پایین جابجا کنید. سربرگ و پاصفحه ثابت هستند.
        </p>

        {saved && <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#10b981", fontSize: "13px" }}>✓ چیدمان ذخیره شد</div>}
        {error && <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#ef4444", fontSize: "13px" }}>{error}</div>}

        {!order ? (
          <div style={{ color: "#888", fontSize: "14px", textAlign: "center", padding: "40px 0" }}>در حال بارگذاری...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {order.map((key, i) => {
              const dragging = dragIndex === i;
              const over = overIndex === i && dragIndex !== null && dragIndex !== i;
              return (
                <div key={key}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={e => { e.preventDefault(); setOverIndex(i); }}
                  onDragLeave={() => setOverIndex(prev => (prev === i ? null : prev))}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    backgroundColor: dragging ? "#242412" : "#1a1a1a",
                    border: `1px solid ${over ? "#d4af37" : "#2a2a2a"}`,
                    borderRadius: "10px", padding: "12px 14px",
                    opacity: dragging ? 0.6 : 1,
                    cursor: "grab", transition: "border-color 0.15s",
                  }}>
                  <GripVertical size={18} color="#555" style={{ flexShrink: 0 }} />
                  <span style={{ color: "#555", fontSize: "12px", width: "20px", textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ color: "#fff", fontSize: "14px", fontWeight: "600", flex: 1 }}>{LABELS[key] ?? key}</span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button onClick={() => move(i, i - 1)} disabled={i === 0} title="بالا"
                      style={{ backgroundColor: "#121212", border: "1px solid #333", borderRadius: "6px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: i === 0 ? "not-allowed" : "pointer", opacity: i === 0 ? 0.4 : 1 }}>
                      <ChevronUp size={16} color="#d4af37" />
                    </button>
                    <button onClick={() => move(i, i + 1)} disabled={i === order.length - 1} title="پایین"
                      style={{ backgroundColor: "#121212", border: "1px solid #333", borderRadius: "6px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: i === order.length - 1 ? "not-allowed" : "pointer", opacity: i === order.length - 1 ? 0.4 : 1 }}>
                      <ChevronDown size={16} color="#d4af37" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
