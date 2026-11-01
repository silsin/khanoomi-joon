"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  User, Package, LogOut, Save, Phone, MapPin, Mail,
  ChevronDown, ChevronUp, Clock, CheckCircle,
  Truck, XCircle, RefreshCw, ShoppingBag,
} from "lucide-react";
import PageLayout from "../components/PageLayout";

interface UserProfile {
  id: string; name: string; email: string;
  phone: string | null; phone_login: string | null; address: string | null; role: string;
}
interface OrderItem {
  id: string; quantity: number; price: number;
  product_name: string; product_images: string;
}
interface Order {
  id: string; status: string; total: number;
  address: string | null; note: string | null;
  createdAt?: string;
  created_at?: string;
  recipientFirstName?: string;
  recipientLastName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  province?: string;
  county?: string;
  postalCode?: string;
  deliveryPhone?: string;
  items?: OrderItem[];
}

const STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:    { label: "در انتظار بررسی", color: "#f59e0b", icon: <Clock size={13} /> },
  CONFIRMED:  { label: "تأیید شده",       color: "#3b82f6", icon: <CheckCircle size={13} /> },
  PROCESSING: { label: "در حال پردازش",   color: "#8b5cf6", icon: <RefreshCw size={13} /> },
  SHIPPED:    { label: "ارسال شده",        color: "#06b6d4", icon: <Truck size={13} /> },
  DELIVERED:  { label: "تحویل داده شده",  color: "#10b981", icon: <CheckCircle size={13} /> },
  CANCELLED:  { label: "لغو شده",         color: "#ef4444", icon: <XCircle size={13} /> },
};

type Tab = "profile" | "orders";

function getImg(images: string): string | null {
  try { const a = JSON.parse(images); return a[0] || null; } catch { return null; }
}
function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
}
function orderDate(order: Order) {
  return formatDate(order.createdAt ?? order.created_at ?? "");
}

// ── Invoice Modal ──────────────────────────────────────────────────────────
function InvoiceModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const st = STATUS[order.status] ?? STATUS.PENDING;
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}>
      <div style={{ backgroundColor: "var(--dg-bg-2)", border: "1px solid var(--dg-line)", borderRadius: 18, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--dg-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: "var(--dg-muted)", fontSize: 11, marginBottom: 2 }}>فاکتور سفارش</p>
            <p style={{ color: "var(--dg-ink)", fontSize: 15, fontWeight: 700, fontFamily: "monospace" }}>#{order.id.slice(0, 12)}</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--dg-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: `${st.color}18`, border: `1px solid ${st.color}50`, borderRadius: 20, padding: "4px 12px" }}>
              <span style={{ color: st.color }}>{st.icon}</span>
              <span style={{ color: st.color, fontSize: 12, fontWeight: 600 }}>{st.label}</span>
            </div>
            <span style={{ color: "var(--dg-muted)", fontSize: 12 }}>{orderDate(order)}</span>
          </div>
          {order.items?.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--dg-line)" }}>
              {getImg(item.product_images) && (
                <img src={getImg(item.product_images)!} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "var(--dg-ink)", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.product_name}</p>
                <p style={{ color: "var(--dg-muted)", fontSize: 11 }}>{item.quantity} × {item.price.toLocaleString("fa-IR")} ت</p>
              </div>
              <p style={{ color: "var(--dg-primary)", fontSize: 13, fontWeight: 700 }}>{(item.price * item.quantity).toLocaleString("fa-IR")}</p>
            </div>
          ))}
          {(order.province || order.address) && (
            <div style={{ marginTop: 14 }}>
              <p style={{ color: "var(--dg-muted)", fontSize: 11, marginBottom: 8, fontWeight: 600 }}>اطلاعات تحویل</p>
              {(order.recipientFirstName || order.recipientLastName) && (
                <p style={{ color: "var(--dg-ink)", fontSize: 13, marginBottom: 4 }}>
                  {[order.recipientFirstName, order.recipientLastName].filter(Boolean).join(" ")}
                </p>
              )}
              {order.recipientPhone && (
                <p style={{ color: "var(--dg-muted)", fontSize: 12, marginBottom: 4, direction: "ltr", textAlign: "right" }}>{order.recipientPhone}</p>
              )}
              {(order.province || order.county) && (
                <p style={{ color: "var(--dg-muted)", fontSize: 12, marginBottom: 4 }}>
                  {[order.province, order.county].filter(Boolean).join(" · ")}
                  {order.postalCode ? ` · کد پستی: ${order.postalCode}` : ""}
                </p>
              )}
              {order.address && (
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <MapPin size={14} color="var(--dg-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ color: "var(--dg-muted)", fontSize: 13, lineHeight: 1.6 }}>{order.address}</p>
                </div>
              )}
              {order.note && (
                <p style={{ color: "var(--dg-muted)", fontSize: 12, marginTop: 8 }}>توضیحات: {order.note}</p>
              )}
            </div>
          )}
          <div style={{ marginTop: 16, backgroundColor: "color-mix(in srgb,var(--dg-primary) 8%,transparent)", border: "1px solid color-mix(in srgb,var(--dg-primary) 20%,transparent)", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--dg-muted)", fontSize: 14 }}>جمع کل</span>
            <div>
              <span style={{ color: "var(--dg-primary)", fontSize: 22, fontWeight: 900 }}>{order.total.toLocaleString("fa-IR")}</span>
              <span style={{ color: "var(--dg-muted)", fontSize: 12, marginRight: 6 }}>تومان</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab]           = useState<Tab>((searchParams.get("tab") as Tab) === "orders" ? "orders" : "profile");
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // «سفارش‌های من» links to /account?tab=orders — a same-route navigation keeps
  // this component mounted, so the useState initialiser never re-runs. Re-read
  // the URL whenever it actually changes (the ref guard keeps a locally picked
  // tab intact even if the searchParams context re-renders).
  const urlTab = useRef(searchParams.get("tab"));
  useEffect(() => {
    const next = searchParams.get("tab");
    if (next === urlTab.current) return;
    urlTab.current = next;
    setTab(next === "orders" ? "orders" : "profile");
  }, [searchParams]);

  // Profile form
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (!d.success) { router.push("/login?redirect=/account"); return; }
        setProfile(d.data);
        setName(d.data.name || "");
        setEmail(d.data.email?.includes("@phone.local") ? "" : (d.data.email || ""));
        setAddress(d.data.address || "");
      })
      .catch(() => router.push("/login?redirect=/account"))
      .finally(() => setLoading(false));
  }, [router]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/orders?limit=50");
      const data = await res.json();
      if (data.success) setOrders(data.data.orders);
    } catch {} finally { setOrdersLoading(false); }
  }, []);

  useEffect(() => { if (tab === "orders") fetchOrders(); }, [tab, fetchOrders]);

  async function fetchOrderDetail(orderId: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success) setSelectedOrder(data.data);
    } catch {}
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveMsg(""); setSaveErr("");
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, email }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveErr(data.error || "خطا"); return; }
      setProfile(data.data);
      setSaveMsg("اطلاعات با موفقیت ذخیره شد");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch { setSaveErr("خطای شبکه"); } finally { setSaving(false); }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/"); router.refresh();
  }

  if (loading) return (
    <PageLayout>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ color: "var(--dg-primary)" }}>در حال بارگذاری...</div>
      </div>
    </PageLayout>
  );
  if (!profile) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%", backgroundColor: "var(--dg-bg-2)", border: "1px solid var(--dg-line)",
    borderRadius: 12, padding: "10px 14px", color: "var(--dg-ink)", fontSize: 14,
    outline: "none", fontFamily: "inherit",
  };
  const readonlyStyle: React.CSSProperties = {
    ...inputStyle, color: "var(--dg-muted)", cursor: "not-allowed", backgroundColor: "var(--dg-surface)",
  };

  const displayPhone = profile.phone_login || profile.phone || "—";

  return (
    <PageLayout>
      <div className="account-body acc-shell">
        {/* ── Sidebar: identity + nav ── */}
        <aside className="acc-side">
          <div className="acc-id">
            <div className="acc-avatar">{(profile.name || "؟").trim().charAt(0)}</div>
            <h1>{profile.name}</h1>
            <p style={{ direction: "ltr" }}>{displayPhone}</p>
          </div>
          <nav className="acc-nav">
            {([
              { key: "profile", label: "اطلاعات حساب", icon: <User size={16} /> },
              { key: "orders",  label: "سفارش‌های من",  icon: <Package size={16} /> },
            ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? "on" : ""}>
                <span className="acc-nav-ic">{t.icon}</span>{t.label}
              </button>
            ))}
            <button onClick={handleLogout} className="acc-logout">
              <span className="acc-nav-ic"><LogOut size={16} /></span>خروج از حساب
            </button>
          </nav>
        </aside>

        <div className="acc-main">
          <div className="acc-main-head">
            <span>MY ACCOUNT</span>
            <h2>{tab === "orders" ? "سفارش‌های من" : "اطلاعات حساب"}</h2>
          </div>

        {/* ── Profile Tab ── */}
        {tab === "profile" && (
          <form onSubmit={handleSaveProfile}>
            <div className="account-card" style={{ backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: 24, boxShadow: "var(--dg-shadow-sm)", padding: 26 }}>
              <h2 style={{ color: "var(--dg-ink)", fontSize: 16, fontWeight: 700, marginBottom: 22 }}>ویرایش اطلاعات شخصی</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="profile-grid">
                <div>
                  <label style={{ color: "var(--dg-muted)", fontSize: 12, display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                    <User size={12} color="var(--dg-primary)" /> نام کامل
                  </label>
                  <input value={name} onChange={e => setName(e.target.value)} required style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "var(--dg-primary)")}
                    onBlur={e => (e.target.style.borderColor = "var(--dg-line)")} />
                </div>
                <div>
                  <label style={{ color: "var(--dg-muted)", fontSize: 12, display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                    <Phone size={12} color="var(--dg-primary)" /> شماره موبایل <span style={{ color: "var(--dg-faint)", fontSize: 10 }}>(قابل تغییر نیست)</span>
                  </label>
                  <input value={displayPhone} readOnly style={{ ...readonlyStyle, direction: "ltr", letterSpacing: "1px" }} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "var(--dg-muted)", fontSize: 12, display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <Mail size={12} color="var(--dg-primary)" /> ایمیل <span style={{ color: "var(--dg-faint)", fontSize: 10 }}>(اختیاری)</span>
                </label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  type="email" placeholder="example@email.com"
                  style={{ ...inputStyle, direction: "ltr", maxWidth: 300 }}
                  onFocus={e => (e.target.style.borderColor = "var(--dg-primary)")}
                  onBlur={e => (e.target.style.borderColor = "var(--dg-line)")} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ color: "var(--dg-muted)", fontSize: 12, display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <MapPin size={12} color="var(--dg-primary)" /> آدرس پیش‌فرض
                </label>
                <textarea value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="آدرس پیش‌فرض برای سفارش‌ها..." rows={3}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  onFocus={e => (e.target.style.borderColor = "var(--dg-primary)")}
                  onBlur={e => (e.target.style.borderColor = "var(--dg-line)")} />
              </div>

              {saveMsg && <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "10px 14px", color: "#10b981", fontSize: 13, marginBottom: 14 }}>✓ {saveMsg}</div>}
              {saveErr && <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 14 }}>{saveErr}</div>}

              <button type="submit" disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "var(--dg-primary)", color: "#fff", border: "none", borderRadius: 12, padding: "11px 24px", fontWeight: 800, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                <Save size={15} /> {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </button>
            </div>
          </form>
        )}

        {/* ── Orders Tab ── */}
        {tab === "orders" && (
          <div>
            {ordersLoading ? (
              <div style={{ textAlign: "center", padding: 60, color: "var(--dg-muted)" }}>در حال بارگذاری...</div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <ShoppingBag size={52} color="var(--dg-line)" style={{ margin: "0 auto 16px" }} />
                <p style={{ color: "var(--dg-muted)", fontSize: 15, marginBottom: 20 }}>هنوز سفارشی ندارید</p>
                <Link href="/products" style={{ backgroundColor: "var(--dg-primary)", color: "#fff", textDecoration: "none", borderRadius: 12, padding: "11px 24px", fontWeight: 700, fontSize: 14 }}>شروع خرید</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {orders.map(order => {
                  const st = STATUS[order.status] ?? STATUS.PENDING;
                  const isExpanded = expandedOrder === order.id;
                  return (
                    <div key={order.id} className="acc-order" style={{ borderRightColor: st.color }}>
                      <div className="order-row" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ color: "var(--dg-muted)", fontSize: 12, fontFamily: "monospace", flex: 1, minWidth: 0 }}>#{order.id.slice(0, 10)}</span>
                        <span style={{ color: "var(--dg-muted)", fontSize: 12 }}>{orderDate(order)}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, backgroundColor: `${st.color}18`, border: `1px solid ${st.color}40`, borderRadius: 20, padding: "3px 10px" }}>
                          <span style={{ color: st.color }}>{st.icon}</span>
                          <span style={{ color: st.color, fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                        </div>
                        <span style={{ color: "var(--dg-primary)", fontSize: 14, fontWeight: 700 }}>{order.total.toLocaleString("fa-IR")} ت</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => fetchOrderDetail(order.id)}
                            style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: "color-mix(in srgb,var(--dg-primary) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--dg-primary) 25%,transparent)", borderRadius: 10, padding: "5px 10px", color: "var(--dg-primary)", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
                            فاکتور
                          </button>
                          <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                            style={{ width: 28, height: 28, backgroundColor: "var(--dg-bg-2)", border: "1px solid var(--dg-line)", borderRadius: 10, color: "var(--dg-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>
                      {isExpanded && order.items && (
                        <div style={{ borderTop: "1px solid var(--dg-line)", padding: "12px 18px", backgroundColor: "var(--dg-bg-2)" }}>
                          {order.items.map(item => (
                            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                              {getImg(item.product_images) && <img src={getImg(item.product_images)!} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />}
                              <span style={{ color: "var(--dg-muted)", fontSize: 13, flex: 1 }}>{item.product_name}</span>
                              <span style={{ color: "var(--dg-muted)", fontSize: 12 }}>× {item.quantity}</span>
                              <span style={{ color: "var(--dg-primary)", fontSize: 12, fontWeight: 700 }}>{(item.price * item.quantity).toLocaleString("fa-IR")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {selectedOrder && <InvoiceModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      <style>{`
        .acc-shell { max-width: 1280px; margin: 0 auto; padding: 28px 16px 40px; display: grid; grid-template-columns: 290px minmax(0,1fr); gap: 24px; align-items: start; }
        .acc-side { position: sticky; top: 150px; display: flex; flex-direction: column; gap: 12px; }
        .acc-id { position: relative; overflow: hidden; text-align: center; padding: 28px 20px 22px; border-radius: 28px; background: radial-gradient(120% 140% at 100% 0%, #17765a 0%, var(--dg-primary) 45%, var(--dg-primary-deep) 100%); }
        .acc-id::before { content: ""; position: absolute; left: -50px; top: -60px; width: 170px; height: 170px; border-radius: 50%; border: 2px solid rgba(198,161,91,.35); }
        .acc-avatar { position: relative; width: 72px; height: 72px; margin: 0 auto 12px; border-radius: 24px; background: var(--dg-grad-gold); color: #fff; font-size: 30px; font-weight: 900; display: flex; align-items: center; justify-content: center; transform: rotate(-6deg); box-shadow: 0 10px 24px rgba(0,0,0,.25); }
        .acc-id h1 { position: relative; color: #fff; font-size: 17px; font-weight: 900; margin: 0 0 4px; }
        .acc-id p { position: relative; color: rgba(255,255,255,.65); font-size: 13px; margin: 0; }
        .acc-nav { display: flex; flex-direction: column; gap: 4px; background: #fff; border: 1px solid var(--dg-line); border-radius: 24px; padding: 8px; box-shadow: var(--dg-shadow-sm); }
        .acc-nav button { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: none; background: transparent; border-radius: 16px; font-family: inherit; font-size: 14px; color: var(--dg-ink-2); cursor: pointer; text-align: right; transition: background .2s; }
        .acc-nav button:hover { background: var(--dg-bg); }
        .acc-nav-ic { width: 34px; height: 34px; border-radius: 11px; background: var(--dg-bg-2); color: var(--dg-muted); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .acc-nav button.on { background: var(--dg-primary-soft); color: var(--dg-primary); font-weight: 800; }
        .acc-nav button.on .acc-nav-ic { background: var(--dg-primary); color: #fff; }
        .acc-logout { color: #e11d48 !important; margin-top: 4px; border-top: 1px dashed var(--dg-line) !important; border-radius: 0 0 16px 16px !important; padding-top: 14px !important; }
        .acc-logout .acc-nav-ic { background: #fff1f2; color: #e11d48; }
        .acc-main-head { margin-bottom: 16px; }
        .acc-main-head span { color: var(--dg-gold-deep); font-size: 11px; font-weight: 800; letter-spacing: 3px; }
        .acc-main-head h2 { color: var(--dg-ink); font-size: 24px; font-weight: 900; margin: 4px 0 0; }
        .acc-order { background: #fff; border: 1px solid var(--dg-line); border-right: 4px solid; border-radius: 20px; box-shadow: var(--dg-shadow-sm); overflow: hidden; }
        @media(max-width:900px){
          .acc-shell { grid-template-columns: 1fr; padding: 14px 12px 32px; }
          .acc-side { position: static; }
          .acc-id { display: flex; align-items: center; gap: 14px; text-align: right; padding: 18px; border-radius: 22px; }
          .acc-avatar { margin: 0; width: 54px; height: 54px; font-size: 22px; border-radius: 18px; }
          .acc-nav { flex-direction: row; overflow-x: auto; }
          .acc-nav button { flex-shrink: 0; }
          .acc-logout { border-top: none !important; margin-top: 0; border-radius: 16px !important; padding-top: 10px !important; }
        }
        @media(max-width:600px){.profile-grid{grid-template-columns:1fr !important}.account-card{padding:18px 14px !important;}.order-row{padding:12px 14px !important;gap:8px !important;}}`}</style>
    </PageLayout>
  );
}

/**
 * `useSearchParams` needs a Suspense boundary when the page is prerendered, so
 * the account page renders `AccountContent` (which reads `?tab=`) inside one.
 */
export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountContent />
    </Suspense>
  );
}
