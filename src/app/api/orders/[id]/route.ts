import { NextRequest } from "next/server";
import { orders } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { serializeOrderDetail } from "@/lib/serialize";
import { ok, error, notFound, serverError } from "@/lib/response";
import { normalizePhone } from "@/lib/phone";
import { sendOrderStatusSms } from "@/lib/kavenegar";

const VALID_STATUSES = ["PENDING","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED"];

function resolveOrderSmsPhone(order: {
  recipient_phone?: string | null;
  delivery_phone?: string | null;
  user_phone_login?: string | null;
  user_phone?: string | null;
}): string | null {
  const candidates = [
    order.recipient_phone,
    order.delivery_phone,
    order.user_phone_login,
    order.user_phone,
  ];
  for (const raw of candidates) {
    const phone = normalizePhone(String(raw ?? ""));
    if (phone) return phone;
  }
  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = requireAuth(req);
    if ("error" in result) return error(result.error, result.status);
    const { id } = await params;
    const isAdmin = result.user.role === "ADMIN";
    const order = orders.findById(id, isAdmin ? undefined : result.user.userId);
    return order ? ok(serializeOrderDetail(order)) : notFound("سفارش یافت نشد");
  } catch (e) { console.error(e); return serverError(); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = requireAdmin(req);
    if ("error" in result) return error(result.error, result.status);
    const { id } = await params;
    const { status } = await req.json();
    if (!VALID_STATUSES.includes(status)) return error("وضعیت نامعتبر است");

    const existing = orders.findById(id);
    if (!existing) return notFound("سفارش یافت نشد");

    const previousStatus = existing.status;
    const updated = orders.updateStatus(id, status);

    let smsSent = false;
    let smsSkipped = previousStatus === status;
    let smsError: string | null = null;
    let smsPhone: string | null = null;

    if (previousStatus !== status) {
      smsPhone = resolveOrderSmsPhone(updated!);
      if (!smsPhone) {
        smsError = "شماره موبایل معتبری برای ارسال پیامک یافت نشد";
        console.warn(`Order ${id}: no valid mobile for status SMS`);
      } else {
        try {
          await sendOrderStatusSms(smsPhone, id, status);
          smsSent = true;
        } catch (e) {
          smsError = e instanceof Error ? e.message : "خطا در ارسال پیامک";
          console.error("Order status SMS error:", e);
        }
      }
    }

    return ok({
      ...serializeOrderDetail(updated!),
      smsSent,
      smsSkipped,
      smsError,
      smsPhone,
    });
  } catch (e) { console.error(e); return serverError(); }
}
