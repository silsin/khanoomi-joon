import { NextRequest, NextResponse } from "next/server";
import { ok, error, serverError } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { getAuthUser } from "@/lib/auth";
import { getOrder, setOrderStatus, getDebt, WholesaleError } from "@/lib/wholesale";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/trade/orders/:id — one order with its priced lines. */
export async function GET(req: NextRequest, ctx: Ctx) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    const { id } = await ctx.params;
    const order = getOrder(user.userId, id);
    if (!order) return withCors(req, error("سفارش یافت نشد", 404));
    return withCors(req, ok({ order }));
  } catch (e) {
    console.error("[trade/orders/:id] error:", e);
    return withCors(req, serverError());
  }
}

/**
 * POST /api/trade/orders/:id/cancel — the goldsmith pulls an order that the
 * supplier has not started preparing yet. Only PENDING orders can be cancelled
 * by the customer; anything already CONFIRMED/PREPARING needs the supplier.
 * Cancelling reverses the نسیه that the order had added.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    const { id } = await ctx.params;
    const order = getOrder(user.userId, id);
    if (!order) return withCors(req, error("سفارش یافت نشد", 404));

    if (order.status !== "PENDING") {
      return withCors(
        req,
        error("فقط سفارش‌های در انتظار تأیید قابل لغو هستند؛ برای این وضعیت با پشتیبانی تماس بگیرید", 400)
      );
    }

    const updated = setOrderStatus(id, "CANCELLED");
    return withCors(req, ok({ order: updated, debt: getDebt(user.userId) }));
  } catch (e) {
    if (e instanceof WholesaleError) return withCors(req, error(e.message, 400));
    console.error("[trade/orders/:id] cancel error:", e);
    return withCors(req, serverError());
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

