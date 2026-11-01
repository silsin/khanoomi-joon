"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw, Send, Lock, Unlock } from "lucide-react";

type Ticket = {
  id: string;
  status: "OPEN" | "CLOSED";
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  ticket_id: string;
  sender: "CUSTOMER" | "ADMIN";
  body: string;
  created_at: string;
};

export default function AdminTicketDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/tickets/${id}`);
      const data = await res.json();
      if (data.success) {
        setTicket(data.data.ticket);
        setMessages(data.data.messages);
      } else {
        setError(data.error || "خطا در بارگذاری تیکت");
      }
    } catch {
      setError("خطای شبکه");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const statusUi = useMemo(() => {
    const s = ticket?.status || "OPEN";
    const isOpen = s === "OPEN";
    return {
      label: isOpen ? "باز" : "بسته",
      fg: isOpen ? "#3b82f6" : "#94a3b8",
      bg: isOpen ? "rgba(59,130,246,0.15)" : "rgba(148,163,184,0.12)",
      toggleLabel: isOpen ? "بستن تیکت" : "باز کردن تیکت",
      toggleIcon: isOpen ? <Lock size={16} /> : <Unlock size={16} />,
      next: isOpen ? ("CLOSED" as const) : ("OPEN" as const),
    };
  }, [ticket?.status]);

  async function setStatus(next: "OPEN" | "CLOSED") {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status: next }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error || "خطا در ذخیره وضعیت");
      await load();
    } catch {
      setError("خطای شبکه");
    } finally {
      setSaving(false);
    }
  }

  async function sendReply() {
    const msg = replyText.trim();
    if (!msg) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", message: msg }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyText("");
      } else {
        setError(data.error || "خطا در ارسال پاسخ");
      }
      await load();
    } catch {
      setError("خطای شبکه");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ color: "#d4af37" }}>در حال بارگذاری...</div>;
  }
  if (error && !ticket) {
    return (
      <div style={{ color: "#fff" }}>
        <p style={{ color: "#ef4444", marginBottom: 12 }}>{error}</p>
        <button onClick={load} style={{ background: "none", border: "1px solid #333", color: "#d4af37", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontFamily: "inherit" }}>
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <Link href="/admin/tickets" style={{ color: "#d4af37", textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ArrowRight size={14} /> بازگشت به تیکت‌ها
          </Link>
          <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginTop: 10 }}>
            تیکت {ticket?.id.slice(0, 8)}...
          </h2>
          <p style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
            {ticket?.name} · {ticket?.phone || "—"} · <span style={{ direction: "ltr", display: "inline-block" }}>{ticket?.email}</span>
          </p>
          {ticket?.subject && (
            <p style={{ color: "#888", fontSize: 12, marginTop: 6 }}>
              موضوع: <span style={{ color: "#fff" }}>{ticket.subject}</span>
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ backgroundColor: statusUi.bg, color: statusUi.fg, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            {statusUi.label}
          </span>
          <button
            onClick={() => setStatus(statusUi.next)}
            disabled={saving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#1a1a1a",
              border: "1px solid #2a2a2a",
              color: "#fff",
              borderRadius: 8,
              padding: "10px 14px",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {saving ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : statusUi.toggleIcon}
            {statusUi.toggleLabel}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>گفتگو</h3>
        {messages.length === 0 ? (
          <p style={{ color: "#666", fontSize: 13 }}>پیامی وجود ندارد</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map(m => {
              const isAdmin = m.sender === "ADMIN";
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: isAdmin ? "flex-start" : "flex-end" }}>
                  <div style={{
                    maxWidth: 720,
                    backgroundColor: isAdmin ? "#121212" : "rgba(212,175,55,0.12)",
                    border: `1px solid ${isAdmin ? "#2a2a2a" : "rgba(212,175,55,0.25)"}`,
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                      <span style={{ color: isAdmin ? "#d4af37" : "#fff", fontSize: 11, fontWeight: 800 }}>
                        {isAdmin ? "ادمین" : "مشتری"}
                      </span>
                      <span style={{ color: "#666", fontSize: 11, whiteSpace: "nowrap" }}>
                        {m.created_at ? new Date(m.created_at).toLocaleString("fa-IR") : ""}
                      </span>
                    </div>
                    <div style={{ color: "#fff", fontSize: 13, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{m.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: 16 }}>
        <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>پاسخ ادمین</h3>
        <textarea
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          rows={4}
          placeholder="پاسخ را بنویسید..."
          style={{
            width: "100%",
            backgroundColor: "#121212",
            border: "1px solid #333",
            borderRadius: 10,
            padding: "10px 12px",
            color: "#fff",
            fontSize: 13,
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button
            onClick={sendReply}
            disabled={saving || !replyText.trim()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: saving ? "#a08020" : "#d4af37",
              color: "#000",
              border: "none",
              borderRadius: 10,
              padding: "11px 18px",
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {saving ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={16} />}
            ارسال پاسخ
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

