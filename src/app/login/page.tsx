"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn, UserPlus, ChevronLeft, Phone, MessageSquare, ArrowRight, Check } from "lucide-react";

type Tab = "login" | "register";
type Step = "phone" | "otp";

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab]         = useState<Tab>((searchParams.get("tab") as Tab) || "login");
  const [step, setStep]       = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [countdown, setCountdown] = useState(0);

  const [phone, setPhone] = useState("");
  const [name, setName]   = useState("");
  const [otp, setOtp]     = useState("");

  const redirect = searchParams.get("redirect") || "/";

  // /login?tab=register must also work when this component is already mounted
  // (same-route navigation in the App Router does not remount it). Only react
  // to a real URL change so the tab chosen via the buttons is never reverted.
  const urlTab = useRef(searchParams.get("tab"));
  useEffect(() => {
    const next = searchParams.get("tab");
    if (next === urlTab.current) return;
    urlTab.current = next;
    setTab((next as Tab) || "login");
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.success) router.replace(redirect);
    }).catch(() => {});
  }, [redirect, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function resetToPhone() {
    setStep("phone");
    setOtp("");
    setError("");
  }

  function switchTab(next: Tab) {
    setTab(next);
    resetToPhone();
  }

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "خطا در ارسال کد"); return; }
      setStep("otp");
      setCountdown(60);
      setOtp("");
    } catch {
      setError("خطای شبکه");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: otp,
          intent: tab,
          ...(tab === "register" ? { name } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "خطا در تأیید کد"); return; }
      router.push(redirect);
      router.refresh();
    } catch {
      setError("خطای شبکه");
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", backgroundColor: "var(--dg-bg)", border: "1px solid var(--dg-line)",
    borderRadius: "12px", padding: "11px 14px", color: "var(--dg-ink)",
    fontSize: "14px", outline: "none", fontFamily: "inherit",
  };

  return (
    <div className="login-wrap">
      {/* Brand panel */}
      <aside className="login-brand">
        <Link href="/" className="login-logo">
          <span className="dgh-mark" style={{ width: 44, height: 44, borderRadius: 13 }}><span>خ</span></span>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}><span style={{ color: "var(--dg-gold)", fontSize: 14, fontWeight: 700, marginLeft: 6 }}>گالری طلای</span>خانوم جون</span>
        </Link>
        <div className="login-brand-mid">
          <span className="login-eyebrow">WELCOME</span>
          <h2>به دنیای<br /><em>گالری طلای خانوم جون</em> خوش آمدید</h2>
          <ul>
            <li><Check size={14} /> پیگیری سفارش‌ها در حساب کاربری</li>
            <li><Check size={14} /> خرید سریع با قیمت لحظه‌ای طلا</li>
            <li><Check size={14} /> ورود امن فقط با کد پیامکی</li>
          </ul>
        </div>
        <Link href="/" className="login-back"><ChevronLeft size={13} /> بازگشت به صفحه اصلی</Link>
      </aside>

      <div className="login-side">
      <div className="login-card">
        <h1 className="login-title">{tab === "login" ? "ورود به حساب" : "ساخت حساب جدید"}</h1>
        <p className="login-sub">{step === "otp" ? "کد ارسال‌شده را وارد کنید" : "با شماره موبایل خود ادامه دهید"}</p>

        <div className="login-tabs">
          {(["login", "register"] as Tab[]).map(t => (
            <button key={t} onClick={() => switchTab(t)} className={tab === t ? "on" : ""}>
              {t === "login" ? <><LogIn size={14} /> ورود</> : <><UserPlus size={14} /> ثبت‌نام</>}
            </button>
          ))}
        </div>

        <div className="login-card-body">
          {error && (
            <div style={{ backgroundColor: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "10px", padding: "10px 14px", color: "#dc2626", fontSize: "13px", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {step === "phone" && (
            <form onSubmit={handleSendOtp}>
              {tab === "register" && (
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ color: "var(--dg-muted)", fontSize: "12px", display: "block", marginBottom: "6px" }}>نام کامل</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    required autoFocus placeholder="نام و نام خانوادگی"
                    style={inp}
                    onFocus={e => (e.target.style.borderColor = "var(--dg-primary)")}
                    onBlur={e => (e.target.style.borderColor = "var(--dg-line)")}
                  />
                </div>
              )}
              <div style={{ marginBottom: "22px" }}>
                <label style={{ color: "var(--dg-muted)", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
                  <Phone size={12} color="var(--dg-primary)" /> شماره موبایل
                </label>
                <input
                  type="tel" inputMode="numeric" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="09123456789" required autoFocus={tab === "login"}
                  style={{ ...inp, direction: "ltr", letterSpacing: "1px" }}
                  onFocus={e => (e.target.style.borderColor = "var(--dg-primary)")}
                  onBlur={e => (e.target.style.borderColor = "var(--dg-line)")}
                />
                <p style={{ color: "var(--dg-faint)", fontSize: "11px", marginTop: "4px" }}>
                  {tab === "login"
                    ? "کد تأیید به این شماره پیامک می‌شود"
                    : "شماره موبایل شناسه ورود شما خواهد بود"}
                </p>
              </div>
              <button type="submit" disabled={loading}
                style={{ width: "100%", backgroundColor: loading ? "var(--dg-gold)" : "var(--dg-primary)", color: "#fff", border: "none", borderRadius: "12px", padding: "12px", fontWeight: "800", fontSize: "15px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading ? "در حال ارسال..." : <><MessageSquare size={15} /> دریافت کد تأیید</>}
              </button>
              <p style={{ textAlign: "center", marginTop: "14px", color: "var(--dg-muted)", fontSize: "13px" }}>
                {tab === "login" ? "حساب ندارید؟ " : "حساب دارید؟ "}
                <button type="button" onClick={() => switchTab(tab === "login" ? "register" : "login")}
                  style={{ background: "none", border: "none", color: "var(--dg-primary)", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", fontWeight: "700" }}>
                  {tab === "login" ? "ثبت‌نام کنید" : "وارد شوید"}
                </button>
              </p>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp}>
              <button type="button" onClick={resetToPhone}
                style={{ background: "none", border: "none", color: "var(--dg-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "16px", padding: 0 }}>
                <ArrowRight size={13} /> تغییر شماره ({phone})
              </button>
              <div style={{ marginBottom: "22px" }}>
                <label style={{ color: "var(--dg-muted)", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
                  <MessageSquare size={12} color="var(--dg-primary)" /> کد تأیید ۵ رقمی
                </label>
                <input
                  type="text" inputMode="numeric" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="12345" required autoFocus maxLength={5}
                  style={{ ...inp, direction: "ltr", letterSpacing: "8px", textAlign: "center", fontSize: "20px", fontWeight: "700" }}
                  onFocus={e => (e.target.style.borderColor = "var(--dg-primary)")}
                  onBlur={e => (e.target.style.borderColor = "var(--dg-line)")}
                />
                <p style={{ color: "var(--dg-faint)", fontSize: "11px", marginTop: "8px", textAlign: "center" }}>
                  {countdown > 0 ? (
                    <>ارسال مجدد تا {countdown} ثانیه دیگر</>
                  ) : (
                    <button type="button" onClick={() => handleSendOtp()} disabled={loading}
                      style={{ background: "none", border: "none", color: "var(--dg-primary)", cursor: "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: "700" }}>
                      ارسال مجدد کد
                    </button>
                  )}
                </p>
              </div>
              <button type="submit" disabled={loading || otp.length !== 5}
                style={{ width: "100%", backgroundColor: loading || otp.length !== 5 ? "var(--dg-gold)" : "var(--dg-primary)", color: "#fff", border: "none", borderRadius: "12px", padding: "12px", fontWeight: "800", fontSize: "15px", cursor: loading || otp.length !== 5 ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading ? "در حال تأیید..." : <><LogIn size={15} /> {tab === "login" ? "ورود به حساب" : "تأیید و ایجاد حساب"}</>}
              </button>
            </form>
          )}
        </div>
      </div>

      </div>

      <style>{`
        .login-wrap { min-height: 100vh; display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); background: var(--dg-bg); padding: 16px; gap: 16px; }
        .login-brand { position: relative; overflow: hidden; border-radius: 32px; padding: 40px; display: flex; flex-direction: column; justify-content: space-between; background: radial-gradient(120% 120% at 100% 0%, #17765a 0%, var(--dg-primary) 40%, var(--dg-primary-deep) 100%); }
        .login-brand::before { content: ""; position: absolute; left: -120px; bottom: -120px; width: 420px; height: 420px; border-radius: 50%; border: 2px solid rgba(198,161,91,.35); }
        .login-brand::after { content: ""; position: absolute; left: -40px; bottom: -40px; width: 260px; height: 260px; border-radius: 50%; border: 1px solid rgba(198,161,91,.25); }
        .login-logo { display: inline-flex; align-items: center; gap: 12px; text-decoration: none; position: relative; z-index: 1; }
        .login-brand-mid { position: relative; z-index: 1; }
        .login-eyebrow { color: var(--dg-gold); font-size: 11px; font-weight: 800; letter-spacing: 3px; }
        .login-brand h2 { color: #fff; font-size: 34px; font-weight: 900; line-height: 1.5; margin: 10px 0 22px; }
        .login-brand h2 em { font-style: normal; background: var(--dg-grad-gold); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .login-brand ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
        .login-brand li { display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,.8); font-size: 13.5px; }
        .login-brand li svg { width: 22px; height: 22px; padding: 4px; border-radius: 8px; background: rgba(198,161,91,.2); color: var(--dg-gold); flex-shrink: 0; }
        .login-back { position: relative; z-index: 1; color: rgba(255,255,255,.6); text-decoration: none; font-size: 13px; display: inline-flex; align-items: center; gap: 4px; }
        .login-side { display: flex; align-items: center; justify-content: center; padding: 24px; }
        .login-card { width: 100%; max-width: 420px; }
        .login-title { color: var(--dg-ink); font-size: 26px; font-weight: 900; margin: 0 0 6px; }
        .login-sub { color: var(--dg-muted); font-size: 13px; margin: 0 0 22px; }
        .login-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 5px; background: var(--dg-bg-2); border-radius: 16px; margin-bottom: 22px; }
        .login-tabs button { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 11px; border: none; background: transparent; border-radius: 12px; font-family: inherit; font-size: 14px; color: var(--dg-muted); cursor: pointer; }
        .login-tabs button.on { background: #fff; color: var(--dg-primary); font-weight: 800; box-shadow: var(--dg-shadow-sm); }
        .login-card-body { background: #fff; border: 1px solid var(--dg-line); border-radius: 24px; padding: 26px; box-shadow: var(--dg-shadow-sm); }
        @media (max-width: 900px) {
          .login-wrap { grid-template-columns: 1fr; padding: 10px; }
          .login-brand { padding: 24px; border-radius: 24px; gap: 18px; }
          .login-brand h2 { font-size: 22px; margin-bottom: 0; }
          .login-brand ul, .login-back { display: none; }
          .login-side { padding: 8px 4px 24px; align-items: flex-start; }
        }
        @media (max-width: 480px) { .login-card-body { padding: 18px 16px; } }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", backgroundColor: "var(--dg-bg-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--dg-primary)" }}>در حال بارگذاری...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
