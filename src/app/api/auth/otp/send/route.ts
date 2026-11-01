import { NextRequest } from "next/server";
import { otpCodes } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import {
  generateOtpCode,
  hashOtpCode,
  otpExpiresAt,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_SEND_COOLDOWN_MS,
} from "@/lib/otp";
import { sendOtpSms } from "@/lib/kavenegar";
import { ok, error, serverError } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phoneRaw = String(body.phone ?? "").trim();
    if (!phoneRaw) return error("شماره موبایل الزامی است");

    const phone = normalizePhone(phoneRaw);
    if (!phone) return error("شماره موبایل معتبر نیست (مثال: 09123456789)");

    otpCodes.purgeExpired();

    const lastSent = otpCodes.lastSentAt(phone);
    if (lastSent) {
      const elapsed = Date.now() - new Date(lastSent).getTime();
      if (elapsed < OTP_SEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((OTP_SEND_COOLDOWN_MS - elapsed) / 1000);
        return error(`لطفاً ${waitSec} ثانیه دیگر دوباره تلاش کنید`, 429);
      }
    }

    if (otpCodes.countRecentSends(phone) >= OTP_MAX_SENDS_PER_HOUR) {
      return error("تعداد درخواست‌های شما بیش از حد مجاز است. یک ساعت دیگر تلاش کنید", 429);
    }

    const code = generateOtpCode();
    otpCodes.invalidateForPhone(phone);
    otpCodes.create({
      phone,
      code_hash: hashOtpCode(code),
      expires_at: otpExpiresAt(),
    });

    try {
      await sendOtpSms(phone, code);
    } catch (e) {
      console.error("Kavenegar send error:", e);
      otpCodes.invalidateForPhone(phone);
      return error("ارسال پیامک با خطا مواجه شد. لطفاً بعداً تلاش کنید", 502);
    }

    return ok({
      message: "کد تأیید ارسال شد",
      expiresIn: 300,
    });
  } catch (e) {
    console.error("OTP send error:", e);
    return serverError();
  }
}
