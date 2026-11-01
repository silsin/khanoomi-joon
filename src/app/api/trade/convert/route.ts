import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { getAuthUser } from "@/lib/auth";
import { convert, listTransactions, listOrders, TradeError } from "@/lib/trading";
import { livePrices, isTradeSymbol } from "@/lib/trade-market";

/**
 * POST /api/trade/convert — swap one gold holding for another.
 *   body: { fromSymbol, toSymbol, grams }
 *
 * Like /order, the price is never taken from the client: both sides are filled
 * from the server's own board, so the swap cannot be steered to a price of the
 * caller's choosing. The engine charges one commission on the liquidation leg.
 */
export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    const body = (await req.json()) as {
      fromSymbol?: string;
      toSymbol?: string;
      grams?: number;
    };

    const fromSymbol = (body.fromSymbol ?? "").trim();
    const toSymbol = (body.toSymbol ?? "").trim();

    if (!isTradeSymbol(fromSymbol) || !isTradeSymbol(toSymbol)) {
      return withCors(req, error("نماد معاملاتی نامعتبر است", 400));
    }

    const market = await livePrices(null);
    if (!market.prices[fromSymbol] || !market.prices[toSymbol]) {
      return withCors(req, error("قیمت یکی از نمادها در دسترس نیست", 503));
    }

    // Hand the engine both sides of the spread, exactly as /order does: the
    // source leg is a sale (bid), the target leg a purchase (ask). Without these
    // the engine falls back to the mid price and the swap silently loses the
    // margin the shop would charge on a real round trip.
    const result = convert(user.userId, {
      fromSymbol,
      toSymbol,
      grams: Number(body.grams),
      prices: market.prices,
      sells: market.sells,
      buys: market.buys,
    });

    return withCors(
      req,
      ok({
        conversion: result,
        wallet: result.wallet,
        positions: result.positions,
        transactions: listTransactions(user.userId, 50),
        orders: listOrders(user.userId, 50),
        prices: market.prices,
      })
    );
  } catch (e) {
    if (e instanceof TradeError) return withCors(req, error(e.message, 400));
    console.error("[trade/convert] error:", e);
    return withCors(req, serverError());
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
