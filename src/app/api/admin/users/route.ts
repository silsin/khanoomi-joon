import { NextRequest } from "next/server";
import { users } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { serializeUser } from "@/lib/serialize";
import { ok, error, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const result = requireAdmin(req);
    if ("error" in result) return error(result.error, result.status);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const search = searchParams.get("search") || undefined;
    const { rows, total } = users.list({ search, limit, offset: (page - 1) * limit });
    return ok({
      users: rows.map(serializeUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) { console.error(e); return serverError(); }
}
