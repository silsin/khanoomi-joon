"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Trash2, X, Eye, EyeOff, Upload, Pencil } from "lucide-react";
import AdminGuard from "../AdminGuard";

interface Banner {
  id: string; title: string; sub: string; href: string; image: string;
  theme: "dark" | "light"; sort_order: number; active: number;
}

const inp: React.CSSProperties = {
  width: "100%", backgroundColor: "#121212", border: "1px solid #333",
  borderRadius: "6px", padding: "8px 12px", color: "#fff",
  fontSize: "13px", outline: "none", fontFamily: "inherit",
};

const emptyForm = { title: "", sub: "", href: "/products", image: "", theme: "dark" as "dark" | "light", sort_order: "0", active: true };

export default function AdminPromoBannersPage() {
  const [banners, setBanners]     = useState<Banner[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ ...emptyForm });
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [error, setError]         = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/admin/promo-banners");
    const data = await res.json();
    if (data.success) setBanners(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openCreate() {
    setEditId(null);
    setForm({ ...emptyForm });
    setError(""); setShowModal(true);
  }

  function openEdit(b: Banner) {
    setEditId(b.id);
    setForm({ title: b.title, sub: b.sub, href: b.href, image: b.image, theme: b.theme, sort_order: String(b.sort_order), active: !!b.active });
    setError(""); setShowModal(true);
  }

  async function uploadImage(f: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const d = await res.json();
    if (d.success) setForm(prev => ({ ...prev, image: d.data.url }));
    setUploading(false);
  }

  async function handleSave() {
    if (!form.title.trim()) { setError("عنوان بنر الزامی است"); return; }
    setSaving(true); setError("");
    const payload = { ...form, sort_order: parseInt(form.sort_order) || 0 };
    const res = await fetch(editId ? `/api/admin/promo-banners/${editId}` : "/api/admin/promo-banners", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    setSaving(false);
    if (!d.success) { setError(d.error || "خطا در ذخیره"); return; }
    setShowModal(false);
    fetchAll();
  }

  async function toggleActive(b: Banner) {
    await fetch(`/api/admin/promo-banners/${b.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    fetchAll();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/promo-banners/${id}`, { method: "DELETE" });
    setDeleteId(null);
    fetchAll();
  }

  const actionBtn: React.CSSProperties = { background: "none", border: "1px solid #333", borderRadius: "6px", padding: "7px", cursor: "pointer", display: "flex" };


  return (
    <AdminGuard>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
          <div>
            <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: "700" }}>بنرهای تبلیغاتی</h2>
            <p style={{ color: "#666", fontSize: "12px", marginTop: "4px", lineHeight: 1.6 }}>
              کارت‌های بخش تبلیغات صفحه اصلی (تخفیف‌های دلی‌گلد، طلای کم اُجرت و ...) را اینجا مدیریت کنید. بنر غیرفعال در سایت نمایش داده نمی‌شود.
            </p>
          </div>
          <button onClick={openCreate}
            style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "10px 18px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
            <Plus size={16} /> افزودن بنر
          </button>
        </div>

        {/* List */}
        {loading ? (
          <p style={{ color: "#666", fontSize: "13px" }}>در حال بارگذاری...</p>
        ) : banners.length === 0 ? (
          <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "40px", textAlign: "center", color: "#666", fontSize: "13px" }}>
            هنوز بنری ثبت نشده است. با دکمه «افزودن بنر» اولین بنر را بسازید.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {banners.map(b => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "12px 16px", opacity: b.active ? 1 : 0.55 }}>
                <div style={{ width: "110px", height: "62px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, backgroundColor: b.theme === "dark" ? "#111" : "#f5f0e8", border: "1px solid #333" }}>
                  {b.image && <img src={b.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ flex: 1, minWidth: "160px" }}>
                  <p style={{ color: "#fff", fontSize: "14px", fontWeight: "700" }}>{b.title}</p>
                  <p style={{ color: "#777", fontSize: "12px", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.sub}</p>
                  <p style={{ color: "#555", fontSize: "11px", marginTop: "3px", direction: "ltr", textAlign: "left" }}>{b.href}</p>
                </div>
                <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", backgroundColor: b.theme === "dark" ? "#111" : "#f5f0e8", color: b.theme === "dark" ? "#d4af37" : "#333", border: "1px solid #333", flexShrink: 0 }}>
                  {b.theme === "dark" ? "تیره" : "روشن"}
                </span>
                <span style={{ color: "#666", fontSize: "12px", flexShrink: 0, minWidth: "60px", textAlign: "center" }}>ترتیب: {b.sort_order}</span>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button onClick={() => toggleActive(b)} title={b.active ? "مخفی کردن" : "نمایش"}
                    style={{ ...actionBtn, color: b.active ? "#10b981" : "#666" }}>
                    {b.active ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button onClick={() => openEdit(b)} title="ویرایش" style={{ ...actionBtn, color: "#d4af37" }}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setDeleteId(b.id)} title="حذف" style={{ ...actionBtn, color: "#ef4444" }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit modal */}
        {showModal && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px", overflowY: "auto" }}>
            <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "520px", margin: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "700" }}>{editId ? "ویرایش بنر" : "افزودن بنر جدید"}</h3>
                <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: "4px" }}><X size={18} /></button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>عنوان *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ ...inp, direction: "rtl" }} placeholder="مثلاً: تخفیف‌های دلی‌گلد" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>زیرعنوان</label>
                  <input value={form.sub} onChange={e => setForm(f => ({ ...f, sub: e.target.value }))} style={{ ...inp, direction: "rtl" }} placeholder="مثلاً: محصولات تخفیف‌دار" />
                </div>
                <div>
                  <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>لینک</label>
                  <input value={form.href} onChange={e => setForm(f => ({ ...f, href: e.target.value }))} style={inp} placeholder="/products" />
                </div>
                <div>
                  <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>تم</label>
                  <select value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value as "dark" | "light" }))} style={{ ...inp, backgroundColor: "#121212" }}>
                    <option value="dark">تیره</option>
                    <option value="light">روشن</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>ترتیب نمایش</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} style={inp} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "4px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ccc", fontSize: "13px", cursor: "pointer" }}>
                    <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ accentColor: "#d4af37", width: "16px", height: "16px" }} />
                    فعال (نمایش در سایت)
                  </label>
                </div>
              </div>



              <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>تصویر بنر</label>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
              {form.image ? (
                <div style={{ position: "relative", marginBottom: "6px" }}>
                  <img src={form.image} alt="" style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "6px", border: "1px solid #333", display: "block" }} />
                  <button onClick={() => setForm(f => ({ ...f, image: "" }))}
                    style={{ position: "absolute", top: "6px", right: "6px", backgroundColor: "rgba(239,68,68,0.9)", border: "none", borderRadius: "50%", width: "22px", height: "22px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={12} />
                  </button>
                  <button onClick={() => fileRef.current?.click()}
                    style={{ position: "absolute", bottom: "6px", left: "6px", backgroundColor: "rgba(0,0,0,0.7)", color: "#fff", border: "none", borderRadius: "5px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                    تغییر تصویر
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  style={{ width: "100%", height: "70px", backgroundColor: "#121212", border: "2px dashed #333", borderRadius: "8px", color: "#666", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", fontSize: "12px", marginBottom: "6px" }}>
                  <Upload size={16} color="#555" />
                  {uploading ? "در حال آپلود..." : "آپلود تصویر"}
                </button>
              )}
              <input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                style={{ ...inp, fontSize: "12px", padding: "7px 10px", marginBottom: "14px" }} placeholder="یا آدرس URL تصویر را وارد کنید" />

              {error && <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#ef4444", fontSize: "13px" }}>{error}</div>}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button onClick={() => setShowModal(false)} style={{ backgroundColor: "#2a2a2a", color: "#ccc", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>انصراف</button>
                <button onClick={handleSave} disabled={saving}
                  style={{ backgroundColor: saving ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: "700", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {saving ? "در حال ذخیره..." : editId ? "ذخیره تغییرات" : "افزودن بنر"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteId && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
            <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "360px", textAlign: "center" }}>
              <p style={{ color: "#fff", fontSize: "14px", marginBottom: "20px" }}>این بنر حذف شود؟</p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button onClick={() => setDeleteId(null)} style={{ backgroundColor: "#2a2a2a", color: "#ccc", border: "none", borderRadius: "8px", padding: "9px 20px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>انصراف</button>
                <button onClick={() => handleDelete(deleteId)} style={{ backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 20px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>حذف</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
