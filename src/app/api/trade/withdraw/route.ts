import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { getAuthUser } from "@/lib/auth";
import { withdraw, getAccount, listOrders, listTransactions, TradeError } from "@/lib/trading";
import { livePrices } from "@/lib/trade-market";

/**
 * POST /api/trade/withdraw — move cash out of the wallet.
 *   body: { amount, note? }
 *
 * `withdraw()` debits only if the funds are really there (the guard lives in the
 * UPDATE's WHERE clause), so two concurrent requests cannot both pass and
 * overdraw the wallet.
 *
 * The balance is removed immediately and a payout request is recorded. A real
 * payout must not be assumed to have happened: wire your gateway here (bank
 * transfer / Sheba → status PENDING → settled by callback) and keep the ledger
 * row as the request, not the confirmation.
 */
export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    const body = (await req.json()) as { amount?: number; note?: string };
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : "";

    const wallet = withdraw(user.userId, Number(body.amount), note);
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
    console.error("[trade/withdraw] error:", e);
    return withCors(req, serverError());
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
