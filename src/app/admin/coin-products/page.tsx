"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, X, Pencil, Coins, RefreshCw } from "lucide-react";
import AdminGuard from "../AdminGuard";

/**
 * «سکه و آبشده» admin — a dedicated, simple add/edit form for coin/melted-gold
 * products (name, weight, karat, image, profit %, stock). Products live in the
 * main `products` table with coin=1, so they also show in the shop and in the
 * «سکه و آبشده» homepage section. Base price is computed from the live 18k
 * gold price (Ã— weight Ã— karat/18); the profit % is stored as the product's
 * اجرت override so storefront prices follow the usual calcFinalPrice logic.
 */

interface CoinProduct {
  id: string; name: string; slug: string; price: number; weight: number;
  karat: number; stock: number; images: string; coin: number;
  ajrat_override: number; ajrat_percent: number | null; ajrat_fixed: number | null;
}

const inp: React.CSSProperties = {
  width: "100%", backgroundColor: "#121212", border: "1px solid #333",
  borderRadius: "6px", padding: "8px 12px", color: "#fff",
  fontSize: "13px", outline: "none", fontFamily: "inherit",
};

function firstImg(images: string): string | null {
  try { const a = JSON.parse(images); return a[0] || null; } catch { return null; }
}
function fmt(n: number) { return Math.round(n).toLocaleString("en-US"); }

export default function AdminCoinProductsPage() {
  const [items, setItems]           = useState<CoinProduct[]>([]);
  const [loading, setLoading]       = useState(true);
  const [goldPrice, setGoldPrice]   = useState(0); // تومان per gram, 18k
  const [priceLoading, setPriceLoading] = useState(false);

  const [showModal, setShowModal]   = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [name, setName]             = useState("");
  const [weight, setWeight]         = useState("");
  const [karat, setKarat]           = useState("24");
  const [stock, setStock]           = useState("1");
  const [profit, setProfit]         = useState("2");
  const [image, setImage]           = useState("");
  const [uploading, setUploading]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/coin-products");
    const d = await res.json();
    if (d.success) setItems(d.data.products);
    setLoading(false);
  }, []);

  // `force` is passed by the refresh button so the operator gets a NEW reading
  // from the union (the default call stays on the fast cached path).
  const fetchPrice = useCallback(async (force = false) => {
    setPriceLoading(true);
    try {
      const r = await fetch(`/api/admin/gold-price${force ? "?refresh=1" : ""}`);
      const d = await r.json();
      if (d.success && d.data.price > 0) setGoldPrice(d.data.price);
    } catch { /* keep last known price */ }
    setPriceLoading(false);
  }, []);

  useEffect(() => { fetchAll(); fetchPrice(); }, [fetchAll, fetchPrice]);

  // Base price = live 18k gram price Ã— weight Ã— (karat / 18); final adds profit %.
  const w  = parseFloat(weight) || 0;
  const k  = parseInt(karat) || 18;
  const pf = parseFloat(profit) || 0;
  const basePrice  = goldPrice > 0 && w > 0 ? Math.round(goldPrice * w * (k / 18)) : 0;
  const finalPrice = Math.round(basePrice * (1 + pf / 100));

  function openCreate() {
    setEditId(null); setName(""); setWeight(""); setKarat("24");
    setStock("1"); setProfit("2"); setImage(""); setError("");
    setShowModal(true);
  }

  function openEdit(p: CoinProduct) {
    setEditId(p.id); setName(p.name); setWeight(String(p.weight));
    setKarat(String(p.karat)); setStock(String(p.stock));
    setProfit(p.ajrat_percent !== null ? String(p.ajrat_percent) : "0");
    setImage(firstImg(p.images) || ""); setError("");
    setShowModal(true);
  }

  async function uploadImage(file: File) {
    setUploading(true); setError("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (d.success) setImage(d.data.url);
      else setError(d.error || "خطا در آپلود تصویر");
    } catch { setError("خطا در آپلود تصویر"); }
    setUploading(false);
  }

  async function handleSave() {
    if (!name.trim()) { setError("نام محصول الزامی است"); return; }
    if (w <= 0) { setError("وزن نامعتبر است"); return; }
    if (basePrice <= 0) { setError("قیمت لحظه‌ای طلا در دسترس نیست — ابتدا «بروزرسانی قیمت» را بزنید"); return; }
    setSaving(true); setError("");
    try {
      const res = editId
        ? await fetch(`/api/products/${editId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(), price: basePrice, weight: w, karat: k,
              stock: parseInt(stock) || 0, images: image ? [image] : [],
              ajrat_override: true, ajrat_percent: pf, ajrat_fixed: 0, coin: true,
            }),
          })
        : await fetch("/api/admin/coin-products", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(), weight: w, karat: k,
              stock: parseInt(stock) || 0, image, price: basePrice, profit: pf,
            }),
          });
      const d = await res.json();
      if (d.success) { setShowModal(false); fetchAll(); }
      else setError(d.error || "خطا در ذخیره");
    } catch { setError("خطا در ذخیره"); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setDeleteId(null);
    fetchAll();
  }

  const th: React.CSSProperties = { padding: "10px 12px", color: "#888", fontSize: "12px", fontWeight: 600, textAlign: "right", borderBottom: "1px solid #2a2a2a", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "10px 12px", color: "#ddd", fontSize: "13px", borderBottom: "1px solid #222", whiteSpace: "nowrap" };

  return (
    <AdminGuard>
      <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Coins size={22} color="#d4af37" />
            <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}>سکه و آبشده</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 14px", color: "#d4af37", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              قیمت لحظه‌ای طلای ۱۸ عیار: {goldPrice > 0 ? `${fmt(goldPrice)} تومان` : "—"}
              <button onClick={() => fetchPrice(true)} title="دریافت نرخ جدید از اتحادیه"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#888", display: "flex", padding: 2 }}>
                <RefreshCw size={14} className={priceLoading ? "spin" : ""} />
              </button>
            </div>
            <button onClick={openCreate}
              style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "#d4af37", color: "#000", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              <Plus size={16} /> افزودن محصول
            </button>
          </div>
        </div>

        {/* Products table */}
        <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#888", fontSize: 13 }}>در حال بارگذاری...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#888", fontSize: 13 }}>هنوز محصولی اضافه نشده است</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>عکس</th>
                    <th style={th}>نام</th>
                    <th style={th}>وزن (گرم)</th>
                    <th style={th}>عیار</th>
                    <th style={th}>موجودی</th>
                    <th style={th}>قیمت پایه (تومان)</th>
                    <th style={th}>سود ٪</th>
                    <th style={th}>قیمت نهایی (تومان)</th>
                    <th style={th}>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(p => {
                    const img = firstImg(p.images);
                    const prof = p.ajrat_override === 1 && p.ajrat_percent !== null ? p.ajrat_percent : 0;
                    const finalP = Math.round(p.price * (1 + prof / 100));
                    return (
                      <tr key={p.id}>
                        <td style={td}>
                          {img
                            ? <img src={img} alt={p.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
                            : <div style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: "#222", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}><Coins size={16} /></div>}
                        </td>
                        <td style={{ ...td, fontWeight: 600, color: "#fff" }}>{p.name}</td>
                        <td style={td}>{p.weight}</td>
                        <td style={td}>{p.karat}</td>
                        <td style={{ ...td, color: p.stock > 0 ? "#4ade80" : "#ef4444" }}>{p.stock > 0 ? p.stock : "ناموجود"}</td>
                        <td style={td}>{fmt(p.price)}</td>
                        <td style={td}>{prof}٪</td>
                        <td style={{ ...td, color: "#d4af37", fontWeight: 700 }}>{fmt(finalP)}</td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => openEdit(p)} title="ویرایش"
                              style={{ background: "#2a2a2a", border: "none", borderRadius: 6, padding: 6, cursor: "pointer", color: "#d4af37", display: "flex" }}>
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setDeleteId(p.id)} title="حذف"
                              style={{ background: "#2a2a2a", border: "none", borderRadius: 6, padding: 6, cursor: "pointer", color: "#ef4444", display: "flex" }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>



        {/* Add / edit modal */}
        {showModal && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
            <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: 24, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>{editId ? "ویرایش محصول" : "افزودن سکه / آبشده"}</h3>
                <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 4 }}><X size={18} /></button>
              </div>

              <label style={{ display: "block", color: "#888", fontSize: 12, marginBottom: 6 }}>نام محصول</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً: سکه بهار آزادی تمام" style={{ ...inp, marginBottom: 14 }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", color: "#888", fontSize: 12, marginBottom: 6 }}>وزن (گرم)</label>
                  <input type="number" min={0} step="0.001" value={weight} onChange={e => setWeight(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", color: "#888", fontSize: 12, marginBottom: 6 }}>عیار</label>
                  <select value={karat} onChange={e => setKarat(e.target.value)} style={{ ...inp, backgroundColor: "#121212" }}>
                    <option value="18">۱۸ عیار</option>
                    <option value="21">۲۱ عیار</option>
                    <option value="22">۲۲ عیار</option>
                    <option value="24">۲۴ عیار</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", color: "#888", fontSize: 12, marginBottom: 6 }}>درصد سود</label>
                  <input type="number" min={0} step="0.1" value={profit} onChange={e => setProfit(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", color: "#888", fontSize: 12, marginBottom: 6 }}>موجودی</label>
                  <input type="number" min={0} value={stock} onChange={e => setStock(e.target.value)} style={inp} />
                </div>
              </div>

              <label style={{ display: "block", color: "#888", fontSize: 12, marginBottom: 6 }}>عکس</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                {image
                  ? <img src={image} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, border: "1px solid #333" }} />
                  : <div style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: "#121212", border: "1px dashed #333", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}><Coins size={18} /></div>}
                <label style={{ backgroundColor: "#2a2a2a", color: "#ccc", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer" }}>
                  {uploading ? "در حال آپلود..." : image ? "تغییر عکس" : "انتخاب عکس"}
                  <input type="file" accept="image/*" hidden disabled={uploading}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
                </label>
              </div>

              {/* Computed price preview */}
              <div style={{ backgroundColor: "#121212", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#888", lineHeight: 1.9 }}>
                {basePrice > 0 ? (
                  <>
                    قیمت پایه (طلا): <span style={{ color: "#ddd" }}>{fmt(basePrice)} تومان</span><br />
                    قیمت نهایی با {pf}٪ سود: <span style={{ color: "#d4af37", fontWeight: 700 }}>{fmt(finalPrice)} تومان</span>
                  </>
                ) : (
                  <>قیمت پس از وارد کردن وزن و دریافت قیمت لحظه‌ای محاسبه می‌شود.</>
                )}
              </div>

              {error && <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "10px 14px", marginBottom: 14, color: "#ef4444", fontSize: 13 }}>{error}</div>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setShowModal(false)}
                  style={{ backgroundColor: "#2a2a2a", color: "#ccc", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>انصراف</button>
                <button onClick={handleSave} disabled={saving}
                  style={{ backgroundColor: saving ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {saving ? "در حال ذخیره..." : editId ? "ذخیره تغییرات" : "افزودن محصول"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteId && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
            <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: 24, width: "100%", maxWidth: 360, textAlign: "center" }}>
              <p style={{ color: "#fff", fontSize: 14, marginBottom: 20 }}>این محصول حذف شود؟</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setDeleteId(null)} style={{ backgroundColor: "#2a2a2a", color: "#ccc", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>انصراف</button>
                <button onClick={() => handleDelete(deleteId)} style={{ backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>حذف</button>
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
      </div>
    </AdminGuard>
  );
}

