import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { support } from "@/lib/db";
import { ok, error, notFound, serverError } from "@/lib/response";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = requireAdmin(req);
    if ("error" in result) return error(result.error, result.status);

    const { id } = await params;
    const detail = support.getTicketDetail(id);
    if (!detail) return notFound("تیکت یافت نشد");
    return ok(detail);
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = requireAdmin(req);
    if ("error" in result) return error(result.error, result.status);

    const { id } = await params;
    const body = await req.json();

    const action = String(body?.action ?? "").trim();
    if (action === "reply") {
      const message = String(body?.message ?? "").trim();
      if (!message) return error("متن پاسخ الزامی است");
      const detail = support.getTicketDetail(id);
      if (!detail) return notFound("تیکت یافت نشد");
      support.reply(id, message);
      return ok({ saved: true });
    }

    if (action === "status") {
      const next = String(body?.status ?? "").toUpperCase();
      if (next !== "OPEN" && next !== "CLOSED") return error("وضعیت نامعتبر است");
      const detail = support.getTicketDetail(id);
      if (!detail) return notFound("تیکت یافت نشد");
      support.setStatus(id, next as "OPEN" | "CLOSED");
      return ok({ saved: true });
    }

    return error("درخواست نامعتبر است");
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
