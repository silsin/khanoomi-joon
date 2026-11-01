"use client";
import { useState, useRef, useEffect } from "react";
import {
  Camera, Upload, RotateCcw, ZoomIn, ZoomOut,
  Move, Trash2, ShoppingCart, ChevronLeft, X, Check,
  Sparkles, Wand2, RefreshCw, Download, ImageIcon,
} from "lucide-react";
import PageHero from "../components/PageHero";
import PageLayout from "../components/PageLayout";
import Link from "next/link";
import { useCart } from "../components/CartContext";
import { buildTryonComposite, detectJewelryTypeFromCategory } from "@/lib/tryonComposite";
import { isTryonEnabled } from "@/lib/tryon-settings";

interface Product {
  id: string; name: string; slug: string; price: number;
  weight: number; karat: number; images: string; stock: number;
  category_name: string;
  ajrat_override: number; ajrat_percent: number | null; ajrat_fixed: number | null;
}
interface Overlay {
  id: string; product: Product; src: string;
  x: number; y: number; w: number; h: number; rot: number;
}

const FB: Record<string, string> = {
  necklaces: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80",
  rings:     "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80",
  bracelets: "https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=400&q=80",
  earrings:  "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=400&q=80",
};

function prodImg(p: Product): string {
  try { const a = JSON.parse(p.images); if (a[0]) return a[0]; } catch {}
  const cat = (p.category_name || "").toLowerCase();
  for (const [k, v] of Object.entries(FB)) if (cat.includes(k.slice(0, 4))) return v;
  return FB.necklaces;
}

type Tab = "manual" | "ai";
type AiStyle = "realistic" | "artistic" | "elegant";

export default function TryOnPage() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);

  const [tab, setTab]             = useState<Tab>("manual");
  const [userPhoto, setUserPhoto] = useState<HTMLImageElement | null>(null);
  const [overlays, setOverlays]   = useState<Overlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [products, setProducts]   = useState<Product[]>([]);
  const [cameraOn, setCameraOn]   = useState(false);
  const [drag, setDrag]           = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [resize, setResize]       = useState<{ id: string; ox: number; oy: number; ow: number; oh: number } | null>(null);
  const [addedId, setAddedId]     = useState<string | null>(null);

  // AI state
  const [aiStyle, setAiStyle]           = useState<AiStyle>("realistic");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiImage, setAiImage]           = useState<string | null>(null);
  const [aiError, setAiError]           = useState("");
  const [aiPromptExtra, setAiPromptExtra] = useState("");
  const [aiUserPhoto, setAiUserPhoto]   = useState<string | null>(null); // base64
  const [aiUserPhotoPreview, setAiUserPhotoPreview] = useState<string | null>(null);
  const aFileRef = useRef<HTMLInputElement>(null);
  const aVideoRef = useRef<HTMLVideoElement>(null);
  const aStreamRef = useRef<MediaStream | null>(null);
  const [aiCameraOn, setAiCameraOn]     = useState(false);
  const [tryonReady, setTryonReady]     = useState(false);
  const [tryonOn, setTryonOn]           = useState(true);

  const { add } = useCart();

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.success) setTryonOn(isTryonEnabled(d.data.tryon_enabled));
        setTryonReady(true);
      })
      .catch(() => setTryonReady(true));
  }, []);

  useEffect(() => {
    fetch("/api/products?limit=20")
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.data.products); });
  }, []);

  // ── Canvas redraw ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (userPhoto) {
      ctx.drawImage(userPhoto, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "var(--dg-bg-2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const loadAndDraw = (ov: Overlay) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.save();
        ctx.translate(ov.x + ov.w / 2, ov.y + ov.h / 2);
        ctx.rotate((ov.rot * Math.PI) / 180);
        ctx.globalAlpha = 0.92;
        ctx.drawImage(img, -ov.w / 2, -ov.h / 2, ov.w, ov.h);
        ctx.globalAlpha = 1;
        if (ov.id === selectedId) {
          ctx.strokeStyle = "var(--dg-primary)";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 3]);
          ctx.strokeRect(-ov.w / 2 - 2, -ov.h / 2 - 2, ov.w + 4, ov.h + 4);
          // resize handle
          ctx.fillStyle = "var(--dg-primary)";
          ctx.setLineDash([]);
          ctx.fillRect(ov.w / 2 - 8, ov.h / 2 - 8, 10, 10);
        }
        ctx.restore();
      };
      img.src = ov.src;
    };

    overlays.forEach(loadAndDraw);
  }, [userPhoto, overlays, selectedId]);

  // ── Photo loading ──────────────────────────────────────────
  function loadPhoto(file: File) {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const maxW = 700;
      const scale = Math.min(1, maxW / img.naturalWidth);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width  = img.naturalWidth  * scale;
        canvas.height = img.naturalHeight * scale;
      }
      setUserPhoto(img);
    };
    img.src = url;
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setCameraOn(true);
    } catch { alert("دسترسی به دوربین ممکن نیست"); }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function capturePhoto() {
    const v = videoRef.current;
    if (!v) return;
    const tmp = document.createElement("canvas");
    tmp.width = v.videoWidth; tmp.height = v.videoHeight;
    tmp.getContext("2d")?.drawImage(v, 0, 0);
    tmp.toBlob(blob => {
      if (!blob) return;
      loadPhoto(new File([blob], "camera.jpg", { type: "image/jpeg" }));
      stopCamera();
    }, "image/jpeg");
  }

  // ── Overlay management ─────────────────────────────────────
  function addOverlay(p: Product) {
    const src = prodImg(p);
    const id  = Math.random().toString(36).slice(2);
    const cw  = canvasRef.current?.width  ?? 400;
    const ch  = canvasRef.current?.height ?? 500;
    setOverlays(prev => [...prev, { id, product: p, src, x: cw / 2 - 60, y: ch / 2 - 60, w: 120, h: 120, rot: 0 }]);
    setSelectedId(id);
  }

  function removeOverlay(id: string) {
    setOverlays(prev => prev.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updateOverlay(id: string, patch: Partial<Overlay>) {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
  }

  // ── Canvas mouse ───────────────────────────────────────────
  function canvasPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = canvasRef.current!.width  / rect.width;
    const sy = canvasRef.current!.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = canvasPos(e);
    for (let i = overlays.length - 1; i >= 0; i--) {
      const ov = overlays[i];
      if (x >= ov.x && x <= ov.x + ov.w && y >= ov.y && y <= ov.y + ov.h) {
        setSelectedId(ov.id);
        if (x > ov.x + ov.w - 18 && y > ov.y + ov.h - 18) {
          setResize({ id: ov.id, ox: x, oy: y, ow: ov.w, oh: ov.h });
        } else {
          setDrag({ id: ov.id, ox: x - ov.x, oy: y - ov.y });
        }
        return;
      }
    }
    setSelectedId(null);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = canvasPos(e);
    if (drag) updateOverlay(drag.id, { x: x - drag.ox, y: y - drag.oy });
    if (resize) updateOverlay(resize.id, { w: Math.max(40, resize.ow + x - resize.ox), h: Math.max(40, resize.oh + y - resize.oy) });
  }

  function onMouseUp() { setDrag(null); setResize(null); }

  // ── Download ───────────────────────────────────────────────
  function downloadCanvas() {
    const a = document.createElement("a");
    a.download = "delly-gold-tryon.png";
    a.href = canvasRef.current?.toDataURL("image/png") ?? "";
    a.click();
  }

  function downloadAi() {
    if (!aiImage) return;
    const a = document.createElement("a");
    a.download = "delly-gold-ai.png";
    a.href = aiImage;
    a.click();
  }

  // ── AI photo helpers ──────────────────────────────────────
  function loadAiPhoto(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setAiUserPhoto(dataUrl);
      setAiUserPhotoPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function startAiCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      aStreamRef.current = stream;
      if (aVideoRef.current) { aVideoRef.current.srcObject = stream; aVideoRef.current.play(); }
      setAiCameraOn(true);
    } catch { alert("دسترسی به دوربین ممکن نیست"); }
  }

  function stopAiCamera() {
    aStreamRef.current?.getTracks().forEach(t => t.stop());
    aStreamRef.current = null;
    setAiCameraOn(false);
  }

  function captureAiPhoto() {
    const v = aVideoRef.current;
    if (!v) return;
    const tmp = document.createElement("canvas");
    tmp.width = v.videoWidth; tmp.height = v.videoHeight;
    tmp.getContext("2d")?.drawImage(v, 0, 0);
    const dataUrl = tmp.toDataURL("image/jpeg", 0.85);
    setAiUserPhoto(dataUrl);
    setAiUserPhotoPreview(dataUrl);
    stopAiCamera();
  }

  // ── AI generation ──────────────────────────────────────────
  async function generateAI() {
    if (selectedProducts.size === 0) { setAiError("حداقل یک محصول انتخاب کنید"); return; }
    if (!aiUserPhoto) { setAiError("لطفاً ابتدا یک تصویر از خودتان آپلود کنید یا با دوربین عکس بگیرید"); return; }

    setAiLoading(true); setAiError(""); setAiImage(null);

    const picked = products.filter(p => selectedProducts.has(p.id));
    const jewelryName = picked.map(p => p.name).join(" و ");

    try {
      const compositeImageBase64 = await buildTryonComposite(
        aiUserPhoto,
        picked.map(p => ({
          url: prodImg(p),
          type: detectJewelryTypeFromCategory(p.category_name),
        })),
      );

      const res = await fetch("/api/ai/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compositeImageBase64,
          userImageBase64: aiUserPhoto,
          jewelryName,
          style: aiStyle,
          extraPrompt: aiPromptExtra,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAiError(data.error || "خطا در تولید تصویر. لطفاً دوباره امتحان کنید.");
      } else {
        setAiImage(data.data.image);
      }
    } catch {
      setAiError("خطا در ترکیب تصاویر. لطفاً دوباره امتحان کنید.");
    } finally {
      setAiLoading(false);
    }
  }

  function toggleAiProduct(id: string) {
    setSelectedProducts(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function handleCartAdd(p: Product) {
    add({ productId: p.id, name: p.name, price: p.price, weight: p.weight, karat: p.karat, image: prodImg(p), stock: p.stock });
    setAddedId(p.id);
    setTimeout(() => setAddedId(cur => cur === p.id ? null : cur), 1800);
  }

  const selected = overlays.find(o => o.id === selectedId);

  const inp: React.CSSProperties = {
    width: "100%", border: "1px solid var(--dg-line)", borderRadius: "10px",
    padding: "9px 12px", fontSize: "13px", outline: "none",
    color: "var(--dg-ink-2)", backgroundColor: "var(--dg-bg)", fontFamily: "inherit",
  };

  return (
    <PageLayout>
      {!tryonReady ? (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 16px", textAlign: "center", color: "var(--dg-muted)" }}>
          در حال بارگذاری...
        </div>
      ) : !tryonOn ? (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 16px", textAlign: "center" }}>
          <Sparkles size={48} color="var(--dg-primary)" style={{ margin: "0 auto 16px", display: "block" }} />
          <h1 style={{ color: "var(--dg-ink)", fontSize: "22px", fontWeight: "800", marginBottom: "10px" }}>پرو مجازی در دسترس نیست</h1>
          <p style={{ color: "var(--dg-muted)", fontSize: "14px", marginBottom: "24px" }}>این قابلیت در حال حاضر غیرفعال شده است.</p>
          <Link href="/products" style={{ display: "inline-block", backgroundColor: "var(--dg-primary)", color: "#fff", textDecoration: "none", borderRadius: "12px", padding: "10px 24px", fontWeight: "700", fontSize: "14px" }}>
            مشاهده محصولات
          </Link>
        </div>
      ) : (
      <>
      <PageHero
        eyebrow="VIRTUAL TRY-ON"
        title={<><Sparkles size={24} color="#c6a15b" /> پرو مجازی طلا</>}
        subtitle="زیورآلات را روی عکس خود امتحان کنید یا با هوش مصنوعی تصویر جدید بسازید"
        crumbs={[{ label: "پرو مجازی طلا" }]}
        aside={
          <div className="tryon-tabs">
            {([
              { key: "manual", label: "پرو دستی", icon: <ImageIcon size={15} /> },
              { key: "ai",     label: "تولید با هوش مصنوعی", icon: <Sparkles size={15} /> },
            ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? "on" : ""}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="tryon-wrap" style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
        {/* ══════════════════ MANUAL TAB ══════════════════ */}
        {tab === "manual" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px" }} className="tryon-grid">
            {/* Canvas area */}
            <div>
              {/* Action row */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) loadPhoto(f); }} style={{ display: "none" }} />
                <button onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "var(--dg-primary)", color: "#fff", border: "none", borderRadius: "10px", padding: "8px 16px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                  <Upload size={14} /> آپلود عکس
                </button>
                <button onClick={cameraOn ? capturePhoto : startCamera} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: cameraOn ? "#16a34a" : "#fff", color: cameraOn ? "#fff" : "var(--dg-ink-2)", border: "1px solid var(--dg-line)", borderRadius: "10px", padding: "8px 16px", fontWeight: "600", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                  <Camera size={14} /> {cameraOn ? "📸 ثبت عکس" : "دوربین"}
                </button>
                {cameraOn && <button onClick={stopCamera} style={{ display: "flex", alignItems: "center", gap: "5px", backgroundColor: "var(--dg-bg)", color: "#dc2626", border: "1px solid #fecdd3", borderRadius: "10px", padding: "8px 14px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}><X size={13} /> لغو</button>}
                {userPhoto && <button onClick={downloadCanvas} style={{ display: "flex", alignItems: "center", gap: "5px", marginRight: "auto", backgroundColor: "var(--dg-bg)", color: "var(--dg-ink-2)", border: "1px solid var(--dg-line)", borderRadius: "10px", padding: "8px 14px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}><Download size={13} /> دانلود</button>}
              </div>

              {/* Camera preview */}
              {cameraOn && (
                <div style={{ position: "relative", marginBottom: "10px", borderRadius: "14px", overflow: "hidden", border: "2px solid var(--dg-primary)", backgroundColor: "#000" }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", display: "block", maxHeight: "380px", objectFit: "cover" }} />
                  <div style={{ position: "absolute", bottom: "14px", left: "50%", transform: "translateX(-50%)" }}>
                    <button onClick={capturePhoto} style={{ width: "54px", height: "54px", borderRadius: "50%", backgroundColor: "var(--dg-primary)", border: "3px solid #fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.3)" }}>
                      <Camera size={22} color="#fff" />
                    </button>
                  </div>
                </div>
              )}

              {/* Canvas */}
              <div className="tryon-canvas-box" style={{ position: "relative", border: "1px solid var(--dg-line)", borderRadius: "14px", overflow: "hidden", backgroundColor: "var(--dg-bg-2)", minHeight: "380px" }}>
                {!userPhoto && !cameraOn && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", pointerEvents: "none" }}>
                    <div style={{ width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "var(--dg-primary-soft)", border: "2px dashed var(--dg-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Upload size={22} color="var(--dg-primary)" />
                    </div>
                    <p style={{ color: "var(--dg-faint)", fontSize: "14px" }}>عکس خود را آپلود کنید</p>
                    <p style={{ color: "var(--dg-line-strong)", fontSize: "12px" }}>سپس زیورآلات را از پنل راست انتخاب کنید</p>
                  </div>
                )}
                <canvas ref={canvasRef} width={600} height={500}
                  onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                  style={{ display: "block", width: "100%", cursor: drag ? "grabbing" : "default", touchAction: "none" }} />
              </div>

              {/* Selected item controls */}
              {selected && (
                <div style={{ marginTop: "10px", backgroundColor: "var(--dg-primary-soft)", border: "1px solid var(--dg-primary-line)", borderRadius: "12px", padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ color: "var(--dg-ink-2)", fontSize: "12px", fontWeight: "700" }}>✏️ {selected.product.name}</span>
                    <button onClick={() => removeOverlay(selected.id)} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "1px solid #fecdd3", borderRadius: "8px", padding: "3px 9px", color: "#dc2626", cursor: "pointer", fontSize: "11px", fontFamily: "inherit" }}>
                      <Trash2 size={11} /> حذف
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <button onClick={() => updateOverlay(selected.id, { w: Math.max(30, selected.w - 12), h: Math.max(30, selected.h - 12) })} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--dg-line)", backgroundColor: "var(--dg-bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ZoomOut size={13} /></button>
                      <span style={{ color: "var(--dg-faint)", fontSize: "10px", minWidth: "35px", textAlign: "center" }}>{Math.round(selected.w)}px</span>
                      <button onClick={() => updateOverlay(selected.id, { w: selected.w + 12, h: selected.h + 12 })} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--dg-line)", backgroundColor: "var(--dg-bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ZoomIn size={13} /></button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <RotateCcw size={12} color="var(--dg-faint)" />
                      <input type="range" min="-180" max="180" value={selected.rot}
                        onChange={e => updateOverlay(selected.id, { rot: parseInt(e.target.value) })}
                        style={{ width: "90px", accentColor: "var(--dg-primary)" }} />
                      <span style={{ color: "var(--dg-faint)", fontSize: "10px" }}>{selected.rot}°</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--dg-faint)", fontSize: "11px" }}>
                      <Move size={11} /> بکشید تا جابجا شود
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: "10px", backgroundColor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "10px", padding: "9px 12px" }}>
                <p style={{ color: "#0369a1", fontSize: "11px", lineHeight: "1.7" }}>💡 روی زیورآلات کلیک کنید تا روی عکس قرار بگیرند · با ماوس جابجا کنید · گوشه را بکشید تا اندازه تغییر کند</p>
              </div>
            </div>

            {/* Product panel */}
            <div>
              <h3 style={{ color: "var(--dg-ink)", fontSize: "14px", fontWeight: "800", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "3px", height: "16px", backgroundColor: "var(--dg-primary)", borderRadius: "2px", display: "inline-block" }} />
                انتخاب زیورآلات
              </h3>

              {overlays.length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <p style={{ color: "var(--dg-faint)", fontSize: "10px", marginBottom: "5px" }}>آیتم‌های فعال روی تصویر:</p>
                  {overlays.map(ov => (
                    <div key={ov.id} onClick={() => setSelectedId(ov.id)}
                      style={{ display: "flex", alignItems: "center", gap: "7px", padding: "6px 9px", marginBottom: "4px", backgroundColor: ov.id === selectedId ? "var(--dg-primary-soft)" : "var(--dg-bg-2)", border: `1px solid ${ov.id === selectedId ? "var(--dg-primary)" : "var(--dg-line)"}`, borderRadius: "10px", cursor: "pointer" }}>
                      <img src={ov.src} alt="" style={{ width: "28px", height: "28px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--dg-line)", flexShrink: 0 }} />
                      <span style={{ color: "var(--dg-ink-2)", fontSize: "10px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ov.product.name}</span>
                      <button onClick={e => { e.stopPropagation(); removeOverlay(ov.id); }} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: "1px", flexShrink: 0 }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "7px", maxHeight: "500px", overflowY: "auto" }}>
                {products.map(p => {
                  const img = prodImg(p);
                  const on = overlays.some(o => o.product.id === p.id);
                  const isAdded = addedId === p.id;
                  return (
                    <div key={p.id} style={{ display: "flex", gap: "8px", alignItems: "center", padding: "8px 10px", backgroundColor: "var(--dg-bg)", border: `1px solid ${on ? "var(--dg-primary)" : "var(--dg-line)"}`, borderRadius: "12px", transition: "border-color 0.15s" }}
                      onMouseEnter={e => { if (!on) (e.currentTarget as HTMLElement).style.borderColor = "var(--dg-primary-line)"; }}
                      onMouseLeave={e => { if (!on) (e.currentTarget as HTMLElement).style.borderColor = "var(--dg-line)"; }}>
                      <img src={img} alt={p.name} style={{ width: "44px", height: "44px", objectFit: "cover", borderRadius: "10px", border: "1px solid var(--dg-line)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "var(--dg-ink-2)", fontSize: "11px", fontWeight: "600", marginBottom: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                        <p style={{ color: "var(--dg-faint)", fontSize: "9px" }}>{p.weight}گ · {p.karat}K</p>
                        <p style={{ color: "var(--dg-primary)", fontSize: "11px", fontWeight: "800" }}>{p.price.toLocaleString("fa-IR")} ت</p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0 }}>
                        <button onClick={() => on ? setSelectedId(overlays.find(o => o.product.id === p.id)!.id) : addOverlay(p)}
                          style={{ padding: "4px 8px", backgroundColor: on ? "var(--dg-primary-soft)" : "var(--dg-primary)", color: on ? "var(--dg-primary)" : "#fff", border: `1px solid ${on ? "var(--dg-primary)" : "transparent"}`, borderRadius: "8px", fontSize: "10px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                          {on ? "انتخاب" : "+ پرو"}
                        </button>
                        <button onClick={() => handleCartAdd(p)}
                          style={{ padding: "4px 8px", backgroundColor: isAdded ? "#dcfce7" : "#fff", color: isAdded ? "#16a34a" : "var(--dg-ink-2)", border: `1px solid ${isAdded ? "#86efac" : "var(--dg-line)"}`, borderRadius: "8px", fontSize: "10px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
                          {isAdded ? <><Check size={9} />افزوده</> : <><ShoppingCart size={9} />سبد</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Link href="/products" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginTop: "10px", color: "var(--dg-primary)", fontSize: "12px", textDecoration: "none", fontWeight: "600", padding: "8px", border: "1px solid var(--dg-primary-line)", borderRadius: "10px", backgroundColor: "var(--dg-primary-soft)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--dg-primary-soft)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--dg-primary-soft)"}>
                <ChevronLeft size={12} /> همه محصولات
              </Link>
            </div>
          </div>
        )}

        {/* ══════════════════ AI TAB ══════════════════ */}
        {tab === "ai" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px" }} className="tryon-grid">
            {/* AI Result area */}
            <div>
              {/* Step 1 — upload user photo */}
              <div style={{ backgroundColor: "var(--dg-primary-soft)", border: "1px solid var(--dg-primary-line)", borderRadius: "14px", padding: "16px 18px", marginBottom: "16px" }}>
                <p style={{ color: "var(--dg-ink-2)", fontSize: "13px", fontWeight: "700", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ backgroundColor: "var(--dg-primary)", color: "#fff", borderRadius: "50%", width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900", flexShrink: 0 }}>۱</span>
                  تصویر خود را آپلود کنید
                </p>
                <input ref={aFileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) loadAiPhoto(f); }} style={{ display: "none" }} />

                {/* Camera preview */}
                {aiCameraOn && (
                  <div style={{ position: "relative", marginBottom: "10px", borderRadius: "12px", overflow: "hidden", border: "2px solid var(--dg-primary)" }}>
                    <video ref={aVideoRef} autoPlay playsInline muted style={{ width: "100%", display: "block", maxHeight: "260px", objectFit: "cover" }} />
                    <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "10px" }}>
                      <button onClick={captureAiPhoto} style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--dg-primary)", border: "3px solid #fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                        <Camera size={20} color="#fff" />
                      </button>
                      <button onClick={stopAiCamera} style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--dg-bg)", border: "1px solid var(--dg-line)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={18} color="var(--dg-muted)" />
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {/* Preview thumbnail */}
                  {aiUserPhotoPreview && !aiCameraOn && (
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <img src={aiUserPhotoPreview} alt="your photo" style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "12px", border: "2px solid var(--dg-primary)" }} />
                      <button onClick={() => { setAiUserPhoto(null); setAiUserPhotoPreview(null); }}
                        style={{ position: "absolute", top: "-6px", left: "-6px", width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#dc2626", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
                        <X size={10} />
                      </button>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "6px", flex: 1 }}>
                    <button onClick={() => aFileRef.current?.click()}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", backgroundColor: "var(--dg-bg)", color: "var(--dg-ink-2)", border: "1px solid var(--dg-line)", borderRadius: "10px", padding: "8px 12px", fontWeight: "600", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                      <Upload size={13} /> {aiUserPhotoPreview ? "تغییر عکس" : "آپلود عکس"}
                    </button>
                    <button onClick={aiCameraOn ? stopAiCamera : startAiCamera}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", backgroundColor: aiCameraOn ? "#16a34a" : "#fff", color: aiCameraOn ? "#fff" : "var(--dg-ink-2)", border: "1px solid var(--dg-line)", borderRadius: "10px", padding: "8px 12px", fontWeight: "600", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                      <Camera size={13} /> {aiCameraOn ? "ثبت عکس" : "دوربین"}
                    </button>
                  </div>
                </div>
                {!aiUserPhotoPreview && !aiCameraOn && (
                  <p style={{ color: "var(--dg-faint)", fontSize: "11px", marginTop: "8px" }}>
                    عکس سلفی یا تصویری از دست/گردن خود آپلود کنید
                  </p>
                )}
              </div>

              {/* Result */}
              <div className="tryon-canvas-box" style={{ position: "relative", border: "1px solid var(--dg-line)", borderRadius: "14px", overflow: "hidden", backgroundColor: "var(--dg-bg-2)", minHeight: "360px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {aiLoading && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "40px" }}>
                    <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "var(--dg-primary-soft)", border: "3px solid var(--dg-primary)", display: "flex", alignItems: "center", justifyContent: "center", animation: "spin 1.5s linear infinite" }}>
                      <Sparkles size={24} color="var(--dg-primary)" />
                    </div>
                    <p style={{ color: "var(--dg-primary)", fontSize: "14px", fontWeight: "700" }}>هوش مصنوعی در حال ترکیب تصویر...</p>
                    <p style={{ color: "var(--dg-faint)", fontSize: "12px", textAlign: "center", maxWidth: "260px" }}>زیورآلات را روی تصویر شما قرار می‌دهیم. ۲۰–۴۰ ثانیه طول می‌کشد</p>
                  </div>
                )}
                {!aiLoading && !aiImage && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "40px 20px", textAlign: "center" }}>
                    <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "var(--dg-primary-soft)", border: "2px dashed var(--dg-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Wand2 size={26} color="var(--dg-primary)" />
                    </div>
                    <p style={{ color: "var(--dg-ink-2)", fontSize: "14px", fontWeight: "700" }}>تصویر ترکیبی هوش مصنوعی</p>
                    <p style={{ color: "var(--dg-faint)", fontSize: "12px", lineHeight: 1.7 }}>
                      تصویر خود را آپلود کنید، زیورآلات را انتخاب کنید<br />و دکمه «ترکیب با هوش مصنوعی» را بزنید
                    </p>
                  </div>
                )}
                {!aiLoading && aiImage && (
                  <img src={aiImage} alt="AI result" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                )}
              </div>

              {aiError && (
                <div style={{ marginTop: "10px", backgroundColor: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "12px", padding: "10px 14px", color: "#dc2626", fontSize: "13px" }}>
                  ⚠️ {aiError}
                </div>
              )}

              {aiImage && !aiLoading && (
                <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                  <button onClick={downloadAi} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "var(--dg-primary)", color: "#fff", border: "none", borderRadius: "12px", padding: "10px 20px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                    <Download size={15} /> دانلود تصویر
                  </button>
                  <button onClick={() => { setAiImage(null); setAiError(""); }} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "var(--dg-bg)", color: "var(--dg-ink-2)", border: "1px solid var(--dg-line)", borderRadius: "12px", padding: "10px 16px", fontWeight: "600", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                    <RefreshCw size={14} /> تصویر جدید
                  </button>
                </div>
              )}

            </div>

            {/* AI controls panel */}
            <div>
              <h3 style={{ color: "var(--dg-ink)", fontSize: "14px", fontWeight: "800", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ backgroundColor: "var(--dg-primary)", color: "#fff", borderRadius: "50%", width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900", flexShrink: 0 }}>۲</span>
                انتخاب زیورآلات و سبک
              </h3>

              {/* Style selector */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ color: "var(--dg-muted)", fontSize: "12px", display: "block", marginBottom: "6px", fontWeight: "600" }}>سبک تصویر</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {([
                    { key: "realistic", label: "واقع‌گرایانه" },
                    { key: "artistic",  label: "هنری" },
                    { key: "elegant",   label: "لاکچری" },
                  ] as { key: AiStyle; label: string }[]).map(s => (
                    <button key={s.key} onClick={() => setAiStyle(s.key)}
                      style={{ flex: 1, padding: "7px 4px", backgroundColor: aiStyle === s.key ? "var(--dg-primary)" : "var(--dg-bg-2)", color: aiStyle === s.key ? "#fff" : "var(--dg-muted)", border: `1px solid ${aiStyle === s.key ? "var(--dg-primary)" : "var(--dg-line)"}`, borderRadius: "10px", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra prompt */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ color: "var(--dg-muted)", fontSize: "12px", display: "block", marginBottom: "6px", fontWeight: "600" }}>توضیحات اضافی (اختیاری)</label>
                <input
                  value={aiPromptExtra}
                  onChange={e => setAiPromptExtra(e.target.value)}
                  placeholder="مثلاً: پوشش قرمز، لبخند، پس‌زمینه سفید..."
                  style={{ ...inp }}
                  onFocus={e => (e.target.style.borderColor = "var(--dg-primary)")}
                  onBlur={e => (e.target.style.borderColor = "var(--dg-line)")}
                />
              </div>

              {/* Product selection */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ color: "var(--dg-muted)", fontSize: "12px", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                  انتخاب زیورآلات <span style={{ color: "var(--dg-primary)" }}>({selectedProducts.size} انتخاب شده)</span>
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "320px", overflowY: "auto" }}>
                  {products.map(p => {
                    const img = prodImg(p);
                    const on = selectedProducts.has(p.id);
                    return (
                      <div key={p.id} onClick={() => toggleAiProduct(p.id)}
                        style={{ display: "flex", gap: "8px", alignItems: "center", padding: "7px 10px", backgroundColor: on ? "var(--dg-primary-soft)" : "#fff", border: `1px solid ${on ? "var(--dg-primary)" : "var(--dg-line)"}`, borderRadius: "10px", cursor: "pointer", transition: "all 0.15s" }}>
                        <img src={img} alt={p.name} style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--dg-line)", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "var(--dg-ink-2)", fontSize: "11px", fontWeight: on ? "700" : "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                          <p style={{ color: "var(--dg-faint)", fontSize: "9px" }}>{p.weight}گ · {p.karat}K</p>
                        </div>
                        <div style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: on ? "var(--dg-primary)" : "var(--dg-line)", border: `2px solid ${on ? "var(--dg-primary)" : "var(--dg-line)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {on && <Check size={10} color="#fff" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Generate button */}
              <button onClick={generateAI} disabled={aiLoading || selectedProducts.size === 0}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", backgroundColor: aiLoading || selectedProducts.size === 0 ? "var(--dg-line)" : "var(--dg-primary)", color: aiLoading || selectedProducts.size === 0 ? "var(--dg-faint)" : "#fff", border: "none", borderRadius: "12px", padding: "13px", fontWeight: "800", fontSize: "14px", cursor: aiLoading || selectedProducts.size === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background-color 0.2s" }}>
                {aiLoading
                  ? <><RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> در حال ترکیب تصویر...</>
                  : <><Sparkles size={16} /> ترکیب با هوش مصنوعی</>}
              </button>

              {/* Step indicator */}
              {!aiUserPhoto && selectedProducts.size > 0 && (
                <p style={{ color: "#f59e0b", fontSize: "11px", textAlign: "center", marginTop: "8px" }}>
                  ⚠️ ابتدا تصویر خود را در بخش سمت چپ آپلود کنید
                </p>
              )}
              {aiUserPhoto && selectedProducts.size === 0 && (
                <p style={{ color: "#f59e0b", fontSize: "11px", textAlign: "center", marginTop: "8px" }}>
                  ⚠️ حداقل یک محصول انتخاب کنید
                </p>
              )}
              {aiUserPhoto && selectedProducts.size > 0 && !aiLoading && !aiImage && (
                <p style={{ color: "#16a34a", fontSize: "11px", textAlign: "center", marginTop: "8px" }}>
                  ✓ آماده برای ترکیب
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .tryon-tabs { display: flex; gap: 4px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); border-radius: 16px; padding: 5px; }
        .tryon-tabs button { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 16px; border-radius: 12px; border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; background: transparent; color: rgba(255,255,255,.75); transition: all .2s; }
        .tryon-tabs button.on { background: #fff; color: var(--dg-primary); font-weight: 800; }
        .tryon-grid > div { min-width: 0; }
        @media(max-width:900px){
          .tryon-grid{ grid-template-columns: 1fr !important; }
          .tryon-canvas-box{ min-height: 260px !important; }
        }
        @media(max-width:600px){
          .tryon-wrap{ padding: 16px 12px !important; }
          .tryon-tabs{ width: 100%; }
          .tryon-tabs button{ flex: 1; }
          .tryon-tabs button{ font-size: 12px !important; padding: 9px 6px !important; white-space: nowrap; }
          .tryon-canvas-box{ min-height: 220px !important; }
        }
      `}</style>
      </>
      )}
    </PageLayout>
  );
}
