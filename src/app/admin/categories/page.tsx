"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Plus, Pencil, Trash2, X, Upload, ChevronRight, FolderPlus, CornerDownRight } from "lucide-react";
import AdminGuard from "../AdminGuard";

interface Category { id: string; name: string; slug: string; description: string | null; _count: { products: number }; banner_image?: string; image?: string; parent_id?: string | null; parent_name?: string | null; child_count?: number; }

const emptyForm = { name: "", slug: "", description: "", banner_image: "", parent_id: "" };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState({ ...emptyForm });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [collapsed, setCollapsed]   = useState<Set<string>>(new Set());
  const fileRef                     = useRef<HTMLInputElement>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/categories");
    const data = await res.json();
    if (data.success) setCategories(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  function openCreate(parentId = "") {
    setEditId(null);
    setForm({ ...emptyForm, parent_id: parentId });
    if (parentId) setCollapsed(prev => { const n = new Set(prev); n.delete(parentId); return n; });
    setError("");
    setShowModal(true);
  }

  /** «افزودن زیردسته» on any node — works at every level of the tree. */
  function openCreateChild(parent: Category) { openCreate(parent.id); }

  function openEdit(c: Category) {
    setEditId(c.id);
    setForm({ name: c.name, slug: c.slug, description: c.description || "", banner_image: c.banner_image || c.image || "", parent_id: c.parent_id || "" });
    setError(""); setShowModal(true);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) setForm(f => ({ ...f, banner_image: data.data.url }));
      else setError(data.error || "خطا در آپلود");
    } catch { setError("خطای شبکه در آپلود"); }
    finally { setUploading(false); }
  }

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const res = await fetch(editId ? `/api/categories/${editId}` : "/api/categories", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, image: form.banner_image }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "خطا"); return; }
      setShowModal(false); fetchCategories();
    } catch { setError("خطای شبکه"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    setDeleteId(null); fetchCategories();
  }

  const inp: React.CSSProperties = { width: "100%", backgroundColor: "#121212", border: "1px solid #333", borderRadius: "6px", padding: "8px 12px", color: "#fff", fontSize: "13px", outline: "none", fontFamily: "inherit" };

  /* ── Tree helpers: «منو / زیرمنو» at any depth ── */

  const toggleNode = (id: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Flatten the list into ordered rows, each with its depth + child count. */
  const rows = useMemo(() => {
    const childrenOf = new Map<string | null, Category[]>();
    for (const c of categories) {
      const key = c.parent_id ?? null;
      const arr = childrenOf.get(key);
      if (arr) arr.push(c);
      else childrenOf.set(key, [c]);
    }
    const out: { cat: Category; depth: number; kids: number }[] = [];
    const walk = (parent: string | null, depth: number, guard: number) => {
      if (guard > 12) return;
      for (const cat of childrenOf.get(parent) ?? []) {
        const kids = childrenOf.get(cat.id)?.length ?? 0;
        out.push({ cat, depth, kids });
        if (kids && !collapsed.has(cat.id)) walk(cat.id, depth + 1, guard + 1);
      }
    };
    walk(null, 0, 0);
    // Orphaned rows (parent gone) still need to be visible and editable
    for (const c of categories) {
      if (c.parent_id && !categories.some(x => x.id === c.parent_id)) {
        out.push({ cat: c, depth: 0, kids: 0 });
      }
    }
    return out;
  }, [categories, collapsed]);

  const rootCount = categories.filter(c => !c.parent_id || !categories.some(x => x.id === c.parent_id)).length;
  const childCount = categories.length - rootCount;

  /** A category can't be moved under itself or under one of its descendants. */
  const blockedParents = useMemo(() => {
    const out = new Set<string>();
    if (editId) {
      out.add(editId);
      let grew = true;
      while (grew) {
        grew = false;
        for (const c of categories) {
          if (c.parent_id && out.has(c.parent_id) && !out.has(c.id)) { out.add(c.id); grew = true; }
        }
      }
    }
    return out;
  }, [editId, categories]);

  const parentOptions = rows.filter(r => !blockedParents.has(r.cat.id));

  return (
    <AdminGuard>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: "700" }}>مدیریت دسته‌بندی‌ها</h2>
          <button onClick={() => openCreate()} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#d4af37", color: "#000", border: "none", borderRadius: "6px", padding: "8px 16px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            <Plus size={16}/> افزودن دسته‌بندی
          </button>
        </div>

        {/* «منو و زیرمنو» tree manager */}
        <div style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 10px" }}>
            <p style={{ color: "#888", fontSize: "12px", margin: 0 }}>
              {rootCount.toLocaleString("fa-IR")} دسته اصلی
              {childCount > 0 && ` · ${childCount.toLocaleString("fa-IR")} زیردسته`}
            </p>
            {rows.length > 0 && (
              <button
                onClick={() => setCollapsed(collapsed.size ? new Set() : new Set(rows.filter(r => r.kids > 0).map(r => r.cat.id)))}
                style={{ background: "none", border: "1px solid #333", color: "#888", borderRadius: "6px", padding: "5px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}
              >
                {collapsed.size ? "باز کردن همه" : "بستن همه"}
              </button>
            )}
          </div>

          {loading ? <p style={{ color: "#555", padding: "8px" }}>در حال بارگذاری...</p>
            : rows.length === 0 ? <p style={{ color: "#555", padding: "8px" }}>دسته‌بندی‌ای ثبت نشده</p>
            : rows.map(({ cat, depth, kids }) => {
                const img = cat.banner_image || cat.image;
                const btn = (bg: string, border: string, color: string, title: string, onClick: () => void, node: React.ReactNode) => (
                  <button onClick={onClick} title={title} style={{ backgroundColor: bg, border: `1px solid ${border}`, color, borderRadius: "6px", padding: "6px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: "11px", fontFamily: "inherit" }}>{node}</button>
                );
                return (
                  <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", paddingRight: depth * 24, position: "relative" }}>
                    {depth > 0 && <span style={{ position: "absolute", right: depth * 24 - 13, top: 0, bottom: 0, borderRight: "1px dashed #3a3a3a" }} />}
                    {kids > 0 ? (
                      <button onClick={() => toggleNode(cat.id)} aria-label="باز/بسته" style={{ width: 24, height: 24, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid #333", background: "#1a1a1a", color: "#d4af37", borderRadius: "6px", cursor: "pointer" }}>
                        <ChevronRight size={14} style={{ transform: collapsed.has(cat.id) ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
                      </button>
                    ) : (
                      <span style={{ width: 24, flexShrink: 0, display: "inline-flex", justifyContent: "center", color: "#444" }} />
                    )}

                    {img
                      ? <div style={{ width: 40, height: 40, borderRadius: "8px", backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0, border: "1px solid #2a2a2a" }} />
                      : <div style={{ width: 40, height: 40, borderRadius: "8px", backgroundColor: "#1f1f1f", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: "11px" }}>{depth > 0 ? <CornerDownRight size={14} /> : "—"}</div>}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "#fff", fontSize: "14px", fontWeight: depth === 0 ? 700 : 500, margin: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {cat.name}
                        {depth > 0 && <span style={{ color: "#d4af37", fontSize: "10px", border: "1px solid rgba(212,175,55,0.35)", borderRadius: "10px", padding: "1px 7px" }}>سطح {depth + 1}</span>}
                      </p>
                      <p style={{ color: "#666", fontSize: "11px", margin: "3px 0 0", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ direction: "ltr" }}>/{cat.slug}</span>
                        <span>{cat._count.products.toLocaleString("fa-IR")} محصول</span>
                        {kids > 0 && <span>{kids.toLocaleString("fa-IR")} زیردسته</span>}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      {btn("rgba(34,197,94,0.1)", "rgba(34,197,94,0.35)", "#4ade80", "افزودن زیردسته", () => openCreateChild(cat), <><FolderPlus size={13} /> زیردسته</>)}
                      {btn("rgba(212,175,55,0.1)", "rgba(212,175,55,0.3)", "#d4af37", "ویرایش", () => openEdit(cat), <Pencil size={13} />)}
                      {btn("rgba(239,68,68,0.1)", "rgba(239,68,68,0.3)", "#ef4444", "حذف", () => setDeleteId(cat.id), <Trash2 size={13} />)}
                    </div>
                  </div>
                );
              })}
        </div>

        {showModal && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
            <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", width: "100%", maxWidth: "480px" }}>
              <div style={{ padding: "18px 22px", borderBottom: "1px solid #2a2a2a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>{editId ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی"}</h3>
                <button onClick={() => setShowModal(false)} style={{ color: "#888", background: "none", border: "none", cursor: "pointer" }}><X size={18}/></button>
              </div>
              <div style={{ padding: "22px" }}>
                {error && <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "10px", marginBottom: "14px", color: "#f87171", fontSize: "13px" }}>{error}</div>}

                {/* Image upload */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "7px" }}>تصویر دسته‌بندی</label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} style={{ display: "none" }} />
                  {form.banner_image ? (
                    <div style={{ position: "relative", marginBottom: "8px" }}>
                      <img src={form.banner_image} alt="" style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "7px", border: "1px solid #333" }} />
                      <button onClick={() => setForm(f => ({ ...f, banner_image: "" }))}
                        style={{ position: "absolute", top: "6px", right: "6px", backgroundColor: "rgba(239,68,68,0.9)", border: "none", borderRadius: "50%", width: "22px", height: "22px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={12}/>
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      style={{ width: "100%", height: "80px", backgroundColor: "#121212", border: "2px dashed #333", borderRadius: "7px", color: "#666", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit" }}>
                      <Upload size={18} color="#555"/>
                      <span style={{ fontSize: "12px" }}>{uploading ? "در حال آپلود..." : "آپلود تصویر دسته‌بندی"}</span>
                    </button>
                  )}
                  <input style={{ ...inp, marginTop: "6px" }} placeholder="یا URL تصویر را وارد کنید"
                    value={form.banner_image} onChange={e => setForm(f => ({ ...f, banner_image: e.target.value }))} />
                </div>

                {[{ k: "name", l: "نام" }, { k: "slug", l: "اسلاگ" }, { k: "description", l: "توضیحات" }].map(f => (
                  <div key={f.k} style={{ marginBottom: "14px" }}>
                    <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "5px" }}>{f.l}</label>
                    <input value={(form as Record<string, string>)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                      style={{ ...inp, direction: f.k === "slug" ? "ltr" : "rtl" }} />
                  </div>
                ))}

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "5px" }}>
                    دسته‌بندی مادر <span style={{ color: "#555" }}>— خالی یعنی دسته اصلی</span>
                  </label>
                  <select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                    <option value="">— بدون دسته مادر (سطح اول) —</option>
                    {parentOptions.map(r => (
                      <option key={r.cat.id} value={r.cat.id}>
                        {"　".repeat(r.depth) + (r.depth > 0 ? "└ " : "")}{r.cat.name}
                      </option>
                    ))}
                  </select>
                  <p style={{ color: "#555", fontSize: "11px", margin: "6px 0 0", lineHeight: 1.8 }}>
                    هر زیردسته خودش می‌تواند زیردسته داشته باشد (بدون محدودیت سطح). در صفحه محصولات، زیردسته‌ها زیر هم درختی نمایش داده می‌شوند و با انتخاب دسته مادر، محصولات همه زیردسته‌ها هم نمایش داده می‌شود.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={handleSave} disabled={saving || uploading}
                    style={{ flex: 1, backgroundColor: saving ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "6px", padding: "10px", fontWeight: "700", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    {saving ? "در حال ذخیره..." : "ذخیره"}
                  </button>
                  <button onClick={() => setShowModal(false)} style={{ flex: 1, backgroundColor: "transparent", color: "#888", border: "1px solid #333", borderRadius: "6px", padding: "10px", cursor: "pointer", fontFamily: "inherit" }}>انصراف</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteId && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "24px", maxWidth: "320px", textAlign: "center" }}>
              <Trash2 size={28} color="#ef4444" style={{ margin: "0 auto 12px" }} />
              <p style={{ color: "#fff", marginBottom: "8px" }}>حذف دسته‌بندی؟</p>
              <p style={{ color: "#888", fontSize: "12px", marginBottom: "20px", lineHeight: 1.8 }}>
                محصولات مرتبط بدون دسته‌بندی می‌مانند.
                {categories.find(c => c.id === deleteId)?.child_count
                  ? " زیردسته‌های این دسته یک سطح بالاتر منتقل می‌شوند و حذف نمی‌شوند."
                  : ""}
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", padding: "10px", cursor: "pointer", fontFamily: "inherit" }}>حذف</button>
                <button onClick={() => setDeleteId(null)} style={{ flex: 1, backgroundColor: "transparent", color: "#888", border: "1px solid #333", borderRadius: "6px", padding: "10px", cursor: "pointer", fontFamily: "inherit" }}>انصراف</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
