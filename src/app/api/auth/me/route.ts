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
