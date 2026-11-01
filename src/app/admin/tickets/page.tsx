"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, MessageSquare, RefreshCw } from "lucide-react";

type Ticket = {
  id: string;
  status: "OPEN" | "CLOSED";
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  created_at: string;
  updated_at: string;
  first_message?: string | null;
  last_message_at?: string | null;
  last_sender?: string | null;
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "OPEN" | "CLOSED">("");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (search.trim()) qs.set("search", search.trim());
    if (status) qs.set("status", status);
    const res = await fetch(`/api/admin/tickets?${qs.toString()}`);
    const data = await res.json();
    if (data.success) setTickets(data.data.tickets);
    setLoading(false);
  }, [search, status]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const counts = useMemo(() => {
    let open = 0;
    let closed = 0;
    for (const t of tickets) {
      if (t.status === "OPEN") open++;
      if (t.status === "CLOSED") closed++;
    }
    return { open, closed, total: tickets.length };
  }, [tickets]);

  function badge(status: Ticket["status"]) {
    const isOpen = status === "OPEN";
    return {
      label: isOpen ? "باز" : "بسته",
      bg: isOpen ? "rgba(59,130,246,0.15)" : "rgba(148,163,184,0.12)",
      fg: isOpen ? "#3b82f6" : "#94a3b8",
    };
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>تیکت‌ها</h2>
          <p style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
            جمع: {counts.total} · باز: {counts.open} · بسته: {counts.closed}
          </p>
        </div>
        <button
          onClick={fetchTickets}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#d4af37",
            borderRadius: 8,
            padding: "10px 14px",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {loading ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <MessageSquare size={16} />}
          بروزرسانی
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 420 }}>
          <Search size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#888" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو: نام، ایمیل، موبایل، موضوع..."
            style={{
              width: "100%",
              backgroundColor: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: 8,
              padding: "10px 36px 10px 12px",
              color: "#fff",
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        <select
          value={status}
          onChange={e => setStatus(e.target.value as "" | "OPEN" | "CLOSED")}
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            padding: "10px 12px",
            color: "#fff",
            fontSize: 13,
            outline: "none",
            fontFamily: "inherit",
          }}
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="OPEN">باز</option>
          <option value="CLOSED">بسته</option>
        </select>
      </div>

      <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#161616" }}>
                {["شناسه", "وضعیت", "فرستنده", "موضوع", "آخرین پیام", "تاریخ"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", color: "#888", fontSize: 12, textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#555" }}>در حال بارگذاری...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#555" }}>تیکتی ثبت نشده</td></tr>
              ) : (
                tickets.map(t => {
                  const b = badge(t.status);
                  const title = (t.subject || "").trim() || "—";
                  const meta = `${t.name}${t.phone ? ` · ${t.phone}` : ""}${t.email ? ` · ${t.email}` : ""}`;
                  const lastAt = t.last_message_at || t.updated_at || t.created_at;
                  return (
                    <tr key={t.id} style={{ borderTop: "1px solid #222" }}>
                      <td style={{ padding: "12px 16px", color: "#888", fontSize: 12, fontFamily: "monospace" }}>
                        <Link href={`/admin/tickets/${t.id}`} style={{ color: "#d4af37", textDecoration: "none" }}>
                          {t.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ backgroundColor: b.bg, color: b.fg, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                          {b.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <p style={{ color: "#fff", fontSize: 13, marginBottom: 3 }}>{t.name || "—"}</p>
                        <p style={{ color: "#666", fontSize: 11, direction: "ltr" }}>{meta}</p>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#fff", fontSize: 13 }}>{title}</td>
                      <td style={{ padding: "12px 16px", color: "#888", fontSize: 12, maxWidth: 320 }}>
                        <span style={{ display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                          {(t.first_message || "").trim() || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#666", fontSize: 12, whiteSpace: "nowrap" }}>
                        {lastAt ? new Date(lastAt).toLocaleDateString("fa-IR") : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

