"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";

interface User {
  id: string; name: string; email: string;
  phone: string | null; phone_login: string | null;
  role: string; created_at: string; order_count: number;
}

export default function AdminUsersPage() {
  const [users, setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const url = search
      ? `/api/admin/users?search=${encodeURIComponent(search)}`
      : "/api/admin/users";
    const res  = await fetch(url);
    const data = await res.json();
    if (data.success) setUsers(data.data.users);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div>
      <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: "700", marginBottom: "24px" }}>
        مدیریت کاربران
      </h2>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "16px", maxWidth: "360px" }}>
        <Search size={15} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#888" }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="جستجو با نام، موبایل..."
          style={{ width: "100%", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "8px 36px 8px 12px", color: "#fff", fontSize: "13px", outline: "none" }}
        />
      </div>

      <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#161616" }}>
                {["نام", "موبایل", "ایمیل", "نقش", "سفارش‌ها", "تاریخ عضویت"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", color: "#888", fontSize: "12px", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#555" }}>در حال بارگذاری...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#555" }}>کاربری یافت نشد</td></tr>
              ) : users.map(u => (
                <tr key={u.id} style={{ borderTop: "1px solid #222" }}>
                  <td style={{ padding: "12px 16px", color: "#fff", fontSize: "13px" }}>{u.name}</td>
                  <td style={{ padding: "12px 16px", color: "#d4af37", fontSize: "13px", direction: "ltr", fontWeight: "600" }}>
                    {u.phone_login || u.phone || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#888", fontSize: "12px", direction: "ltr" }}>
                    {u.email?.includes("@phone.local") ? "—" : (u.email || "—")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      backgroundColor: u.role === "ADMIN" ? "rgba(212,175,55,0.15)" : "rgba(59,130,246,0.15)",
                      color: u.role === "ADMIN" ? "#d4af37" : "#3b82f6",
                      padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
                    }}>
                      {u.role === "ADMIN" ? "ادمین" : "مشتری"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#888", fontSize: "13px", textAlign: "center" }}>
                    {u.order_count ?? 0}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#666", fontSize: "12px", whiteSpace: "nowrap" }}>
                    {new Date(u.created_at).toLocaleDateString("fa-IR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
