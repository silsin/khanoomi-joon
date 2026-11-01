"use client";
import { useEffect, useState } from "react";
import { Users, Package, ShoppingBag, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
}

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
}

const statusLabel: Record<string, { label: string; color: string }> = {
  PENDING:    { label: "در انتظار", color: "#f59e0b" },
  CONFIRMED:  { label: "تأیید شده", color: "#3b82f6" },
  PROCESSING: { label: "در حال پردازش", color: "#8b5cf6" },
  SHIPPED:    { label: "ارسال شده", color: "#06b6d4" },
  DELIVERED:  { label: "تحویل داده شده", color: "#10b981" },
  CANCELLED:  { label: "لغو شده", color: "#ef4444" },
};

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
      <div style={{ width: "48px", height: "48px", backgroundColor: `${color}20`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p style={{ color: "#888", fontSize: "12px", marginBottom: "4px" }}>{label}</p>
        <p style={{ color: "#fff", fontSize: "22px", fontWeight: "700", lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ color: "#666", fontSize: "11px", marginTop: "4px" }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setStats(d.data.stats);
          setRecentOrders(d.data.recentOrders);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px" }}>
        <div style={{ color: "#d4af37", fontSize: "16px" }}>در حال بارگذاری...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: "#fff", fontSize: "22px", fontWeight: "700", marginBottom: "24px" }}>داشبورد</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <StatCard icon={<Users size={22} />} label="کاربران" value={stats?.totalUsers ?? 0} color="#3b82f6" />
        <StatCard icon={<Package size={22} />} label="محصولات" value={stats?.totalProducts ?? 0} color="#d4af37" />
        <StatCard icon={<ShoppingBag size={22} />} label="سفارش‌ها" value={stats?.totalOrders ?? 0} color="#8b5cf6" />
        <StatCard icon={<TrendingUp size={22} />} label="درآمد کل" value={`${(stats?.totalRevenue ?? 0).toLocaleString("fa-IR")} تومان`} color="#10b981" />
        <StatCard icon={<Clock size={22} />} label="سفارش‌های در انتظار" value={stats?.pendingOrders ?? 0} color="#f59e0b" sub="نیاز به پیگیری" />
      </div>

      <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle size={16} color="#d4af37" />
          <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: "600" }}>آخرین سفارش‌ها</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#161616" }}>
                {["شناسه", "مشتری", "مبلغ", "وضعیت", "تاریخ"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", color: "#888", fontSize: "12px", fontWeight: "600", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#555" }}>سفارشی ثبت نشده</td></tr>
              ) : recentOrders.map(order => (
                <tr key={order.id} style={{ borderTop: "1px solid #222" }}>
                  <td style={{ padding: "12px 16px", color: "#888", fontSize: "12px", fontFamily: "monospace" }}>{order.id.slice(0, 8)}...</td>
                  <td style={{ padding: "12px 16px" }}>
                    <p style={{ color: "#fff", fontSize: "13px" }}>{order.user?.name ?? "—"}</p>
                    <p style={{ color: "#666", fontSize: "11px" }}>{order.user?.email ?? ""}</p>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#d4af37", fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap" }}>
                    {order.total.toLocaleString("fa-IR")} تومان
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ backgroundColor: `${statusLabel[order.status]?.color}20`, color: statusLabel[order.status]?.color, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", whiteSpace: "nowrap" }}>
                      {statusLabel[order.status]?.label ?? order.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#666", fontSize: "12px", whiteSpace: "nowrap" }}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString("fa-IR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recentOrders.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #222" }}>
            <a href="/admin/orders" style={{ color: "#d4af37", fontSize: "13px", textDecoration: "none" }}>مشاهده همه سفارش‌ها ←</a>
          </div>
        )}
      </div>
    </div>
  );
}
