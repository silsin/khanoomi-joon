"use client";

import { useMemo } from "react";
import { User, MapPin, FileText } from "lucide-react";
import { IRAN_PROVINCES, getCountiesForProvince } from "@/lib/iran-locations";
import {
  EMPTY_SHIPPING_FORM,
  type OrderShippingInput,
  isValidIranPhone,
  isValidPostalCode,
  formatIranPhone,
  formatPostalCode,
} from "@/lib/order-shipping";

export type { OrderShippingInput };
export { EMPTY_SHIPPING_FORM };

type FieldErrors = Partial<Record<keyof OrderShippingInput, string>>;

export function validateShippingForm(form: OrderShippingInput): FieldErrors {
  const errors: FieldErrors = {};
  const nameRe = /^[\u0600-\u06FFa-zA-Z\s]{2,40}$/;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!form.recipientFirstName.trim() || !nameRe.test(form.recipientFirstName.trim())) {
    errors.recipientFirstName = "نام الزامی است (حداقل ۲ حرف)";
  }
  if (!form.recipientLastName.trim() || !nameRe.test(form.recipientLastName.trim())) {
    errors.recipientLastName = "نام خانوادگی الزامی است (حداقل ۲ حرف)";
  }
  if (!isValidIranPhone(form.recipientPhone)) {
    errors.recipientPhone = "شماره موبایل معتبر وارد کنید (مثال: 09123456789)";
  }
  if (!form.recipientEmail.trim() || !emailRe.test(form.recipientEmail.trim())) {
    errors.recipientEmail = "ایمیل معتبر وارد کنید";
  }
  if (!form.province) errors.province = "استان را انتخاب کنید";
  if (!form.county) errors.county = "شهرستان را انتخاب کنید";
  if (!isValidPostalCode(form.postalCode)) errors.postalCode = "کد پستی باید ۱۰ رقم باشد";
  if (!isValidIranPhone(form.deliveryPhone)) errors.deliveryPhone = "تلفن محل دریافت معتبر نیست";
  if (!form.address.trim() || form.address.trim().length < 10) {
    errors.address = "نشانی کامل الزامی است (حداقل ۱۰ کاراکتر)";
  }
  return errors;
}

export function firstShippingError(errors: FieldErrors): string | null {
  for (const key of Object.keys(errors) as (keyof OrderShippingInput)[]) {
    if (errors[key]) return errors[key]!;
  }
  return null;
}

interface Props {
  form: OrderShippingInput;
  onChange: (next: OrderShippingInput) => void;
  fieldErrors?: FieldErrors;
  userName?: string;
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "var(--dg-bg-2)",
  border: "1px solid var(--dg-line)",
  borderRadius: 12,
  padding: "10px 12px",
  color: "var(--dg-ink)",
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ color: "var(--dg-muted)", fontSize: 12, display: "block", marginBottom: 6 }}>
      {children}{required && " *"}
    </label>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{message}</p>;
}

export default function CheckoutShippingForm({ form, onChange, fieldErrors = {}, userName }: Props) {
  const counties = useMemo(
    () => (form.province ? getCountiesForProvince(form.province) : []),
    [form.province],
  );

  function set<K extends keyof OrderShippingInput>(key: K, value: OrderShippingInput[K]) {
    onChange({ ...form, [key]: value });
  }

  function setProvince(value: string) {
    onChange({ ...form, province: value, county: "" });
  }

  const grid2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  };

  return (
    <>
      <div className="checkout-shipping-card" style={{ backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: 18, boxShadow: "var(--dg-shadow-sm)", padding: 20, marginBottom: 16 }}>
        <h3 style={{ color: "var(--dg-ink)", fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <User size={16} color="var(--dg-primary)" /> مشخصات فرد دریافت‌کننده
        </h3>

        {userName && (
          <p style={{ color: "var(--dg-muted)", fontSize: 13, marginBottom: 14 }}>
            خوش آمدید، <span style={{ color: "var(--dg-ink)", fontWeight: 600 }}>{userName}</span>
          </p>
        )}

        <div className="checkout-shipping-grid" style={{ ...grid2, marginBottom: 12 }}>
          <div>
            <FieldLabel required>نام</FieldLabel>
            <input
              value={form.recipientFirstName}
              onChange={e => set("recipientFirstName", e.target.value)}
              style={fieldStyle}
              placeholder="نام"
            />
            <ErrorText message={fieldErrors.recipientFirstName} />
          </div>
          <div>
            <FieldLabel required>نام خانوادگی</FieldLabel>
            <input
              value={form.recipientLastName}
              onChange={e => set("recipientLastName", e.target.value)}
              style={fieldStyle}
              placeholder="نام خانوادگی"
            />
            <ErrorText message={fieldErrors.recipientLastName} />
          </div>
        </div>

        <div style={{ ...grid2 }}>
          <div>
            <FieldLabel required>شماره تلفن</FieldLabel>
            <input
              value={form.recipientPhone}
              onChange={e => set("recipientPhone", formatIranPhone(e.target.value))}
              style={{ ...fieldStyle, direction: "ltr", textAlign: "right" }}
              placeholder="09123456789"
              inputMode="tel"
            />
            <ErrorText message={fieldErrors.recipientPhone} />
          </div>
          <div>
            <FieldLabel required>ایمیل</FieldLabel>
            <input
              type="email"
              value={form.recipientEmail}
              onChange={e => set("recipientEmail", e.target.value)}
              style={{ ...fieldStyle, direction: "ltr", textAlign: "right" }}
              placeholder="email@example.com"
            />
            <ErrorText message={fieldErrors.recipientEmail} />
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: "var(--dg-surface)", border: "1px solid var(--dg-line)", borderRadius: 18, boxShadow: "var(--dg-shadow-sm)", padding: 20 }}>
        <h3 style={{ color: "var(--dg-ink)", fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <MapPin size={16} color="var(--dg-primary)" /> مشخصات محل دریافت
        </h3>

        <div className="checkout-shipping-grid" style={{ ...grid2, marginBottom: 12 }}>
          <div>
            <FieldLabel required>استان</FieldLabel>
            <select
              value={form.province}
              onChange={e => setProvince(e.target.value)}
              style={fieldStyle}
            >
              <option value="">انتخاب استان</option>
              {IRAN_PROVINCES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ErrorText message={fieldErrors.province} />
          </div>
          <div>
            <FieldLabel required>شهرستان</FieldLabel>
            <select
              value={form.county}
              onChange={e => set("county", e.target.value)}
              style={fieldStyle}
              disabled={!form.province}
            >
              <option value="">{form.province ? "انتخاب شهرستان" : "ابتدا استان را انتخاب کنید"}</option>
              {counties.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ErrorText message={fieldErrors.county} />
          </div>
        </div>

        <div className="checkout-shipping-grid" style={{ ...grid2, marginBottom: 12 }}>
          <div>
            <FieldLabel required>کد پستی</FieldLabel>
            <input
              value={form.postalCode}
              onChange={e => set("postalCode", formatPostalCode(e.target.value))}
              style={{ ...fieldStyle, direction: "ltr", textAlign: "right" }}
              placeholder="1234567890"
              inputMode="numeric"
              maxLength={10}
            />
            <ErrorText message={fieldErrors.postalCode} />
          </div>
          <div>
            <FieldLabel required>تلفن</FieldLabel>
            <input
              value={form.deliveryPhone}
              onChange={e => set("deliveryPhone", formatIranPhone(e.target.value))}
              style={{ ...fieldStyle, direction: "ltr", textAlign: "right" }}
              placeholder="02112345678"
              inputMode="tel"
            />
            <ErrorText message={fieldErrors.deliveryPhone} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel required>نشانی</FieldLabel>
          <textarea
            value={form.address}
            onChange={e => set("address", e.target.value)}
            placeholder="خیابان، کوچه، پلاک، واحد..."
            rows={3}
            style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.6 }}
          />
          <ErrorText message={fieldErrors.address} />
        </div>

        <div>
          <FieldLabel>
            <FileText size={12} style={{ display: "inline", marginLeft: 4 }} />
            توضیحات
          </FieldLabel>
          <textarea
            value={form.note ?? ""}
            onChange={e => set("note", e.target.value)}
            placeholder="توضیحات اضافی برای تحویل (اختیاری)..."
            rows={2}
            style={{ ...fieldStyle, resize: "vertical" }}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .checkout-shipping-grid { grid-template-columns: 1fr !important; }
          .checkout-shipping-card { padding: 16px 14px !important; }
        }
      `}</style>
    </>
  );
}
