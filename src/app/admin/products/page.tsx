"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Pencil, Trash2, Search, X, Info, Upload, Sparkles, Lock } from "lucide-react";
import { calcFinalPrice } from "@/lib/pricing";
import AdminGuard from "../AdminGuard";

interface Category { id: string; name: string; }
interface Product {
  id: string; name: string; slug: string; price: number; weight: number;
  karat: number; stock: number; featured: boolean; published: boolean;
  express_shipping: number;
  low_wage: number;
  new_arrival?: number;
  ajrat_override: number; ajrat_percent: number | null; ajrat_fixed: number | null;
  /** 1 = «قیمت ثابت» — exempt from live gold pricing. */
  fixed_price?: number;
  images: string; videos: string; category: { name: string };
  variants?: { id: string; weight: number; price: number; stock: number }[];
  specs?: { label: string; value: string }[];
}
interface GlobalSettings { gold_markup_percent: string; gold_fixed_fee: string; gold_tax_percent?: string; live_pricing_enabled?: string; gold_live_rate?: string; }

/** Weight choices (وزن) — kept as strings while editing the form. */
interface VariantDraft { id: string; weight: string; price: string; stock: string; }
/** «خصوصیات محصولات طلا» rows shown on the product page. */
interface SpecDraft { label: string; value: string; }

const empty = {
  name: "", slug: "", description: "", price: "", weight: "", karat: "18",
  stock: "0", categoryId: "", featured: false, published: true,
  express_shipping: false,
  low_wage: false,
  new_arrival: false,
  images: [] as string[], videos: [] as string[],
  ajrat_override: false, ajrat_percent: "", ajrat_fixed: "",
  fixed_price: false,
  variants: [] as VariantDraft[], specs: [] as SpecDraft[],
};

export default function AdminProductsPage() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [gs, setGs] = useState<GlobalSettings>({ gold_markup_percent: "5", gold_fixed_fee: "0" });
  const [goldPrice, setGoldPrice]   = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState({ ...empty });
  const [saving, setSaving]         = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [err, setErr]               = useState("");
  const [uploading, setUploading]   = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [priceBusy, setPriceBusy]   = useState(false);
  const [goldNote, setGoldNote]     = useState("");
  const fileRef                     = useRef<HTMLInputElement>(null);
  const videoRef                    = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const url = search
      ? `/api/products?search=${encodeURIComponent(search)}&limit=50&adminMode=true`
      : "/api/products?limit=50&adminMode=true";
    const res = await fetch(url);
    const d   = await res.json();
    if (d.success) setProducts(d.data.products);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(d => { if (d.success) setCategories(d.data); });
    fetch("/api/admin/settings").then(r => r.json()).then(d => { if (d.success) setGs(d.data); });
    fetch("/api/admin/gold-price").then(r => r.json()).then(d => { if (d.success) setGoldPrice(d.data.price); });
  }, []);

  function openCreate() { setEditId(null); setForm({ ...empty }); setErr(""); setShowModal(true); }

  function openEdit(p: Product) {
    let imgs: string[] = [];
    try { imgs = JSON.parse(p.images); } catch {}
    let vids: string[] = [];
    try { vids = JSON.parse(p.videos || "[]"); } catch {}
    setEditId(p.id);
    setForm({
      name: p.name, slug: p.slug, description: "",
      price: String(p.price), weight: String(p.weight),
      karat: String(p.karat), stock: String(p.stock),
      categoryId: p.category ? (categories.find(c => c.name === p.category.name)?.id || "") : "",
      featured: p.featured, published: p.published,
      express_shipping: p.express_shipping === 1,
      low_wage: p.low_wage === 1,
      new_arrival: p.new_arrival === 1,
      images: imgs,
      videos: vids,
      ajrat_override: p.ajrat_override === 1,
      ajrat_percent: p.ajrat_percent !== null ? String(p.ajrat_percent) : "",
      ajrat_fixed:   p.ajrat_fixed   !== null ? String(p.ajrat_fixed)   : "",
      fixed_price:   p.fixed_price === 1,
      variants: (p.variants ?? []).map(v => ({
        id: v.id, weight: String(v.weight), price: String(v.price), stock: String(v.stock),
      })),
      specs: (p.specs ?? []).map(s => ({ label: s.label, value: s.value })),
    });
    setErr(""); setShowModal(true);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d   = await res.json();
      if (d.success) setForm(f => ({ ...f, images: [...f.images, d.data.url] }));
      else setErr(d.error || "خطا در آپلود");
    } catch { setErr("خطای شبکه در آپلود"); }
    finally { setUploading(false); }
  }

  function removeImage(idx: number) { setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) })); }

  async function uploadVideo(file: File) {
    setUploadingVideo(true); setErr("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d   = await res.json();
      if (d.success) setForm(f => ({ ...f, videos: [...f.videos, d.data.url] }));
      else setErr(d.error || "خطا در آپلود ویدیو");
    } catch { setErr("خطای شبکه در آپلود"); }
    finally { setUploadingVideo(false); }
  }

  function removeVideo(idx: number) { setForm(f => ({ ...f, videos: f.videos.filter((_, i) => i !== idx) })); }

  async function handleSave() {
    setSaving(true); setErr("");
    try {
      const payload = {
        ...form,
        price:  parseFloat(form.price),
        weight: parseFloat(form.weight),
        karat:  parseInt(form.karat),
        stock:  parseInt(form.stock),
        images: form.images,
        videos: form.videos,
        ajrat_override: form.ajrat_override,
        ajrat_percent: form.ajrat_override && form.ajrat_percent !== "" ? parseFloat(form.ajrat_percent) : null,
        ajrat_fixed:   form.ajrat_override && form.ajrat_fixed   !== "" ? parseFloat(form.ajrat_fixed)   : null,
        fixed_price:   form.fixed_price,
        variants: form.variants
          .map(v => ({ id: v.id, weight: parseFloat(v.weight), price: parseFloat(v.price), stock: parseInt(v.stock) || 0 }))
          .filter(v => v.weight > 0 && v.price > 0),
        specs: form.specs
          .map(s => ({ label: s.label.trim(), value: s.value.trim() }))
          .filter(s => s.label && s.value),
      };
      const res = await fetch(editId ? `/api/products/${editId}` : "/api/products", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "خطا"); return; }
      setShowModal(false); fetchProducts();
    } catch { setErr("خطای شبکه"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setDeleteId(null); fetchProducts();
  }

  function autoSlug(n: string) { return n.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""); }

  // The preview runs the SHARED pricing function (lib/pricing.ts) on the form
  // values, so the number the operator sees is exactly what the storefront will
  // charge — including live gold pricing and the اجرت-only tax.
  const livePricingOn = gs.live_pricing_enabled === "1" || gs.live_pricing_enabled === "true";

  const wt = parseFloat(form.weight) || 0;
  const preview = calcFinalPrice(
    {
      price: parseFloat(form.price) || 0,
      weight: wt,
      karat: parseInt(form.karat) || 18,
      fixed_price: form.fixed_price ? 1 : 0,
      ajrat_override: form.ajrat_override ? 1 : 0,
      ajrat_percent: form.ajrat_override && form.ajrat_percent !== "" ? parseFloat(form.ajrat_percent) : null,
      ajrat_fixed:   form.ajrat_override && form.ajrat_fixed   !== "" ? parseFloat(form.ajrat_fixed)   : null,
    },
    {
      gold_markup_percent: gs.gold_markup_percent,
      gold_fixed_fee: gs.gold_fixed_fee,
      gold_tax_percent: gs.gold_tax_percent,
      live_pricing_enabled: gs.live_pricing_enabled,
      // Prefer the rate the poller published; fall back to what this page loaded.
      gold_live_rate: gs.gold_live_rate || (goldPrice > 0 ? String(goldPrice) : ""),
    },
  );
  const basePrice  = preview.basePrice;
  const ajrat      = preview.ajrat;
  const tax        = preview.tax;
  const taxPct     = preview.taxPct;
  const markupPct  = preview.markupPct;
  const finalPrice = preview.finalPrice;
  const previewIsLive = preview.isLive;

  /**
   * The newest 18k gram rate. Cached per page load in `goldPrice`; the first
   * caller of a session re-fetches with `refresh=1` so the number the operator
   * prices against is genuinely current, not the value the page loaded with.
   */
  async function ensureGoldRate(): Promise<number> {
    if (goldPrice > 0) return goldPrice;
    const r = await fetch("/api/admin/gold-price?refresh=1");
    const d = await r.json();
    if (d?.success && d.data?.price > 0) {
      setGoldPrice(d.data.price);
      return d.data.price as number;
    }
    return 0;
  }

  /** Base price for a weight/karat pair at the live rate. */
  function goldBasePrice(gram: number, weight: number, karat: number): number {
    return Math.round(gram * weight * (karat / 18));
  }

  /**
   * Fill «قیمت پایه» from the live 18k rate: gram × weight × (karat/18).
   */
  async function fillFromGold() {
    const w = parseFloat(form.weight) || 0;
    const k = parseInt(form.karat) || 18;
    if (w <= 0) { setErr("برای محاسبه قیمت لحظه‌ای، اول «وزن» را وارد کنید"); return; }
    setPriceBusy(true);
    try {
      const gram = await ensureGoldRate();
      if (gram <= 0) { setErr("قیمت لحظه‌ای طلا در دسترس نیست — اتصال را بررسی کنید"); return; }
      setForm(f => ({ ...f, price: String(goldBasePrice(gram, w, k)) }));
      setGoldNote(`محاسبه‌شده با نرخ ۱۸ عیار: ${gram.toLocaleString("fa-IR")} ت/گرم`);
      setErr("");
    } catch {
      setErr("قیمت لحظه‌ای طلا در دسترس نیست");
    } finally {
      setPriceBusy(false);
    }
  }

  /** Same one-click fill for one weight-variant row. */
  async function fillVariantFromGold(i: number) {
    const v = form.variants[i];
    const w = parseFloat(v?.weight ?? "") || 0;
    if (w <= 0) { setErr("برای این وزن، اول مقدار «وزن» را وارد کنید"); return; }
    setPriceBusy(true);
    try {
      const gram = await ensureGoldRate();
      if (gram <= 0) { setErr("قیمت لحظه‌ای طلا در دسترس نیست"); return; }
      const price = String(goldBasePrice(gram, w, parseInt(form.karat) || 18));
      setForm(f => ({ ...f, variants: f.variants.map((x, j) => (j === i ? { ...x, price } : x)) }));
      setGoldNote(`قیمت تنوع وزنی با نرخ ۱۸ عیار: ${gram.toLocaleString("fa-IR")} ت/گرم`);
      setErr("");
    } catch {
      setErr("قیمت لحظه‌ای طلا در دسترس نیست");
    } finally {
      setPriceBusy(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", backgroundColor: "#121212", border: "1px solid #333",
    borderRadius: "6px", padding: "8px 12px", color: "#fff", fontSize: "13px", outline: "none", fontFamily: "inherit",
  };

  const lb: React.CSSProperties = {
    color: "#888", fontSize: "12px", display: "block", marginBottom: "4px",
  };

  const st: React.CSSProperties = {
    width: "100%", backgroundColor: "#121212", border: "1px solid #333",
    borderRadius: "6px", padding: "6px 8px", color: "#fff", fontSize: "12px", outline: "none", fontFamily: "inherit",
  };

  return (
    <AdminGuard>
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"24px" }}>
          <h2 style={{ color:"#fff", fontSize:"20px", fontWeight:"700" }}>مدیریت محصولات</h2>
          <button onClick={openCreate} style={{ display:"flex", alignItems:"center", gap:"6px", backgroundColor:"#d4af37", color:"#000", border:"none", borderRadius:"6px", padding:"8px 16px", fontWeight:"700", fontSize:"13px", cursor:"pointer", fontFamily:"inherit" }}>
            <Plus size={16}/> افزودن محصول
          </button>
        </div>

        {/* Search */}
        <div style={{ position:"relative", marginBottom:"14px", maxWidth:"360px" }}>
          <Search size={14} style={{ position:"absolute", right:"11px", top:"50%", transform:"translateY(-50%)", color:"#888" }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جستجو..." style={{ width:"100%", backgroundColor:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:"6px", padding:"8px 34px 8px 12px", color:"#fff", fontSize:"13px", outline:"none" }}/>
        </div>

        {/* Global اجرت info */}
        <div style={{ backgroundColor:"#161616", border:"1px solid #2a2a2a", borderRadius:"8px", padding:"9px 14px", marginBottom:"14px", display:"flex", alignItems:"center", gap:"8px", fontSize:"12px" }}>
          <Info size={13} color="#d4af37"/>
          <span style={{ color:"#888" }}>اجرت جهانی:</span>
          <span style={{ color:"#d4af37", fontWeight:"700" }}>{gs.gold_markup_percent}%</span>
          <span style={{ color:"#555" }}>+</span>
          <span style={{ color:"#d4af37", fontWeight:"700" }}>{Number(gs.gold_fixed_fee).toLocaleString("fa-IR")} ت/گرم</span>
          <span
            title={livePricingOn
              ? "قیمت پایه محصولات از نرخ لحظه‌ای طلا محاسبه می‌شود، مگر محصولاتی که قیمت ثابت دارند"
              : "قیمت پایه هر محصول همان مقداری است که در فرم محصول ذخیره شده است"}
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              backgroundColor: livePricingOn ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
              color: livePricingOn ? "#10b981" : "#888",
              padding: "3px 9px", borderRadius: "20px", fontSize: "11px", whiteSpace: "nowrap",
              marginRight: "10px",
            }}
          >
            {livePricingOn
              ? <><Sparkles size={10}/> قیمت‌گذاری خودکار: روشن</>
              : <><Lock size={10}/> قیمت‌گذاری خودکار: خاموش</>
            }
          </span>
          <a href="/admin/settings" style={{ color:"#555", fontSize:"11px", marginRight:"auto", textDecoration:"none" }}>ویرایش ←</a>
        </div>

        {/* Table */}
        <div style={{ backgroundColor:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:"10px", overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ backgroundColor:"#161616" }}>
                  {["تصویر","نام","دسته","قیمت پایه","اجرت","قیمت نهایی","موجودی","وضعیت","عملیات"].map(h=>(
                    <th key={h} style={{ padding:"10px 14px", color:"#888", fontSize:"12px", textAlign:"right", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ padding:"32px", textAlign:"center", color:"#555" }}>در حال بارگذاری...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding:"32px", textAlign:"center", color:"#555" }}>محصولی یافت نشد</td></tr>
                ) : products.map(p => {
                  const imgs = (() => { try { return JSON.parse(p.images); } catch { return []; } })();
                  // Same shared function the storefront uses, so the table shows the
                  // price the customer really pays (live base + اجرت + tax).
                  const calc = calcFinalPrice(p, {
                    gold_markup_percent: gs.gold_markup_percent,
                    gold_fixed_fee: gs.gold_fixed_fee,
                    gold_tax_percent: gs.gold_tax_percent,
                    live_pricing_enabled: gs.live_pricing_enabled,
                    gold_live_rate: gs.gold_live_rate || (goldPrice > 0 ? String(goldPrice) : ""),
                  });
                  const isLive = calc.isLive;
                  const isLocked = calc.isLocked;
                  return (
                    <tr key={p.id} style={{ borderTop:"1px solid #222" }}>
                      <td style={{ padding:"10px 14px" }}>
                        {imgs[0] ? (
                          <img src={imgs[0]} alt="" style={{ width:"44px", height:"44px", objectFit:"cover", borderRadius:"6px", border:"1px solid #333" }}/>
                        ) : (
                          <div style={{ width:"44px", height:"44px", backgroundColor:"#121212", borderRadius:"6px", border:"1px solid #333", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Upload size={14} color="#444"/>
                          </div>
                        )}
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        <p style={{ color:"#fff", fontSize:"13px" }}>{p.name}</p>
                        <p style={{ color:"#555", fontSize:"11px" }}>{p.slug}</p>
                      </td>
                      <td style={{ padding:"10px 14px", color:"#888", fontSize:"12px" }}>{p.category?.name||"—"}</td>
                      <td style={{ padding:"10px 14px", whiteSpace:"nowrap" }}>
                        <p style={{ color: isLive ? "#10b981" : "#aaa", fontSize:"12px" }}>{calc.basePrice.toLocaleString("fa-IR")} ت</p>
                        {isLocked ? (
                          <span title="قیمت ثابت — از نرخ روز طلا پیروی نمی‌کند" style={{ display:"inline-flex", alignItems:"center", gap:"3px", backgroundColor:"rgba(239,68,68,0.15)", color:"#ef4444", padding:"1px 6px", borderRadius:"20px", fontSize:"10px", marginTop:"3px" }}>
                            <Lock size={9}/> ثابت
                          </span>
                        ) : isLive ? (
                          <span title={`محاسبه‌شده از نرخ لحظه‌ای: ${calc.liveRate.toLocaleString("fa-IR")} ت/گرم`} style={{ display:"inline-flex", alignItems:"center", gap:"3px", backgroundColor:"rgba(16,185,129,0.15)", color:"#10b981", padding:"1px 6px", borderRadius:"20px", fontSize:"10px", marginTop:"3px" }}>
                            <Sparkles size={9}/> لحظه‌ای
                          </span>
                        ) : null}
                        {isLive && (
                          <p style={{ color:"#3f5c4a", fontSize:"9px", marginTop:"2px" }}>ذخیره‌شده: {p.price.toLocaleString("fa-IR")}</p>
                        )}
                      </td>
                      <td style={{ padding:"10px 14px", whiteSpace:"nowrap" }}>
                        <span style={{ color: p.ajrat_override===1?"#f59e0b":"#888", fontSize:"11px" }}>{p.ajrat_override===1?"اختصاصی":"جهانی"}</span>
                        <p style={{ color:"#d4af37", fontSize:"11px" }}>+{calc.ajrat.toLocaleString("fa-IR")}</p>
                        {calc.tax > 0 && <p style={{ color:"#7c6bd6", fontSize:"10px" }}>مالیات +{calc.tax.toLocaleString("fa-IR")}</p>}
                      </td>
                      <td style={{ padding:"10px 14px", color:"#d4af37", fontSize:"13px", fontWeight:"700", whiteSpace:"nowrap" }}>{calc.finalPrice.toLocaleString("fa-IR")} ت</td>
                      <td style={{ padding:"10px 14px" }}>
                        <span style={{ color: p.stock>0?"#10b981":"#ef4444", fontSize:"13px", fontWeight:"600" }}>{p.stock}</span>
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        <span style={{ backgroundColor: p.published?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)", color: p.published?"#10b981":"#ef4444", padding:"3px 8px", borderRadius:"20px", fontSize:"11px" }}>
                          {p.published?"منتشر":"پنهان"}
                        </span>
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", gap:"6px" }}>
                          <button onClick={()=>openEdit(p)} style={{ backgroundColor:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)", color:"#d4af37", borderRadius:"6px", padding:"5px 8px", cursor:"pointer" }}><Pencil size={13}/></button>
                          <button onClick={()=>setDeleteId(p.id)} style={{ backgroundColor:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#ef4444", borderRadius:"6px", padding:"5px 8px", cursor:"pointer" }}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Product Modal ── */}
        {showModal && (
          <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:"20px" }}>
            <div style={{ backgroundColor:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:"12px", width:"100%", maxWidth:"620px", maxHeight:"92vh", overflowY:"auto" }}>
              <div style={{ padding:"18px 24px", borderBottom:"1px solid #2a2a2a", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, backgroundColor:"#1a1a1a", zIndex:1 }}>
                <h3 style={{ color:"#fff", fontSize:"15px", fontWeight:"700" }}>{editId?"ویرایش محصول":"افزودن محصول"}</h3>
                <button onClick={()=>setShowModal(false)} style={{ background:"none", border:"none", color:"#888", cursor:"pointer" }}><X size={18}/></button>
              </div>

              <div style={{ padding:"22px" }}>
                {err && <div style={{ backgroundColor:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"6px", padding:"10px", marginBottom:"14px", color:"#f87171", fontSize:"13px" }}>{err}</div>}

                {/* ── Images ── */}
                <p style={{ color:"#d4af37", fontSize:"11px", fontWeight:"700", letterSpacing:"1px", marginBottom:"10px" }}>تصاویر محصول</p>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={e=>{ Array.from(e.target.files||[]).forEach(f=>uploadImage(f)); e.target.value=""; }} style={{ display:"none" }}/>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"12px" }}>
                  {form.images.map((img,i)=>(
                    <div key={i} style={{ position:"relative", width:"72px", height:"72px" }}>
                      <img src={img} alt="" style={{ width:"72px", height:"72px", objectFit:"cover", borderRadius:"7px", border:"1px solid #333" }}/>
                      <button onClick={()=>removeImage(i)} style={{ position:"absolute", top:"-6px", right:"-6px", width:"18px", height:"18px", borderRadius:"50%", backgroundColor:"#ef4444", border:"none", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px" }}>
                        <X size={10}/>
                      </button>
                    </div>
                  ))}
                  <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                    style={{ width:"72px", height:"72px", backgroundColor:"#121212", border:"2px dashed #333", borderRadius:"7px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"4px", color:"#555" }}>
                    <Upload size={18} color="#555"/>
                    <span style={{ fontSize:"9px" }}>{uploading?"آپلود...":"افزودن"}</span>
                  </button>
                </div>
                {/* Or URL */}
                <input style={{ ...inp, marginBottom:"18px" }} placeholder="یا URL تصویر را وارد کنید و Enter بزنید"
                  onKeyDown={e=>{ if(e.key==="Enter"&&(e.target as HTMLInputElement).value.trim()){ setForm(f=>({...f,images:[...f.images,(e.target as HTMLInputElement).value.trim()]})); (e.target as HTMLInputElement).value=""; }}}/>

                {/* ── Videos ── */}
                <p style={{ color:"#d4af37", fontSize:"11px", fontWeight:"700", letterSpacing:"1px", marginBottom:"10px" }}>ویدیوهای محصول</p>
                <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadVideo(f); e.target.value=""; }} style={{ display:"none" }}/>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"12px" }}>
                  {form.videos.map((vid,i)=>(
                    <div key={i} style={{ position:"relative", width:"96px", height:"72px" }}>
                      <video src={vid} muted playsInline preload="metadata" style={{ width:"96px", height:"72px", objectFit:"cover", borderRadius:"7px", border:"1px solid #333", backgroundColor:"#000" }}/>
                      <button onClick={()=>removeVideo(i)} style={{ position:"absolute", top:"-6px", right:"-6px", width:"18px", height:"18px", borderRadius:"50%", backgroundColor:"#ef4444", border:"none", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px" }}>
                        <X size={10}/>
                      </button>
                    </div>
                  ))}
                  <button onClick={()=>videoRef.current?.click()} disabled={uploadingVideo}
                    style={{ width:"96px", height:"72px", backgroundColor:"#121212", border:"2px dashed #333", borderRadius:"7px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"4px", color:"#555" }}>
                    <Upload size={18} color="#555"/>
                    <span style={{ fontSize:"9px" }}>{uploadingVideo?"آپلود...":"افزودن ویدیو"}</span>
                  </button>
                </div>
                <input style={{ ...inp, marginBottom:"18px" }} placeholder="یا URL ویدیو را وارد کنید و Enter بزنید (MP4, WebM)"
                  onKeyDown={e=>{ if(e.key==="Enter"&&(e.target as HTMLInputElement).value.trim()){ setForm(f=>({...f,videos:[...f.videos,(e.target as HTMLInputElement).value.trim()]})); (e.target as HTMLInputElement).value=""; }}}/>

                {/* ── Basic info ── */}
                <p style={{ color:"#d4af37", fontSize:"11px", fontWeight:"700", letterSpacing:"1px", marginBottom:"10px" }}>اطلاعات پایه</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
                  <div>
                    <label style={{ color:"#888", fontSize:"12px", display:"block", marginBottom:"4px" }}>نام محصول *</label>
                    <input style={inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value,slug:f.slug||autoSlug(e.target.value)}))}/>
                  </div>
                  <div>
                    <label style={{ color:"#888", fontSize:"12px", display:"block", marginBottom:"4px" }}>اسلاگ *</label>
                    <input style={{...inp,direction:"ltr"}} value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))}/>
                  </div>
                </div>
                <div style={{ marginBottom:"10px" }}>
                  <label style={{ color:"#888", fontSize:"12px", display:"block", marginBottom:"4px" }}>توضیحات</label>
                  <input style={inp} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"10px" }}>
                  {[{k:"weight",l:"وزن (گرم)"},{k:"karat",l:"عیار"},{k:"stock",l:"موجودی"}].map(f=>(
                    <div key={f.k}>
                      <label style={{ color:"#888", fontSize:"12px", display:"block", marginBottom:"4px" }}>{f.l}</label>
                      <input type="number" style={inp} value={(form as Record<string,unknown>)[f.k] as string} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} min="0" step={f.k==="weight"?"0.01":"1"}/>
                    </div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"18px" }}>
                  <div>
                    <label style={{ color:"#888", fontSize:"12px", display:"block", marginBottom:"4px" }}>دسته‌بندی *</label>
                    <select value={form.categoryId} onChange={e=>setForm(f=>({...f,categoryId:e.target.value}))} style={inp}>
                      <option value="">انتخاب کنید</option>
                      {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display:"flex", gap:"14px", paddingTop:"20px", flexWrap:"wrap" }}>
                    {[{k:"featured",l:"ویژه"},{k:"published",l:"منتشر"},{k:"express_shipping",l:"ارسال فوری"},{k:"low_wage",l:"کم اجرت"},{k:"new_arrival",l:"جدیدترین"}].map(t=>(
                      <label key={t.k} style={{ display:"flex", alignItems:"center", gap:"6px", cursor:"pointer", color:"#ccc", fontSize:"13px" }}>
                        <input type="checkbox" checked={(form as Record<string,unknown>)[t.k] as boolean} onChange={e=>setForm(f=>({...f,[t.k]:e.target.checked}))}/>
                        {t.l}
                      </label>
                    ))}
                  </div>
                </div>

                {/* ── Pricing ── */}
                <p style={{ color:"#d4af37", fontSize:"11px", fontWeight:"700", letterSpacing:"1px", marginBottom:"10px" }}>قیمت‌گذاری و اجرت</p>
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <label style={{ color: "#888", fontSize: "12px" }}>قیمت پایه (تومان) *</label>
                    <button
                      type="button"
                      onClick={fillFromGold}
                      disabled={priceBusy}
                      title="محاسبه قیمت پایه از نرخ لحظه‌ای طلای ۱۸ عیار × وزن"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "5px",
                        backgroundColor: "rgba(212,175,55,0.1)", color: "#d4af37",
                        border: "1px solid rgba(212,175,55,0.4)", borderRadius: "6px",
                        padding: "4px 9px", fontSize: "11px", cursor: priceBusy ? "wait" : "pointer",
                        fontFamily: "inherit", opacity: priceBusy ? 0.6 : 1,
                      }}
                    >
                      <Sparkles size={12} />
                      {priceBusy ? "در حال دریافت نرخ…" : "قیمت لحظه‌ای طلا"}
                    </button>
                  </div>
                  <input type="number" style={{...inp,direction:"ltr"}} value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} min="0" step="1000"/>
                  {goldNote && (
                    <p style={{ color: "#5d8a5d", fontSize: "10px", marginTop: "5px" }}>{goldNote}</p>
                  )}
                  {/* «قیمت ثابت» — exempt this product from live gold pricing */}
                  <div style={{ marginTop: "10px", backgroundColor: form.fixed_price ? "rgba(239,68,68,0.07)" : "#121212", border: `1px solid ${form.fixed_price ? "rgba(239,68,68,0.3)" : "#2a2a2a"}`, borderRadius: "8px", padding: "10px 12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <div onClick={()=>setForm(f=>({...f,fixed_price:!f.fixed_price}))}
                        style={{ width:"34px", height:"19px", borderRadius:"10px", backgroundColor:form.fixed_price?"#ef4444":"#333", position:"relative", cursor:"pointer", transition:"background-color 0.2s", flexShrink:0 }}>
                        <div style={{ position:"absolute", top:"2.5px", left:form.fixed_price?"18px":"2.5px", width:"14px", height:"14px", borderRadius:"50%", backgroundColor:"#fff", transition:"left 0.2s" }}/>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Lock size={12} color={form.fixed_price ? "#ef4444" : "#888"} />
                        <p style={{ color: "#fff", fontSize: "13px", fontWeight: "600", margin: 0 }}>قیمت ثابت</p>
                      </div>
                    </label>
                    <p style={{ color: "#666", fontSize: "11px", margin: "6px 0 0", lineHeight: 1.8 }}>
                      {form.fixed_price
                        ? "🔒 این محصول همیشه با همین قیمت پایه فروخته می‌شود و از نرخ روز طلا تبعیت نمی‌کند — مناسب کالاهای با قیمت توافقی یا تخفیف‌دار."
                        : "این محصول از نرخ لحظه‌ای طلا تبعیت می‌کند (در صورت روشن بودن «قیمت‌گذاری خودکار» در تنظیمات). برای استثنا کردن، این کلید را روشن کنید."}
                    </p>
                  </div>
                </div>
                <div style={{ backgroundColor:"#121212", border:"1px solid #2a2a2a", borderRadius:"8px", padding:"12px 14px", marginBottom:"12px" }}>
                  <label style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", marginBottom: form.ajrat_override?"12px":"0" }}>
                    <div onClick={()=>setForm(f=>({...f,ajrat_override:!f.ajrat_override}))}
                      style={{ width:"34px", height:"19px", borderRadius:"10px", backgroundColor:form.ajrat_override?"#d4af37":"#333", position:"relative", cursor:"pointer", transition:"background-color 0.2s", flexShrink:0 }}>
                      <div style={{ position:"absolute", top:"2.5px", left:form.ajrat_override?"18px":"2.5px", width:"14px", height:"14px", borderRadius:"50%", backgroundColor:"#fff", transition:"left 0.2s" }}/>
                    </div>
                    <div>
                      <p style={{ color:"#fff", fontSize:"13px", fontWeight:"600" }}>اجرت اختصاصی</p>
                      <p style={{ color:"#666", fontSize:"11px" }}>{form.ajrat_override?`مقادیر زیر جایگزین می‌شوند`:`جهانی: ${gs.gold_markup_percent}% + ${Number(gs.gold_fixed_fee).toLocaleString("fa-IR")} ت/گرم`}</p>
                    </div>
                  </label>
                  {form.ajrat_override && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                      <div>
                        <label style={{ color:"#888", fontSize:"12px", display:"block", marginBottom:"4px" }}>درصد اجرت (%)</label>
                        <input type="number" style={{...inp,direction:"ltr"}} value={form.ajrat_percent} onChange={e=>setForm(f=>({...f,ajrat_percent:e.target.value}))} min="0" max="100" step="0.5" placeholder={gs.gold_markup_percent}/>
                      </div>
                      <div>
                        <label style={{ color:"#888", fontSize:"12px", display:"block", marginBottom:"4px" }}>اجرت ثابت (ت/گرم)</label>
                        <input type="number" style={{...inp,direction:"ltr"}} value={form.ajrat_fixed} onChange={e=>setForm(f=>({...f,ajrat_fixed:e.target.value}))} min="0" step="1000" placeholder={gs.gold_fixed_fee}/>
                      </div>
                    </div>
                  )}
                </div>
                {/* Weight variants — the PDP turns each row into a selectable weight pill */}
                <div style={{ marginBottom:"18px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" }}>
                    <label style={{ ...lb, marginBottom:0 }}>تنوع وزنی (اختیاری)</label>
                    <button type="button" onClick={()=>setForm(f=>({ ...f, variants:[...f.variants,{ id:`v${Date.now()}`, weight:"", price:"", stock:"0" }] }))}
                      style={{ backgroundColor:"#2a2a2a", color:"#d4af37", border:"none", borderRadius:"6px", padding:"5px 10px", fontSize:"11px", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
                      <Plus size={12}/> افزودن وزن
                    </button>
                  </div>
                  {form.variants.length===0?(
                    <p style={{ color:"#555", fontSize:"10px", margin:0 }}>بدون تنوع، وزن و قیمت اصلی محصول استفاده می‌شود</p>
                  ):(
                    <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.4fr 1fr 30px 30px", gap:"6px" }}>
                        <span style={{ color:"#555", fontSize:"9px" }}>وزن (گرم)</span>
                        <span style={{ color:"#555", fontSize:"9px" }}>قیمت پایه (تومان)</span>
                        <span style={{ color:"#555", fontSize:"9px" }}>موجودی</span>
                        <span/>
                        <span/>
                      </div>
                      {form.variants.map((v,i)=>(
                        <div key={v.id+i} style={{ display:"grid", gridTemplateColumns:"1fr 1.4fr 1fr 30px 30px", gap:"6px", alignItems:"center" }}>
                          <input style={st} type="number" min="0" step="0.001" value={v.weight} placeholder="0.5"
                            onChange={e=>setForm(f=>({ ...f, variants:f.variants.map((x,j)=>j===i?{ ...x, weight:e.target.value }:x) }))}/>
                          <div style={{ display:"flex", gap:"4px" }}>
                            <input style={st} type="number" min="0" step="1000" value={v.price} placeholder="4300000"
                              onChange={e=>setForm(f=>({ ...f, variants:f.variants.map((x,j)=>j===i?{ ...x, price:e.target.value }:x) }))}/>
                            <button type="button" title="محاسبه از نرخ لحظه‌ای طلا" onClick={()=>fillVariantFromGold(i)}
                              style={{ backgroundColor:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.4)", color:"#d4af37", borderRadius:"6px", cursor:priceBusy?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0, flexShrink:0, opacity:priceBusy?0.6:1 }}>
                              <Sparkles size={12}/>
                            </button>
                          </div>
                          <input style={st} type="number" min="0" value={v.stock} placeholder="0"
                            onChange={e=>setForm(f=>({ ...f, variants:f.variants.map((x,j)=>j===i?{ ...x, stock:e.target.value }:x) }))}/>
                          <button type="button" title="حذف" onClick={()=>setForm(f=>({ ...f, variants:f.variants.filter((_,j)=>j!==i) }))}
                            style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", padding:4 }}>
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Spec rows for the «خصوصیات محصولات طلا» table on the PDP */}
                <div style={{ marginBottom:"18px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" }}>
                    <label style={{ ...lb, marginBottom:0 }}>مشخصات محصول (جدول صفحه محصول)</label>
                    <button type="button" onClick={()=>setForm(f=>({ ...f, specs:[...f.specs,{ label:"", value:"" }] }))}
                      style={{ backgroundColor:"#2a2a2a", color:"#d4af37", border:"none", borderRadius:"6px", padding:"5px 10px", fontSize:"11px", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
                      <Plus size={12}/> افزودن مشخصه
                    </button>
                  </div>
                  {form.specs.length===0?(
                    <p style={{ color:"#555", fontSize:"10px", margin:0 }}>در صورت خالی بودن، مشخصات پیش‌فرض (عیار/وزن/بسته‌بندی...) نمایش داده می‌شود</p>
                  ):(
                    <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                      {form.specs.map((s,i)=>(
                        <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr 30px", gap:"6px", alignItems:"center" }}>
                          <input style={st} value={s.label} placeholder="عیار طلا"
                            onChange={e=>setForm(f=>({ ...f, specs:f.specs.map((x,j)=>j===i?{ ...x, label:e.target.value }:x) }))}/>
                          <input style={st} value={s.value} placeholder="18 عیار (750)"
                            onChange={e=>setForm(f=>({ ...f, specs:f.specs.map((x,j)=>j===i?{ ...x, value:e.target.value }:x) }))}/>
                          <button type="button" title="حذف" onClick={()=>setForm(f=>({ ...f, specs:f.specs.filter((_,j)=>j!==i) }))}
                            style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", padding:4 }}>
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {basePrice>0&&(
                  <div style={{ backgroundColor:"rgba(212,175,55,0.05)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:"8px", padding:"12px 14px", marginBottom:"18px" }}>
                    <p style={{ color:"#888", fontSize:"11px", marginBottom:"8px", fontWeight:"600" }}>پیش‌نمایش قیمت</p>
                    <div style={{ display:"grid", gridTemplateColumns:`repeat(${tax>0?4:3},1fr)`, gap:"6px" }}>
                      {[
                        { l: previewIsLive ? "قیمت پایه (لحظه‌ای)" : "قیمت پایه", v: basePrice, live: previewIsLive },
                        { l:`اجرت (${markupPct}%)`, v: ajrat },
                        ...(tax>0?[{ l:`مالیات (${taxPct}%)`, v: tax }]:[]),
                        { l:"قیمت نهایی", v:finalPrice, h:true },
                      ].map(it=>(
                        <div key={it.l} style={{ backgroundColor:it.h?"rgba(212,175,55,0.12)":it.live?"rgba(16,185,129,0.08)":"#121212", border:`1px solid ${it.h?"rgba(212,175,55,0.3)":it.live?"rgba(16,185,129,0.35)":"#222"}`, borderRadius:"6px", padding:"8px 10px", textAlign:"center" }}>
                          <p style={{ color:"#666", fontSize:"9px", marginBottom:"3px" }}>{it.l}</p>
                          <p style={{ color:it.h?"#d4af37":it.live?"#10b981":"#fff", fontSize:"12px", fontWeight:"700" }}>{it.v.toLocaleString("fa-IR")}<span style={{ color:"#555", fontSize:"9px", marginRight:"2px" }}>ت</span></p>
                        </div>
                      ))}
                    </div>
                    {previewIsLive && (
                      <p style={{ color:"#10b981", fontSize:"9px", marginTop:"6px", textAlign:"center" }}>
                        ⚡ قیمت پایه از نرخ لحظه‌ای طلا محاسبه می‌شود — با تغییر نرخ بازار، قیمت این محصول هم به‌روز می‌شود.
                      </p>
                    )}
                    {preview.isLocked && (
                      <p style={{ color:"#f59e0b", fontSize:"9px", marginTop:"6px", textAlign:"center" }}>
                        🔒 «قیمت ثابت» — این محصول از نرخ روز طلا پیروی نمی‌کند و با همین قیمت پایه فروخته می‌شود.
                      </p>
                    )}
                    {goldPrice>0&&wt>0&&<p style={{ color:"#555", fontSize:"9px", marginTop:"6px", textAlign:"center" }}>طلای ۱۸ع: {goldPrice.toLocaleString("fa-IR")} ت/گرم</p>}
                  </div>
                )}

                <div style={{ display:"flex", gap:"10px" }}>
                  <button onClick={handleSave} disabled={saving||uploading}
                    style={{ flex:1, backgroundColor:saving?"#a08020":"#d4af37", color:"#000", border:"none", borderRadius:"6px", padding:"11px", fontWeight:"700", fontSize:"14px", cursor:saving?"not-allowed":"pointer", fontFamily:"inherit" }}>
                    {saving?"در حال ذخیره...":"ذخیره محصول"}
                  </button>
                  <button onClick={()=>setShowModal(false)} style={{ flex:1, backgroundColor:"transparent", color:"#888", border:"1px solid #333", borderRadius:"6px", padding:"11px", cursor:"pointer", fontFamily:"inherit" }}>انصراف</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteId&&(
          <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
            <div style={{ backgroundColor:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:"12px", padding:"24px", maxWidth:"320px", width:"100%", textAlign:"center" }}>
              <Trash2 size={28} color="#ef4444" style={{ margin:"0 auto 10px" }}/>
              <p style={{ color:"#fff", marginBottom:"6px", fontWeight:"600" }}>حذف محصول؟</p>
              <p style={{ color:"#888", fontSize:"12px", marginBottom:"18px" }}>این عمل قابل بازگشت نیست</p>
              <div style={{ display:"flex", gap:"10px" }}>
                <button onClick={()=>handleDelete(deleteId)} style={{ flex:1, backgroundColor:"#ef4444", color:"#fff", border:"none", borderRadius:"6px", padding:"10px", cursor:"pointer", fontFamily:"inherit" }}>حذف</button>
                <button onClick={()=>setDeleteId(null)} style={{ flex:1, backgroundColor:"transparent", color:"#888", border:"1px solid #333", borderRadius:"6px", padding:"10px", cursor:"pointer", fontFamily:"inherit" }}>انصراف</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
