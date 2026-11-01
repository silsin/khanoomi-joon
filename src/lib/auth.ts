import { NextRequest } from "next/server";
import { verifyToken, JwtPayload } from "./jwt";

export function getTokenFromRequest(req: NextRequest): string | null {
  // 1. httpOnly cookie (preferred)
  const cookie = req.cookies.get("auth_token");
  if (cookie?.value) return cookie.value;

  // 2. Authorization header fallback
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);

  return null;
}

export function getAuthUser(req: NextRequest): JwtPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(
  req: NextRequest
): { user: JwtPayload } | { error: string; status: number } {
  const user = getAuthUser(req);
  if (!user) return { error: "احراز هویت الزامی است", status: 401 };
  return { user };
}

export function requireAdmin(
  req: NextRequest
): { user: JwtPayload } | { error: string; status: number } {
  const result = requireAuth(req);
  if ("error" in result) return result;
  if (result.user.role !== "ADMIN")
    return { error: "دسترسی ممنوع", status: 403 };
  return result;
}

// Cookie config — httpOnly, SameSite=Strict, Secure in production
export const COOKIE_CONFIG = {
  name: "auth_token",
  httpOnly: true,
  sameSite: "lax" as const,
  // Only use secure flag if explicitly on HTTPS (not plain HTTP Docker deployments)
  secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https") ?? false,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};
