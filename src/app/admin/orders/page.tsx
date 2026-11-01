"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";

interface Order {
  id: string;
  total: number;
  status: string;
  address: string;
  note: string | null;
  createdAt: string;
  recipientFirstName: string;
  recipientLastName: string;
  recipientPhone: string;
  recipientEmail: string;
  province: string;
  county: string;
  postalCode: string;
  deliveryPhone: string;
  user: { name: string; email: string; phone?: string | null };
  items: { id: string; quantity: number; price: number; product: { name: string } }[];
}

const statusOptions = [
  { value: "PENDING",    label: "در انتظار",          color: "#f59e0b" },
  { value: "CONFIRMED",  label: "تأیید شده",          color: "#3b82f6" },
  { value: "PROCESSING", label: "در حال پردازش",      color: "#8b5cf6" },
  { value: "SHIPPED",    label: "ارسال شده",           color: "#06b6d4" },
  { value: "DELIVERED",  label: "تحویل داده شده",     color: "#10b981" },
  { value: "CANCELLED",  label: "لغو شده",            color: "#ef4444" },
];

function deliverySummary(order: Order) {
  if (order.province && order.county) {
    return `${order.province} · ${order.county}`;
  }
  return order.address || "—";
}

function DetailRow({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  if (!value) return null;
  return (
    <p style={{ color: "#888", fontSize: "12px", marginTop: "4px" }}>
      {label}: <span style={{ color: "#fff", direction: ltr ? "ltr" : "inherit", display: "inline-block" }}>{value}</span>
    </p>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/orders?limit=50");
    const data = await res.json();
    if (data.success) setOrders(data.data.orders);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function openOrderDetail(order: Order) {
    setSelected(order);
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await fetch(`/api/orders/${order.id}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setSelected(data.data);
      } else {
        setDetailError(data.error || "خطا در بارگذاری جزئیات");
      }
    } catch {
      setDetailError("خطای شبکه");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelected(null);
    setDetailError("");
  }

  async function updateStatus(orderId: string, status: string) {
    setUpdating(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMsg({ type: "err", text: data.error || "خطا در به‌روزرسانی وضعیت" });
        return;
      }
      const smsSent = data.data?.smsSent;
      const smsError = data.data?.smsError;
      const smsPhone = data.data?.smsPhone;
      if (smsSent) {
        setStatusMsg({ type: "ok", text: `وضعیت به‌روز شد و پیامک به ${smsPhone} ارسال شد` });
      } else if (smsError) {
        setStatusMsg({ type: "err", text: `وضعیت به‌روز شد ولی پیامک ارسال نشد: ${smsError}` });
      } else {
        setStatusMsg({ type: "ok", text: "وضعیت سفارش به‌روزرسانی شد" });
      }
      await fetchOrders();
      closeDetail();
    } catch {
      setStatusMsg({ type: "err", text: "خطای شبکه" });
    } finally {
      setUpdating(false);
    }
  }

  const getStatus = (s: string) => statusOptions.find(o => o.value === s);

  return (
    <div>
      <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: "700", marginBottom: "24px" }}>مدیریت سفارش‌ها</h2>

      {statusMsg && (
        <div style={{
          marginBottom: "16px", padding: "12px 14px", borderRadius: "8px", fontSize: "13px",
          backgroundColor: statusMsg.type === "ok" ? "#052e1a" : "#2a1215",
          border: `1px solid ${statusMsg.type === "ok" ? "#166534" : "#7f1d1d"}`,
          color: statusMsg.type === "ok" ? "#86efac" : "#fca5a5",
        }}>
          {statusMsg.text}
        </div>
      )}
      <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#161616" }}>
                {["شناسه", "مشتری", "دریافت‌کننده", "مبلغ", "مقصد", "وضعیت", "تاریخ", "جزئیات"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", color: "#888", fontSize: "12px", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#555" }}>در حال بارگذاری...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#555" }}>سفارشی ثبت نشده</td></tr>
              ) : orders.map(order => {
                const st = getStatus(order.status);
                const recipient = [order.recipientFirstName, order.recipientLastName].filter(Boolean).join(" ") || "—";
                return (
                  <tr key={order.id} style={{ borderTop: "1px solid #222" }}>
                    <td style={{ padding: "12px 16px", color: "#888", fontSize: "11px", fontFamily: "monospace" }}>{order.id.slice(0, 8)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <p style={{ color: "#fff", fontSize: "13px" }}>{order.user?.name ?? "—"}</p>
                      <p style={{ color: "#666", fontSize: "11px" }}>{order.user?.email ?? ""}</p>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#ccc", fontSize: "12px", whiteSpace: "nowrap" }}>{recipient}</td>
                    <td style={{ padding: "12px 16px", color: "#d4af37", fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap" }}>
                      {order.total.toLocaleString("fa-IR")} ت
                    </td>
                    <td style={{ padding: "12px 16px", color: "#888", fontSize: "12px", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deliverySummary(order)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ backgroundColor: `${st?.color}20`, color: st?.color, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600" }}>{st?.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#666", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {new Date(order.createdAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button onClick={() => openOrderDetail(order)} style={{ backgroundColor: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37", borderRadius: "6px", padding: "5px 12px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>
                        مشاهده
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
          <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", width: "100%", maxWidth: "620px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #2a2a2a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: "600" }}>جزئیات سفارش</h3>
              <button onClick={closeDetail} style={{ color: "#888", background: "none", border: "none", cursor: "pointer", fontSize: "20px" }}>×</button>
            </div>
            <div style={{ padding: "24px" }}>
              {detailLoading ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#d4af37" }}>در حال بارگذاری جزئیات...</div>
              ) : detailError ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#ef4444" }}>{detailError}</div>
              ) : (
              <>
              <div style={{ marginBottom: "16px" }}>
                <p style={{ color: "#888", fontSize: "12px" }}>مشتری (حساب): <span style={{ color: "#fff" }}>{selected.user?.name ?? "—"}</span></p>
                <DetailRow label="ایمیل حساب" value={selected.user?.email ?? ""} ltr />
              </div>

              <h4 style={{ color: "#d4af37", fontSize: "13px", marginBottom: "8px" }}>مشخصات فرد دریافت‌کننده</h4>
              <div style={{ backgroundColor: "#121212", borderRadius: "8px", padding: "12px 14px", marginBottom: "14px" }}>
                <DetailRow label="نام" value={[selected.recipientFirstName, selected.recipientLastName].filter(Boolean).join(" ")} />
                <DetailRow label="تلفن" value={selected.recipientPhone} ltr />
                <DetailRow label="ایمیل" value={selected.recipientEmail} ltr />
              </div>

              <h4 style={{ color: "#d4af37", fontSize: "13px", marginBottom: "8px" }}>مشخصات محل دریافت</h4>
              <div style={{ backgroundColor: "#121212", borderRadius: "8px", padding: "12px 14px", marginBottom: "14px" }}>
                <DetailRow label="استان" value={selected.province} />
                <DetailRow label="شهرستان" value={selected.county} />
                <DetailRow label="کد پستی" value={selected.postalCode} ltr />
                <DetailRow label="تلفن" value={selected.deliveryPhone} ltr />
                <DetailRow label="نشانی" value={selected.address} />
                {selected.note && <DetailRow label="توضیحات" value={selected.note} />}
              </div>

              <h4 style={{ color: "#d4af37", fontSize: "13px", marginBottom: "10px" }}>اقلام سفارش</h4>
              {(selected.items ?? []).length === 0 ? (
                <p style={{ color: "#666", fontSize: "13px", padding: "8px 0" }}>اقلامی ثبت نشده</p>
              ) : (selected.items ?? []).map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #222" }}>
                  <span style={{ color: "#fff", fontSize: "13px" }}>{item.product?.name ?? "محصول"} × {item.quantity}</span>
                  <span style={{ color: "#d4af37", fontSize: "13px" }}>{(item.price * item.quantity).toLocaleString("fa-IR")} ت</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontWeight: "700" }}>
                <span style={{ color: "#fff" }}>جمع کل</span>
                <span style={{ color: "#d4af37" }}>{selected.total.toLocaleString("fa-IR")} تومان</span>
              </div>

              <h4 style={{ color: "#d4af37", fontSize: "13px", marginBottom: "10px", marginTop: "16px" }}>تغییر وضعیت</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {statusOptions.map(st => (
                  <button key={st.value} onClick={() => updateStatus(selected.id, st.value)} disabled={updating || selected.status === st.value}
                    style={{ backgroundColor: selected.status === st.value ? `${st.color}30` : "transparent", border: `1px solid ${st.color}60`, color: st.color, borderRadius: "6px", padding: "8px 4px", cursor: selected.status === st.value ? "default" : "pointer", fontSize: "11px", fontFamily: "inherit", fontWeight: selected.status === st.value ? "700" : "400" }}>
                    {st.label}
                  </button>
                ))}
              </div>
              </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
