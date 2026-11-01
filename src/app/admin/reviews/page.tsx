"use client";
export const dynamic = "force-dynamic";
import { useCallback, useEffect, useState } from "react";
import { Check, X, Trash2, Star, RefreshCw } from "lucide-react";
import AdminGuard from "../AdminGuard";

/**
 * «دیدگاه‌ها» moderation — customer reviews arrive as PENDING (hidden from the
 * product page) and are approved/rejected from this list.
 */

interface Review {
  id: string;
  name: string;
  rating: number;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  product: { name: string; slug: string } | null;
}

const FILTERS = [
  { value: "", label: "همه" },
  { value: "PENDING", label: "در انتظار تأیید" },
  { value: "APPROVED", label: "تأیید شده" },
  { value: "REJECTED", label: "رد شده" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:  { bg: "rgba(212,175,55,0.15)", color: "#d4af37", label: "در انتظار تأیید" },
  APPROVED: { bg: "rgba(74,222,128,0.12)", color: "#4ade80", label: "تأیید شده" },
  REJECTED: { bg: "rgba(239,68,68,0.12)",  color: "#ef4444", label: "رد شده" },
};

const btn: React.CSSProperties = {
  background: "#2a2a2a", border: "none", borderRadius: 6, padding: "6px 10px",
  cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
  fontFamily: "inherit", color: "#ccc", fontSize: 11,
};

export default function AdminReviewsPage() {
  const [items, setItems]     = useState<Review[]>([]);
  const [counts, setCounts]   = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [status, setStatus]   = useState("");
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId]   = useState<string | null>(null);
  const [err, setErr]         = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/reviews?${params}`);
      const d = await res.json();
      if (d.success) {
        setItems(d.data.reviews);
        setCounts(d.data.counts);
        setPages(d.data.pagination.pages || 1);
        setTotal(d.data.pagination.total);
      } else {
        setErr(d.error || "خطا در دریافت دیدگاه‌ها");
      }
    } catch { setErr("خطای شبکه"); }
    setLoading(false);
  }, [page, status]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function setReviewStatus(id: string, next: "APPROVED" | "REJECTED" | "PENDING") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) await fetchAll();
    } catch { setErr("خطای شبکه"); }
    setBusyId(null);
  }

  async function removeReview(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (res.ok) await fetchAll();
    } catch { setErr("خطای شبکه"); }
    setBusyId(null);
  }

  return (
    <AdminGuard>
      <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Star size={22} color="#d4af37" />
            <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}>دیدگاه‌ها</h1>
            <span style={{ color: "#666", fontSize: 12 }}>({total} مورد)</span>
          </div>
          <button onClick={fetchAll} title="بروزرسانی" style={{ ...btn, padding: 8 }}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </button>
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {FILTERS.map(f => {
            const active = status === f.value;
            const count = f.value === "" ? counts.all
              : f.value === "PENDING" ? counts.pending
              : f.value === "APPROVED" ? counts.approved
              : counts.rejected;
            return (
              <button key={f.value} onClick={() => { setStatus(f.value); setPage(1); }}
                style={{
                  background: active ? "#d4af37" : "#1a1a1a",
                  color: active ? "#000" : "#ccc",
                  border: `1px solid ${active ? "#d4af37" : "#2a2a2a"}`,
                  borderRadius: 8, padding: "8px 14px", fontSize: 12,
                  fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}>
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        {err && (
          <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "10px 14px", marginBottom: 14, color: "#ef4444", fontSize: 13 }}>
            {err}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888", fontSize: 13 }}>در حال بارگذاری...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888", fontSize: 13 }}>دیدگاهی یافت نشد</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map(r => {
              const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.PENDING;
              const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString("fa-IR") : "";
              return (
                <div key={r.id} style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    <p style={{ color: "#fff", fontSize: 13, fontWeight: 700, margin: 0 }}>{r.name}</p>
                    <span style={{ display: "flex", gap: 2 }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={12} color="#d4af37" fill={i <= r.rating ? "#d4af37" : "none"} />
                      ))}
                    </span>
                    <span style={{ backgroundColor: st.bg, color: st.color, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 8px" }}>{st.label}</span>
                    <span style={{ color: "#666", fontSize: 11, marginRight: "auto" }}>{date}</span>
                  </div>

                  {r.product && (
                    <a href={`/products/${r.product.slug}`} target="_blank" rel="noreferrer"
                      style={{ color: "#d4af37", fontSize: 11, textDecoration: "none" }}>
                      {r.product.name} ↗
                    </a>
                  )}

                  <p style={{ color: "#bbb", fontSize: 13, lineHeight: 1.9, margin: "8px 0 12px" }}>{r.body}</p>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {r.status !== "APPROVED" && (
                      <button disabled={busyId === r.id} onClick={() => setReviewStatus(r.id, "APPROVED")}
                        style={{ ...btn, color: "#4ade80", backgroundColor: "rgba(74,222,128,0.1)" }}>
                        <Check size={13} /> تأیید
                      </button>
                    )}
                    {r.status !== "REJECTED" && (
                      <button disabled={busyId === r.id} onClick={() => setReviewStatus(r.id, "REJECTED")}
                        style={{ ...btn, color: "#facc15", backgroundColor: "rgba(250,204,21,0.1)" }}>
                        <X size={13} /> رد
                      </button>
                    )}
                    {r.status !== "PENDING" && (
                      <button disabled={busyId === r.id} onClick={() => setReviewStatus(r.id, "PENDING")} style={btn}>
                        بازگردانی به در انتظار
                      </button>
                    )}
                    <button disabled={busyId === r.id} onClick={() => removeReview(r.id)}
                      style={{ ...btn, color: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)" }}>
                      <Trash2 size={13} /> حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pages > 1 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
            {Array.from({ length: pages }).map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                style={{
                  background: page === i + 1 ? "#d4af37" : "#1a1a1a",
                  color: page === i + 1 ? "#000" : "#ccc",
                  border: "1px solid #2a2a2a", borderRadius: 6, padding: "6px 12px",
                  fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                }}>
                {i + 1}
              </button>
            ))}
          </div>
        )}

        <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
      </div>
    </AdminGuard>
  );
}


