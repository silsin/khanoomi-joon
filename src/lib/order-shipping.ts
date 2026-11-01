import { isValidCounty, isValidProvince } from "@/lib/iran-locations";

export interface OrderShippingInput {
  recipientFirstName: string;
  recipientLastName: string;
  recipientPhone: string;
  recipientEmail: string;
  province: string;
  county: string;
  postalCode: string;
  deliveryPhone: string;
  address: string;
  note?: string;
}

export interface OrderShippingRecord {
  recipient_first_name: string;
  recipient_last_name: string;
  recipient_phone: string;
  recipient_email: string;
  province: string;
  county: string;
  postal_code: string;
  delivery_phone: string;
  address: string;
  note: string | null;
}

const NAME_RE = /^[\u0600-\u06FFa-zA-Z\s]{2,40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalize Persian/Arabic digits to ASCII and strip non-digits. */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/\D/g, "");
}

/** Iranian mobile (09xxxxxxxxx) or landline (0xxxxxxxxxx). */
export function isValidIranPhone(value: string): boolean {
  const digits = normalizeDigits(value);
  if (/^09\d{9}$/.test(digits)) return true;
  if (/^0[1-9]\d{8,9}$/.test(digits)) return true;
  return false;
}

export function formatIranPhone(value: string): string {
  return normalizeDigits(value);
}

export function isValidPostalCode(value: string): boolean {
  return /^\d{10}$/.test(normalizeDigits(value));
}

export function formatPostalCode(value: string): string {
  return normalizeDigits(value).slice(0, 10);
}

export function validateOrderShipping(raw: unknown): { ok: true; data: OrderShippingRecord } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "اطلاعات تحویل نامعتبر است" };
  }

  const body = raw as Record<string, unknown>;

  const recipientFirstName = String(body.recipientFirstName ?? body.recipient_first_name ?? "").trim();
  const recipientLastName = String(body.recipientLastName ?? body.recipient_last_name ?? "").trim();
  const recipientPhone = formatIranPhone(String(body.recipientPhone ?? body.recipient_phone ?? ""));
  const recipientEmail = String(body.recipientEmail ?? body.recipient_email ?? "").trim().toLowerCase();
  const province = String(body.province ?? "").trim();
  const county = String(body.county ?? "").trim();
  const postalCode = formatPostalCode(String(body.postalCode ?? body.postal_code ?? ""));
  const deliveryPhone = formatIranPhone(String(body.deliveryPhone ?? body.delivery_phone ?? ""));
  const address = String(body.address ?? "").trim();
  const noteRaw = body.note;
  const note = noteRaw == null || String(noteRaw).trim() === "" ? null : String(noteRaw).trim();

  if (!recipientFirstName || !NAME_RE.test(recipientFirstName)) {
    return { ok: false, error: "نام دریافت‌کننده الزامی است (حداقل ۲ حرف)" };
  }
  if (!recipientLastName || !NAME_RE.test(recipientLastName)) {
    return { ok: false, error: "نام خانوادگی دریافت‌کننده الزامی است (حداقل ۲ حرف)" };
  }
  if (!isValidIranPhone(recipientPhone)) {
    return { ok: false, error: "شماره تلفن دریافت‌کننده معتبر نیست (مثال: 09123456789)" };
  }
  if (!recipientEmail || !EMAIL_RE.test(recipientEmail)) {
    return { ok: false, error: "ایمیل دریافت‌کننده معتبر نیست" };
  }
  if (!isValidProvince(province)) {
    return { ok: false, error: "استان را از لیست انتخاب کنید" };
  }
  if (!county || !isValidCounty(province, county)) {
    return { ok: false, error: "شهرستان را از لیست انتخاب کنید" };
  }
  if (!isValidPostalCode(postalCode)) {
    return { ok: false, error: "کد پستی باید ۱۰ رقم باشد" };
  }
  if (!isValidIranPhone(deliveryPhone)) {
    return { ok: false, error: "تلفن محل دریافت معتبر نیست" };
  }
  if (!address || address.length < 10) {
    return { ok: false, error: "نشانی کامل الزامی است (حداقل ۱۰ کاراکتر)" };
  }

  return {
    ok: true,
    data: {
      recipient_first_name: recipientFirstName,
      recipient_last_name: recipientLastName,
      recipient_phone: recipientPhone,
      recipient_email: recipientEmail,
      province,
      county,
      postal_code: postalCode,
      delivery_phone: deliveryPhone,
      address,
      note,
    },
  };
}

export function formatShippingSummary(row: Partial<OrderShippingRecord>): string {
  const parts = [
    row.province,
    row.county,
    row.address,
    row.postal_code ? `کد پستی: ${row.postal_code}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export const EMPTY_SHIPPING_FORM: OrderShippingInput = {
  recipientFirstName: "",
  recipientLastName: "",
  recipientPhone: "",
  recipientEmail: "",
  province: "",
  county: "",
  postalCode: "",
  deliveryPhone: "",
  address: "",
  note: "",
};
