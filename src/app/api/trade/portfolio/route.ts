import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { getAuthUser } from "@/lib/auth";
import { livePrices } from "@/lib/trade-market";
import { getAccount, listTransactions, listDeposits, TradeError } from "@/lib/trading";

/**
 * GET /api/trade/portfolio → open positions with live P/L, cash, and the ledger.
 *
 * Thin wrapper over `getAccount`, so the PWA's portfolio screen refreshes from
 * one call instead of stitching wallet + positions + statement itself.
 */
export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    // Fall back to cost basis when the board is down so the screen still renders.
    const market = await livePrices(null);
    const prices: Record<string, number> = {
      ...market.prices,
      ...market.sells,
      ...market.buys,
    };
    return withCors(
      req,
      ok({
        account: getAccount(user.userId, prices),
        transactions: listTransactions(user.userId, 100),
        deposits: listDeposits(user.userId, 50),
      })
    );
  } catch (e) {
    if (e instanceof TradeError) return withCors(req, error(e.message, 400));
    console.error("[trade/portfolio] error:", e);
    return withCors(req, serverError());
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

