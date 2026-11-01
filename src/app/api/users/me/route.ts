import { NextRequest } from "next/server";
import { users } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, error, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const result = requireAuth(req);
    if ("error" in result) return error(result.error, result.status);
    const user = users.findById(result.user.userId);
    if (!user) return error("کاربر یافت نشد", 404);
    return ok(user);
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const result = requireAuth(req);
    if ("error" in result) return error(result.error, result.status);

    const body = await req.json();
    const { name, address, email } = body;

    if (name !== undefined && !String(name).trim()) {
      return error("نام نمی‌تواند خالی باشد");
    }

    // Validate email if provided (optional field)
    if (email !== undefined && email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return error("فرمت ایمیل نامعتبر است");
    }

    users.update(result.user.userId, {
      ...(name    !== undefined ? { name:    String(name).trim() }         : {}),
      ...(address !== undefined ? { address: String(address).trim() || "" } : {}),
      ...(email   !== undefined ? { email:   String(email).trim() }         : {}),
    });

    const updated = users.findById(result.user.userId);
    return ok(updated);
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
