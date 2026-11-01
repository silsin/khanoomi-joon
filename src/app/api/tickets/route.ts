import { NextRequest } from "next/server";
import { created, error, serverError } from "@/lib/response";
import { support } from "@/lib/db";

export const runtime = "nodejs";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!name) return error("نام الزامی است");
    if (!email || !isEmail(email)) return error("ایمیل معتبر وارد کنید");
    if (!message) return error("متن پیام الزامی است");

    const id = support.createTicket({
      name,
      email,
      phone: phone || undefined,
      subject: subject || undefined,
      message,
    });

    return created({ ticketId: id });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

