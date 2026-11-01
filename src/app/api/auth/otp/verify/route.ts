import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { users, otpCodes } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { verifyOtpCode, OTP_MAX_ATTEMPTS } from "@/lib/otp";
import { hashPassword } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { ok, error, serverError } from "@/lib/response";
import { COOKIE_CONFIG } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phoneRaw = String(body.phone ?? "").trim();
    const code = String(body.code ?? "").trim();
    const name = String(body.name ?? "").trim();
    const intent = body.intent === "register" ? "register" : "login";

    if (!phoneRaw || !code) return error("شماره موبایل و کد تأیید الزامی است");
    if (!/^\d{5}$/.test(code)) return error("کد تأیید باید ۵ رقم باشد");

    const phone = normalizePhone(phoneRaw);
    if (!phone) return error("شماره موبایل معتبر نیست");

    const record = otpCodes.findLatestValid(phone);
    if (!record) return error("کد تأیید منقضی شده یا نامعتبر است", 401);

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      otpCodes.delete(record.id);
      return error("تعداد تلاش‌های شما بیش از حد مجاز است. کد جدید درخواست کنید", 429);
    }

    if (!verifyOtpCode(code, record.code_hash)) {
      otpCodes.incrementAttempts(record.id);
      return error("کد تأیید اشتباه است", 401);
    }

    otpCodes.delete(record.id);

    let user = users.findByPhone(phone);
    const isNewUser = !user;

    if (user?.role === "ADMIN") {
      return error("ورود مدیران فقط از پنل مدیریت امکان‌پذیر است", 403);
    }

    if (!user) {
      if (intent === "login") {
        return error("حسابی با این شماره یافت نشد. لطفاً ثبت‌نام کنید", 404);
      }
      if (!name) return error("نام الزامی است", 400);
      const hashed = await hashPassword(randomBytes(32).toString("hex"));
      const emailPlaceholder = `${phone}@phone.local`;
      user = users.create({
        name,
        email: emailPlaceholder,
        password: hashed,
        phone_login: phone,
        role: "CUSTOMER",
      });
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    const response = ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone_login,
        role: user.role,
      },
      isNewUser,
    });
    response.cookies.set(COOKIE_CONFIG.name, token, COOKIE_CONFIG);
    return response;
  } catch (e) {
    console.error("OTP verify error:", e);
    return serverError();
  }
}
