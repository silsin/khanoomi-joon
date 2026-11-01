import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { getAuthUser } from "@/lib/auth";
import { deposit, getAccount, listOrders, listTransactions, TradeError } from "@/lib/trading";
import { livePrices } from "@/lib/trade-market";

/**
 * POST /api/trade/deposit — top up the wallet.
 *   body: { amount }
 *
 * This is a placeholder balance credit so the app is usable today; it is NOT a
 * payment. Swap the `deposit()` call for a real gateway verification (callback →
 * signed receipt → credit) before taking money, and gate it behind an env flag.
 * The engine's own ceiling (MAX_WITHDRAW) is what bounds the amount for now.
 */
export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    const body = (await req.json()) as { amount?: number };
    const wallet = deposit(user.userId, Number(body.amount));

    // Live prices, so the portfolio that comes back already shows a value.
    const market = await livePrices(null);

    return withCors(
      req,
      ok({
        wallet,
        account: getAccount(user.userId, market.prices),
        transactions: listTransactions(user.userId, 50),
        orders: listOrders(user.userId, 50),
        prices: market.prices,
      })
    );
  } catch (e) {
    if (e instanceof TradeError) return withCors(req, error(e.message, 400));
    console.error("[trade/deposit] error:", e);
    return withCors(req, serverError());
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

