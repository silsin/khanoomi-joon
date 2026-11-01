"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Plus, Minus, ShoppingCart, ChevronLeft, CheckCircle } from "lucide-react";
import PageHero from "../components/PageHero";
import PageLayout from "../components/PageLayout";
import { useCart, cartLineKey } from "../components/CartContext";
import CheckoutShippingForm, {
  EMPTY_SHIPPING_FORM,
  validateShippingForm,
  firstShippingError,
  type OrderShippingInput,
} from "../components/CheckoutShippingForm";

interface UserProfile {
  name: string;
  email: string;
  phone: string | null;
  phone_login: string | null;
  address: string | null;
}

export default function CartPage() {
  const { items, count, total, remove, update, clear } = useCart();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [shipping, setShipping] = useState<OrderShippingInput>(EMPTY_SHIPPING_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof OrderShippingInput, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"cart" | "checkout">("cart");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setUser(d.data);
          const fullName = (d.data.name ?? "").trim();
          const parts = fullName.split(/\s+/);
          setShipping(prev => ({
            ...prev,
            recipientFirstName: parts[0] ?? prev.recipientFirstName,
            recipientLastName: parts.slice(1).join(" ") || prev.recipientLastName,
            recipientEmail: d.data.email ?? prev.recipientEmail,
            recipientPhone: d.data.phone_login ?? d.data.phone ?? prev.recipientPhone,
            deliveryPhone: d.data.phone_login ?? d.data.phone ?? prev.deliveryPhone,
            address: d.data.address ?? prev.address,
          }));
        }
      })
      .catch(() => {});
  }, []);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (!user) { router.push("/login?redirect=/cart"); return; }

    const errors = validateShippingForm(shipping);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(firstShippingError(errors) ?? "لطفاً فیلدهای الزامی را تکمیل کنید");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            variantWeight: i.variantWeight ?? null,
            giftPack: i.giftPack ?? null,
            postcard: i.postcard ?? null,
          })),
          ...shipping,
          note: shipping.note?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "خطا در ثبت سفارش"); return; }
      setOrderSuccess(data.data.id);
      clear();
    } catch {
      setError("خطای شبکه. دوباره تلاش کنید");
    } finally {
      setSubmitting(false);
    }
  }

  // Order success screen
  if (orderSuccess) {
    return (
      <PageLayout>
        <div style={{ maxWidth: 560, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, backgroundColor: "rgba(16,185,129,0.15)", border: "2px solid #10b981", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <CheckCircle size={36} color="#10b981" />
          </div>
          <h1 style={{ color: "var(--dg-ink)", fontSize: 24, fontWeight: 800, marginBottom: 12 }}>سفارش ثبت شد!</h1>
          <p style={{ color: "var(--dg-muted)", fontSize: 14, marginBottom: 8 }}>شماره سفارش شما:</p>
          <div style={{ backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: 12, padding: "10px 20px", display: "inline-block", marginBottom: 24 }}>
            <span style={{ color: "var(--dg-primary)", fontFamily: "monospace", fontSize: 14, letterSpacing: 1 }}>{orderSuccess}</span>
          </div>
          <p style={{ color: "var(--dg-muted)", fontSize: 13, marginBottom: 32, lineHeight: 1.8 }}>
            سفارش شما با موفقیت ثبت شد و در حال پردازش است.<br />
            می‌توانید وضعیت سفارش را در حساب کاربری خود پیگیری کنید.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/account" style={{ backgroundColor: "var(--dg-primary)", color: "#fff", textDecoration: "none", borderRadius: 12, padding: "11px 24px", fontWeight: 700, fontSize: 14 }}>
              مشاهده سفارش‌ها
            </Link>
            <Link href="/products" style={{ backgroundColor: "transparent", color: "var(--dg-muted)", textDecoration: "none", borderRadius: 12, padding: "11px 24px", fontWeight: 600, fontSize: 14, border: "1px solid var(--dg-line)" }}>
              ادامه خرید
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHero
        eyebrow="SHOPPING BAG"
        title={<><ShoppingCart size={24} /> سبد خرید</>}
        crumbs={[{ label: "سبد خرید" }]}
        subtitle={count > 0 ? `${count.toLocaleString("fa-IR")} کالا در سبد شما` : undefined}
        aside={items.length > 0 ? (
          <div className="cart-steps">
            {["سبد خرید", "اطلاعات ارسال", "ثبت سفارش"].map((label, i) => {
              const active = step === "cart" ? i === 0 : i <= 1;
              return (
                <div key={label} className={`cart-step${active ? " on" : ""}`}>
                  <span>{(i + 1).toLocaleString("fa-IR")}</span>{label}
                </div>
              );
            })}
          </div>
        ) : undefined}
      />
      <div className="cart-body" style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px 40px" }}>
        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-ic"><ShoppingCart size={34} /></div>
            <p style={{ color: "var(--dg-ink)", fontSize: 18, fontWeight: 800, marginBottom: 6 }}>سبد خرید شما خالی است</p>
            <p style={{ color: "var(--dg-muted)", fontSize: 13, marginBottom: 22 }}>از میان محصولات، طرح دلخواهتان را پیدا کنید.</p>
            <Link href="/products" style={{ backgroundColor: "var(--dg-primary)", color: "#fff", textDecoration: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 700, fontSize: 14 }}>
              مشاهده محصولات
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }} className="cart-grid">

            {/* Items list */}
            <div style={{ minWidth: 0 }}>
              {step === "cart" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {items.map(item => (
                    <div key={cartLineKey(item)} className="cart-item">
                      {/* Image */}
                      <div className="cart-item-img">
                        <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ color: "var(--dg-ink)", fontSize: 14, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</h3>
                        <p style={{ color: "var(--dg-muted)", fontSize: 12, marginBottom: item.giftPack || item.postcard ? 4 : 8 }}>{item.karat} عیار · {item.variantWeight ?? item.weight} گرم</p>
                        {(item.giftPack || item.postcard) && (
                          <p style={{ color: "var(--dg-muted)", fontSize: 11, marginBottom: 8 }}>
                            {item.giftPack && <>بسته‌بندی: {item.giftPack}</>}
                            {item.giftPack && item.postcard && " · "}
                            {item.postcard && <>کارت پستال: {item.postcard}</>}
                          </p>
                        )}
                        <p style={{ color: "var(--dg-ink)", fontSize: 16, fontWeight: 900 }}>
                          {(item.price * item.quantity).toLocaleString("fa-IR")}
                          <span style={{ color: "var(--dg-muted)", fontWeight: 400, fontSize: 12, marginRight: 4 }}>تومان</span>
                        </p>
                      </div>
                      {/* Quantity */}
                      <div className="cart-item-ctrl">
                        <div className="cart-qty">
                        <button onClick={() => update(cartLineKey(item), item.quantity - 1)}
                          style={{ width: 30, height: 30, backgroundColor: "#fff", border: "none", borderRadius: 999, color: "var(--dg-ink-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--dg-shadow-sm)" }}>
                          <Minus size={12} />
                        </button>
                        <span style={{ color: "var(--dg-ink)", fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                        <button onClick={() => update(cartLineKey(item), item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          style={{ width: 30, height: 30, backgroundColor: item.quantity >= item.stock ? "transparent" : "#fff", border: "none", borderRadius: 999, boxShadow: item.quantity >= item.stock ? "none" : "var(--dg-shadow-sm)", color: item.quantity >= item.stock ? "var(--dg-muted)" : "var(--dg-muted)", cursor: item.quantity >= item.stock ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Plus size={12} />
                        </button>
                        </div>
                        <button onClick={() => remove(cartLineKey(item))}
                          className="cart-del">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step === "checkout" && (
                <form onSubmit={handleCheckout} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {!user && (
                    <div style={{ backgroundColor: "color-mix(in srgb, var(--dg-primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--dg-primary) 20%, transparent)", borderRadius: 12, padding: "12px 16px" }}>
                      <p style={{ color: "var(--dg-primary)", fontSize: 13 }}>
                        برای ثبت سفارش باید{" "}
                        <Link href="/login?redirect=/cart" style={{ color: "var(--dg-primary)", fontWeight: 700 }}>وارد شوید</Link>
                        {" "}یا{" "}
                        <Link href="/login?tab=register&redirect=/cart" style={{ color: "var(--dg-primary)", fontWeight: 700 }}>ثبت‌نام کنید</Link>
                      </p>
                    </div>
                  )}

                  <CheckoutShippingForm
                    form={shipping}
                    onChange={setShipping}
                    fieldErrors={fieldErrors}
                    userName={user?.name}
                  />

                  {/* Order summary in checkout step */}
                  <div style={{ backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: 18, boxShadow: "var(--dg-shadow-sm)", padding: 16 }}>
                    <h4 style={{ color: "var(--dg-muted)", fontSize: 12, marginBottom: 10 }}>خلاصه سفارش</h4>
                    {items.map(item => (
                      <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--dg-line)", fontSize: 13 }}>
                        <span style={{ color: "var(--dg-muted)" }}>{item.name} × {item.quantity}</span>
                        <span style={{ color: "var(--dg-primary)" }}>{(item.price * item.quantity).toLocaleString("fa-IR")}</span>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" onClick={() => { setStep("cart"); setError(""); setFieldErrors({}); }}
                      style={{ flex: 1, backgroundColor: "transparent", color: "var(--dg-muted)", border: "1px solid var(--dg-line)", borderRadius: 12, padding: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
                      ← ویرایش سبد
                    </button>
                    <button type="submit" disabled={submitting || !user}
                      style={{ flex: 2, backgroundColor: submitting || !user ? "var(--dg-primary)" : "var(--dg-primary)", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontWeight: 800, fontSize: 15, cursor: submitting || !user ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                      {submitting ? "در حال ثبت..." : "ثبت سفارش نهایی"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Summary sidebar */}
            {step === "cart" && (
              <div className="cart-sum">
                <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 800, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, background: "var(--dg-gold)", transform: "rotate(45deg)", display: "inline-block" }} />خلاصه سفارش</h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  {items.map(item => (
                    <div key={cartLineKey(item)} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "rgba(255,255,255,.65)" }}>
                        {item.name}
                        {item.variantWeight ? ` (${item.variantWeight} گرم)` : ""} × {item.quantity}
                      </span>
                      <span style={{ color: "#fff", whiteSpace: "nowrap" }}>{(item.price * item.quantity).toLocaleString("fa-IR")}</span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: "1px dashed rgba(255,255,255,.2)", paddingTop: 14, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(255,255,255,.65)", fontSize: 13 }}>جمع کل</span>
                    <div style={{ textAlign: "left" }}>
                      <p className="cart-total">{total.toLocaleString("fa-IR")}</p>
                      <p style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>تومان</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!user) { router.push("/login?redirect=/cart"); return; }
                    setStep("checkout");
                    setError("");
                    setFieldErrors({});
                  }}
                  style={{ width: "100%", background: "var(--dg-grad-gold)", color: "#fff", border: "none", borderRadius: 14, padding: "14px", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
                  ادامه خرید
                </button>

                {!user && (
                  <p style={{ color: "rgba(255,255,255,.6)", fontSize: 12, textAlign: "center", marginTop: 10 }}>
                    برای ادامه باید <Link href="/login?redirect=/cart" style={{ color: "var(--dg-gold)" }}>وارد شوید</Link>
                  </p>
                )}

                <Link href="/products" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, color: "rgba(255,255,255,.6)", textDecoration: "none", fontSize: 12, marginTop: 12 }}>
                  <ChevronLeft size={12} /> ادامه خرید
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .cart-steps { display: flex; gap: 6px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15); padding: 5px; border-radius: 16px; flex-wrap: wrap; }
        .cart-step { display: flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 12px; color: rgba(255,255,255,.6); font-size: 12px; font-weight: 700; }
        .cart-step span { width: 20px; height: 20px; border-radius: 50%; border: 1px solid rgba(255,255,255,.35); display: flex; align-items: center; justify-content: center; font-size: 11px; }
        .cart-step.on { background: #fff; color: var(--dg-primary); }
        .cart-step.on span { background: var(--dg-grad-gold); border-color: transparent; color: #fff; }
        .cart-empty { text-align: center; padding: 60px 20px; background: #fff; border: 1px dashed var(--dg-line-strong); border-radius: 28px; max-width: 560px; margin: 10px auto; }
        .cart-empty-ic { width: 76px; height: 76px; border-radius: 24px; margin: 0 auto 18px; background: var(--dg-gold-soft); color: var(--dg-gold-deep); display: flex; align-items: center; justify-content: center; transform: rotate(-6deg); }
        .cart-item { position: relative; background: #fff; border: 1px solid var(--dg-line); border-radius: 24px; padding: 12px; display: flex; gap: 16px; align-items: center; transition: box-shadow .2s, border-color .2s; }
        .cart-item:hover { box-shadow: var(--dg-shadow); border-color: var(--dg-primary-line); }
        .cart-item-img { width: 104px; height: 104px; border-radius: 18px; overflow: hidden; flex-shrink: 0; background: radial-gradient(circle at 50% 40%, #fff, var(--dg-bg-2)); }
        .cart-item-ctrl { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; flex-shrink: 0; }
        .cart-qty { display: flex; align-items: center; gap: 8px; background: var(--dg-bg-2); padding: 4px; border-radius: 999px; }
        .cart-del { position: absolute; top: 10px; left: 10px; width: 28px; height: 28px; border-radius: 10px; border: none; background: transparent; color: var(--dg-faint); cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .cart-del:hover { background: #fff1f2; color: #e11d48; }
        .cart-item-ctrl { align-self: flex-end; }
        .cart-sum { position: sticky; top: 150px; padding: 24px; border-radius: 28px; color: #fff; background: var(--dg-ink); overflow: hidden; }
        .cart-sum::after { content: ""; position: absolute; left: -60px; bottom: -80px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(198,161,91,.3), transparent 70%); pointer-events: none; }
        .cart-sum > * { position: relative; z-index: 1; }
        .cart-total { font-size: 26px; font-weight: 900; background: var(--dg-grad-gold); -webkit-background-clip: text; background-clip: text; color: transparent; }
        @media (max-width: 768px) {
          .cart-item-img { width: 80px; height: 80px; border-radius: 14px; }
          .cart-steps { width: 100%; }
          .cart-step { flex: 1; justify-content: center; padding: 7px 6px; font-size: 11px; }
          .cart-grid { grid-template-columns: 1fr !important; }
          .checkout-shipping-grid { grid-template-columns: 1fr !important; }
          .cart-item { flex-wrap: wrap; gap: 12px; }
          .cart-body { padding: 20px 12px 32px !important; }
        }
      `}</style>
    </PageLayout>
  );
}
