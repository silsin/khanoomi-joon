import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { getAuthUser } from "@/lib/auth";
import {
  listOrders,
  getOrder,
  placeOrder,
  quote,
  getDebt,
  WholesaleError,
  type OrderLine,
} from "@/lib/wholesale";
import { livePrices } from "@/lib/trade-market";

/**
 * GET  /api/trade/orders        → the goldsmith's orders + current نسیه balance
 * POST /api/trade/orders        → place an order (prices locked at submit time)
 *      ?quote=1                 → price the basket without saving (for the total)
 */
export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    return withCors(
      req,
      ok({
        orders: listOrders(user.userId),
        debt: getDebt(user.userId),
      })
    );
  } catch (e) {
    console.error("[trade/orders] GET error:", e);
    return withCors(req, serverError());
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    const body = (await req.json()) as { lines?: OrderLine[]; note?: string };
    const lines = Array.isArray(body.lines) ? body.lines : [];

    if (!lines.length) return withCors(req, error("سبد سفارش خالی است", 400));

    // Server-side price — the client's numbers are ignored.
    const market = await livePrices("auto");

    // Dry run: show the total without touching the database.
    if (new URL(req.url).searchParams.get("quote") === "1") {
      return withCors(req, ok({ ...quote(lines, market.prices), debt: getDebt(user.userId) }));
    }

    const order = placeOrder(user.userId, lines, market.prices, body.note ?? "");

    return withCors(
      req,
      ok({
        order,
        debt: getDebt(user.userId),
        orders: listOrders(user.userId),
      })
    );
  } catch (e) {
    if (e instanceof WholesaleError) return withCors(req, error(e.message, 400));
    console.error("[trade/orders] POST error:", e);
    return withCors(req, serverError());
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
