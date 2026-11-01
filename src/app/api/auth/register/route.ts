import { NextRequest } from "next/server";
import { users } from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { ok, error, serverError } from "@/lib/response";
import { COOKIE_CONFIG } from "@/lib/auth";

/** Normalize Iranian phone numbers to 11-digit format starting with 09 */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  // 09xxxxxxxxx (11 digits)
  if (/^09\d{9}$/.test(digits)) return digits;
  // +98xxxxxxxxxx → 0xxxxxxxxxx
  if (/^98\d{10}$/.test(digits)) return "0" + digits.slice(2);
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, password } = body;

    if (!name?.trim())  return error("نام الزامی است");
    if (!phone?.trim()) return error("شماره موبایل الزامی است");

    const normalized = normalizePhone(phone.trim());
    if (!normalized) return error("شماره موبایل معتبر نیست (مثال: 09123456789)");

    if (!password) return error("رمز عبور الزامی است");
    const pwErr = validatePassword(password);
    if (pwErr) return error(pwErr);

    const existing = users.findByPhone(normalized);
    if (existing) return error("این شماره موبایل قبلاً ثبت شده است", 409);

    const hashed = await hashPassword(password);
    // Use phone as email placeholder to satisfy NOT NULL constraint on old email column
    const emailPlaceholder = `${normalized}@phone.local`;
    const user = users.create({
      name: name.trim(),
      email: emailPlaceholder,
      password: hashed,
      phone_login: normalized,
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    const response = ok({
      user: { id: user.id, name: user.name, phone: user.phone_login, role: user.role }
    }, 201);
    response.cookies.set(COOKIE_CONFIG.name, token, COOKIE_CONFIG);
    return response;
  } catch (e) {
    console.error("Register error:", e);
    return serverError();
  }
}
