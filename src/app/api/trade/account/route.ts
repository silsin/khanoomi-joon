import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { getAuthUser } from "@/lib/auth";
import { getAccount, listOrders, listTransactions } from "@/lib/trading";
import { livePrices, TRADE_SYMBOLS } from "@/lib/trade-market";

/**
 * GET /api/trade/account — wallet, open positions, P&L and recent orders.
 * Bearer token auth (the PWA holds the JWT, it cannot use our cookies).
 */
export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    const market = await livePrices("auto");
    const account = getAccount(user.userId, market.prices);
    const orders = listOrders(user.userId, 50);

    return withCors(
      req,
      ok({
        user: { id: user.userId, email: user.email, role: user.role },
        wallet: account.wallet,
        positions: account.positions,
        equity: account.equity,
        totalPnl: account.totalPnl,
        feePercent: account.feePercent,
        orders,
        // Wallet statement — the same rows the Wallet page renders.
        transactions: listTransactions(user.userId, 100),
        prices: market.prices,
        symbols: TRADE_SYMBOLS,
        updatedAt: market.updatedAt,
      })
    );
  } catch (e) {
    console.error("[trade/account] error:", e);
    return withCors(req, serverError());
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
