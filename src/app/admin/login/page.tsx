"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "خطا"); return; }
      if (data.data?.user?.role !== "ADMIN") {
        setErr("شما دسترسی ادمین ندارید");
        await fetch("/api/auth/logout", { method: "POST" });
        return;
      }
      // Hard redirect so browser sends the new cookie to the proxy
      window.location.href = "/admin";
    } catch {
      setErr("خطای شبکه");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0e0e0e", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ color: "#d4af37", fontSize: "36px", fontWeight: "900", letterSpacing: "-2px" }}>DG</div>
          <div style={{ color: "#d4af37", fontSize: "11px", letterSpacing: "3px", fontWeight: "600" }}>DELLY GOLD</div>
          <p style={{ color: "#888", fontSize: "13px", marginTop: "8px" }}>پنل مدیریت</p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "32px" }}>
          <h1 style={{ color: "#fff", fontSize: "20px", fontWeight: "700", marginBottom: "24px", textAlign: "center" }}>
            ورود به پنل مدیریت
          </h1>

          {err && (
            <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "10px 14px", marginBottom: "16px", color: "#f87171", fontSize: "13px" }}>
              {err}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: "#888", fontSize: "13px", display: "block", marginBottom: "6px" }}>ایمیل ادمین</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@dellygold.com"
                required
                autoFocus
                autoComplete="email"
                style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #333", borderRadius: "6px", padding: "10px 12px", color: "#fff", fontSize: "14px", outline: "none", direction: "ltr" }}
              />
            </div>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ color: "#888", fontSize: "13px", display: "block", marginBottom: "6px" }}>رمز عبور</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #333", borderRadius: "6px", padding: "10px 12px", color: "#fff", fontSize: "14px", outline: "none", direction: "ltr" }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", backgroundColor: loading ? "#a08020" : "#d4af37", color: "#000", border: "none", borderRadius: "6px", padding: "12px", fontWeight: "700", fontSize: "15px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {loading ? "در حال ورود..." : "ورود"}
            </button>
          </form>
        </div>

        <p style={{ color: "#555", fontSize: "12px", textAlign: "center", marginTop: "16px" }}>
          دلی گلد © ۱۴۰۴
        </p>
      </div>
    </div>
  );
}
