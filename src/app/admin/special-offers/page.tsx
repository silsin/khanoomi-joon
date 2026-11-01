"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, X, Eye, EyeOff, Save } from "lucide-react";
import AdminGuard from "../AdminGuard";

interface Offer {
  id: string; product_id: string; discount_percent: number;
  sort_order: number; active: number;
  name: string; slug: string; price: number; stock: number; published: number;
  images: string;
}
interface PickerProduct { id: string; name: string; slug: string; published: number; stock: number; }

const inp: React.CSSProperties = {
  width: "100%", backgroundColor: "#121212", border: "1px solid #333",
  borderRadius: "6px", padding: "8px 12px", color: "#fff",
  fontSize: "13px", outline: "none", fontFamily: "inherit",
};

/** Local `datetime-local` value for the end of the current day. */
function endOfTodayLocal(): string {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AdminSpecialOffersPage() {
  const [offers, setOffers]       = useState<Offer[]>([]);
  const [products, setProducts]   = useState<PickerProduct[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [productId, setProductId] = useState("");
  const [discount, setDiscount]   = useState("5");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving]       = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [error, setError]         = useState("");

  // Section settings
  const [title, setTitle]         = useState("پیشنهاد شگفت انگیز");
  const [href, setHref]           = useState("/products");
  const [enabled, setEnabled]     = useState(true);
  const [endAt, setEndAt]         = useState("");
  const [savedSettings, setSavedSettings] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/admin/special-offers");
    const data = await res.json();
    if (data.success) {
      setOffers(data.data.offers);
      setProducts(data.data.products);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    fetch("/api/admin/settings").then(r => r.json()).then(d => {
      if (d.success) {
        if (d.data.special_offers_title) setTitle(d.data.special_offers_title);
        if (d.data.special_offers_href)  setHref(d.data.special_offers_href);
        setEnabled(d.data.special_offers_enabled !== "0");
        setEndAt(d.data.special_offers_end || endOfTodayLocal());
      }
    });
  }, [fetchAll]);

  async function saveSectionSettings() {
    await fetch("/api/admin/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        special_offers_title: title,
        special_offers_href: href,
        special_offers_enabled: enabled ? "1" : "0",
        special_offers_end: endAt,
      }),
    });
    setSavedSettings(true);
    setTimeout(() => setSavedSettings(false), 3000);
  }

  function openCreate() {
    setProductId(""); setDiscount("5"); setSortOrder("0");
    setError(""); setShowModal(true);
  }

  async function handleSave() {
    if (!productId) { setError("انتخاب محصول الزامی است"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/special-offers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, discount_percent: parseFloat(discount) || 0, sort_order: parseInt(sortOrder) || 0, active: 1 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "خطا"); return; }
      setShowModal(false);
      fetchAll();
    } catch { setError("خطای شبکه"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/special-offers/${id}`, { method: "DELETE" });
    setDeleteId(null);
    fetchAll();
  }

  async function toggleActive(o: Offer) {
    await fetch(`/api/admin/special-offers/${o.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: o.active === 1 ? 0 : 1 }),
    });
    fetchAll();
  }

  async function updateDiscount(o: Offer, val: string) {
    const v = parseFloat(val);
    if (Number.isNaN(v) || v < 0 || v > 90) return;
    await fetch(`/api/admin/special-offers/${o.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discount_percent: v }),
    });
    fetchAll();
  }

  const selectedProduct = products.find(p => p.id === productId);


  return (
    <AdminGuard>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: "700" }}>پیشنهاد شگفت انگیز</h2>
            <p style={{ color: "#666", fontSize: "12px", marginTop: "4px" }}>محصولات بخش تخفیف‌دار صفحه اصلی را مدیریت کنید</p>
          </div>
          <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#d4af37", color: "#000", border: "none", borderRadius: "6px", padding: "8px 16px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            <Plus size={16} /> پیشنهاد جدید
          </button>
        </div>

        {/* Section settings */}
        <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
          <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "700", marginBottom: "4px" }}>تنظیمات بخش</h3>
          <p style={{ color: "#666", fontSize: "12px", marginBottom: "16px" }}>عنوان، لینک «مشاهده همه» و روشن/خاموش بودن بخش</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: "11px", marginBottom: "6px" }}>عنوان بخش</label>
              <input value={title} onChange={e => setTitle(e.target.value)} style={{ ...inp, direction: "rtl" }} />
            </div>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: "11px", marginBottom: "6px" }}>لینک مشاهده همه</label>
              <input value={href} onChange={e => setHref(e.target.value)} style={{ ...inp, direction: "ltr" }} placeholder="/products" />
            </div>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: "11px", marginBottom: "6px" }}>پایان شمارش معکوس</label>
              <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} style={{ ...inp, direction: "ltr" }} />
              <p style={{ color: "#555", fontSize: "10px", marginTop: "4px" }}>خالی بماند = پایان امروز</p>
            </div>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: "11px", marginBottom: "6px" }}>وضعیت بخش</label>
              <button onClick={() => setEnabled(v => !v)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#121212", border: "1px solid #333", borderRadius: "6px", padding: "8px 12px", cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ color: enabled ? "#10b981" : "#666", fontSize: "12px", fontWeight: "700" }}>{enabled ? "فعال" : "غیرفعال"}</span>
                <span style={{ width: "36px", height: "20px", borderRadius: "10px", backgroundColor: enabled ? "#10b981" : "#333", position: "relative", transition: "background 0.2s" }}>
                  <span style={{ position: "absolute", top: "2px", right: enabled ? "2px" : "18px", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#fff", transition: "right 0.2s" }} />
                </span>
              </button>
            </div>
          </div>
          <button onClick={saveSectionSettings} style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            <Save size={15} /> ذخیره تنظیمات بخش
          </button>
          {savedSettings && <div style={{ marginTop: "12px", backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px 14px", color: "#10b981", fontSize: "13px" }}>✓ تنظیمات ذخیره شد</div>}
        </div>


        {loading ? (
          <p style={{ color: "#555" }}>در حال بارگذاری...</p>
        ) : offers.length === 0 ? (
          <div style={{ backgroundColor: "#1a1a1a", border: "2px dashed #2a2a2a", borderRadius: "12px", padding: "48px", textAlign: "center" }}>
            <p style={{ color: "#555", marginBottom: "16px" }}>هیچ محصولی به پیشنهادها اضافه نشده</p>
            <button onClick={openCreate} style={{ backgroundColor: "#d4af37", color: "#000", border: "none", borderRadius: "6px", padding: "8px 20px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
              اولین پیشنهاد را بسازید
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", overflow: "hidden" }}>
            {offers.map(o => (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: "1px solid #2a2a2a" }}>
                <img
                  src={(() => { try { const a = JSON.parse(o.images); return a[0] || "/file.svg"; } catch { return "/file.svg"; } })()}
                  alt={o.name}
                  style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", backgroundColor: "#121212", flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#fff", fontSize: "13px", fontWeight: "600", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.name}</p>
                  <p style={{ color: "#666", fontSize: "11px", margin: "2px 0 0" }}>
                    ترتیب: {o.sort_order} · {o.published ? "منتشر شده" : "پیش‌نویس"} {o.stock === 0 ? "· ناموجود" : ""}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  <input
                    type="number" min={0} max={90} defaultValue={o.discount_percent}
                    onBlur={e => { const v = parseFloat(e.target.value); if (v !== o.discount_percent) updateDiscount(o, e.target.value); }}
                    style={{ ...inp, width: "70px", textAlign: "center", padding: "6px 8px" }}
                    title="درصد تخفیف"
                  />
                  <span style={{ color: "#666", fontSize: "11px" }}>٪</span>
                  <button onClick={() => toggleActive(o)} title={o.active ? "غیرفعال کردن" : "فعال کردن"}
                    style={{ backgroundColor: "transparent", border: "1px solid #333", borderRadius: "6px", padding: "6px 8px", cursor: "pointer", color: o.active ? "#10b981" : "#666" }}>
                    {o.active ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button onClick={() => setDeleteId(o.id)}
                    style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: "6px", padding: "6px 8px", cursor: "pointer" }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}


        {/* Create modal */}
        {showModal && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
            <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "440px", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: "700", margin: 0 }}>پیشنهاد جدید</h3>
                <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: "4px" }}><X size={18} /></button>
              </div>

              <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>انتخاب محصول</label>
              <select value={productId} onChange={e => setProductId(e.target.value)}
                style={{ ...inp, marginBottom: "14px", backgroundColor: "#121212" }}>
                <option value="">— انتخاب کنید —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.published ? "" : "(پیش‌نویس)"}</option>
                ))}
              </select>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>درصد تخفیف</label>
                  <input type="number" min={0} max={90} value={discount} onChange={e => setDiscount(e.target.value)} style={{ ...inp }} />
                </div>
                <div>
                  <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>ترتیب نمایش</label>
                  <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ ...inp }} />
                </div>
              </div>

              {error && <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", color: "#ef4444", fontSize: "13px" }}>{error}</div>}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button onClick={() => setShowModal(false)} style={{ backgroundColor: "#2a2a2a", color: "#ccc", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>انصراف</button>
                <button onClick={handleSave} disabled={saving || !selectedProduct}
                  style={{ backgroundColor: saving || !selectedProduct ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: "700", cursor: saving || !selectedProduct ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {saving ? "در حال ذخیره..." : "افزودن پیشنهاد"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteId && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
            <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "360px", textAlign: "center" }}>
              <p style={{ color: "#fff", fontSize: "14px", marginBottom: "20px" }}>این پیشنهاد حذف شود؟</p>
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

