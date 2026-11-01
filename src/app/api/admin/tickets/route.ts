import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { support } from "@/lib/db";
import { ok, error, serverError } from "@/lib/response";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const result = requireAdmin(req);
    if ("error" in result) return error(result.error, result.status);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const statusRaw = (searchParams.get("status") || "").toUpperCase();
    const status = statusRaw === "OPEN" || statusRaw === "CLOSED" ? (statusRaw as "OPEN" | "CLOSED") : undefined;
    const search = (searchParams.get("search") || "").trim() || undefined;

    const { rows, total } = support.listTickets({
      status,
      search,
      limit,
      offset: (page - 1) * limit,
    });

    return ok({
      tickets: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

