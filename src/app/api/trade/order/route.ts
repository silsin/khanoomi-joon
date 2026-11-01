import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { getAuthUser } from "@/lib/auth";
import { placeOrder, getWallet, listOrders, getPosition, TradeError, type TradeSide } from "@/lib/trading";
import { livePrices, isTradeSymbol } from "@/lib/trade-market";

/**
 * POST /api/trade/order  → market buy/sell
 *   body: { symbol, side: "BUY" | "SELL", grams }
 *
 * The execution price is NOT taken from the client. We re-read the live board
 * server-side (the same cached reading the site shows) and fill at that price,
 * so a tampered payload cannot buy gold at a price of its choosing.
 *
 * Like akbari's own board, each side fills at ITS side of the market: BUY at
 * the shop's ask (buys quote = base + margin), SELL at the shop's bid (sells
 * quote = base − margin). Only when the source carries no margins do we fall
 * back to the single base price (the fee model then applies on settlement).
 */
export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    const body = (await req.json()) as {
      symbol?: string;
      side?: string;
      grams?: number;
    };

    const symbol = (body.symbol ?? "").trim();
    const side = (body.side ?? "").toUpperCase() === "SELL" ? "SELL" : "BUY";
    const grams = Number(body.grams);

    if (!isTradeSymbol(symbol)) {
      return withCors(req, error("نماد معاملاتی نامعتبر است", 400));
    }

    // Server-side price — never trust the client's number.
    const market = await livePrices(null);
    const base = market.prices[symbol];
    if (!base) return withCors(req, error("قیمت این نماد در دسترس نیست", 503));
    const quote = side === "SELL" ? market.sells[symbol] : market.buys[symbol];
    const price = quote ?? base;

    const order = placeOrder(user.userId, {
      symbol,
      side: side as TradeSide,
      grams,
      price,
    });

    return withCors(
      req,
      ok({
        order,
        wallet: getWallet(user.userId),
        position: getPosition(user.userId, symbol),
        orders: listOrders(user.userId, 50),
        fillPrice: price,
      })
    );
  } catch (e) {
    if (e instanceof TradeError) return withCors(req, error(e.message, 400));
    console.error("[trade/order] error:", e);
    return withCors(req, serverError());
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
