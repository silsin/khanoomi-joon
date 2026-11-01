import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { users } from "@/lib/db";
import { comparePassword } from "@/lib/password";
import { signToken } from "@/lib/jwt";

/**
 * POST /api/trade/login — token login for the PWA.
 *
 * `/api/auth/login` answers with an httpOnly cookie, which a separate origin
 * cannot receive. The PWA therefore logs in here and keeps the returned JWT in
 * memory/storage, sending it as `Authorization: Bearer …` on every call. Same
 * credentials, same secret, same expiry as the website's own login.
 *
 * NOTE: this endpoint is intentionally unauthenticated in the sense that anyone
 * may attempt a login. It runs bcrypt on a dummy hash when the account is
 * missing, so response timing does not reveal whether a phone exists.
 */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) return digits;
  if (/^98\d{10}$/.test(digits)) return "0" + digits.slice(2);
  return null;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  try {
    const body = (await req.json()) as { identifier?: string; phone?: string; email?: string; password?: string };
    const identifier = (body.identifier ?? body.phone ?? body.email ?? "").trim();
    const password = body.password ?? "";

    if (!identifier || !password) {
      return withCors(req, error("شماره موبایل/ایمیل و رمز عبور الزامی است", 400));
    }

    let user = isEmail(identifier)
      ? users.findByEmail(identifier.toLowerCase())
      : (() => {
          const phone = normalizePhone(identifier);
          return phone ? users.findByPhone(phone) : undefined;
        })();

    if (!user) {
      // Constant-time: always run bcrypt to prevent timing attacks.
      await comparePassword(password, "$2a$12$placeholder.hash.for.timing.safety.only");
      return withCors(req, error("اطلاعات ورود اشتباه است", 401));
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) return withCors(req, error("اطلاعات ورود اشتباه است", 401));

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return withCors(
      req,
      ok({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone_login,
          role: user.role,
        },
      })
    );
  } catch (e) {
    console.error("[trade/login] error:", e);
    return withCors(req, serverError());
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
