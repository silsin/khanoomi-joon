"use client";
import { Truck, ShieldCheck, Clock, Headphones } from "lucide-react";

const features = [
  {
    icon: <Headphones size={28} color="var(--dg-primary)" />,
    title: "خرید آسان و مطمئن",
    desc: "با پشتیبانی ۲۴/۷",
  },
  {
    icon: <ShieldCheck size={28} color="var(--dg-primary)" />,
    title: "ضمانت اصالت کالا",
    desc: "همراه با فاکتور معتبر",
  },
  {
    icon: <Truck size={28} color="var(--dg-primary)" />,
    title: "ارسال امن و سریع",
    desc: "به سراسر ایران",
  },
  {
    icon: <Clock size={28} color="var(--dg-primary)" />,
    title: "قیمت روز طلا",
    desc: "آپدیت لحظه‌ای",
  },
];

export default function FeaturesBar() {
  return (
    <section
      style={{
        backgroundColor: "var(--dg-bg-2)",
        borderTop: "1px solid var(--dg-line)",
        borderBottom: "1px solid var(--dg-line)",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 16px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0",
        }}
      >
        {features.map((f, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "20px 24px",
              borderLeft: i < features.length - 1 ? "1px solid var(--dg-line)" : "none",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: "48px",
                height: "48px",
                backgroundColor: "color-mix(in srgb, var(--dg-primary) 10%, transparent)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {f.icon}
            </div>
            <div>
              <p
                style={{
                  color: "var(--dg-ink)",
                  fontWeight: "600",
                  fontSize: "14px",
                  marginBottom: "2px",
                }}
              >
                {f.title}
              </p>
              <p style={{ color: "var(--dg-muted)", fontSize: "12px" }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .features-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
