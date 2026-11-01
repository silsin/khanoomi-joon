import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { getAuthUser } from "@/lib/auth";
import {
  getAccount,
  listTransactions,
  deposit,
  withdraw,
  convert,
  TradeError,
} from "@/lib/trading";
import { livePrices } from "@/lib/trade-market";

/**
 * GET /api/wallet → the whole wallet in one round-trip.
 *
 * Cash, every gold holding (with live market value and P/L), the recent ledger
 * and the equity total. The PWA's wallet screen reads this on mount and again
 * after every action, so it never has to stitch several endpoints together.
 *
 * `?limit=` caps the ledger (default 50, max 200).
 */
export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 50));
    const prices = await livePricesFor();

    return withCors(
      req,
      ok({
        ...getAccount(user.userId, prices),
        transactions: listTransactions(user.userId, limit),
      })
    );
  } catch (e) {
    console.error("[wallet] error:", e);
    return withCors(req, serverError());
  }
}

/**
 * POST /api/wallet → one endpoint for every cash/swap action.
 *
 *   { action: "deposit",  amount }
 *   { action: "withdraw", amount, note? }
 *   { action: "convert",  fromSymbol, toSymbol, grams }
 *
 * Grouped deliberately: every action returns the same wallet payload GET does,
 * so the client can replace its state wholesale instead of diffing per action.
 */
export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    const body = (await req.json()) as {
      action?: string;
      amount?: number;
      note?: string;
      fromSymbol?: string;
      toSymbol?: string;
      grams?: number;
    };
    const action = (body.action ?? "").toLowerCase();

    if (action === "deposit") {
      deposit(user.userId, Number(body.amount));
      return withCors(req, ok(await walletPayload(user.userId)));
    }

    if (action === "withdraw") {
      withdraw(user.userId, Number(body.amount), body.note);
      return withCors(req, ok(await walletPayload(user.userId)));
    }

    if (action === "convert") {
      const market = await livePrices(null);
      // Both sides of the market, so a swap prices the way a trade does: the
      // leg leaving the wallet fills at the shop's buy, the arriving leg at its
      // sell.
      const prices = { ...market.buys, ...market.sells };
      const result = convert(user.userId, {
        fromSymbol: String(body.fromSymbol ?? ""),
        toSymbol: String(body.toSymbol ?? ""),
        grams: Number(body.grams),
        prices,
      });
      return withCors(req, ok({ ...(await walletPayload(user.userId)), convert: result }));
    }

    return withCors(req, error("عملیات نامعتبر است", 400));
  } catch (e) {
    if (e instanceof TradeError) return withCors(req, error(e.message, 400));
    console.error("[wallet] error:", e);
    return withCors(req, serverError());
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

/**
 * Live prices keyed by symbol. Deliberately tolerant: if the board is
 * unreachable we return an empty map, and getAccount falls back to each
 * position's cost basis — so a price outage degrades the numbers instead of
 * failing the whole wallet.
 */
async function livePricesFor(): Promise<Record<string, number>> {
  try {
    const market = await livePrices(null);
    return { ...market.buys, ...market.sells };
  } catch {
    return {};
  }
}

/** The wallet snapshot every mutating action returns. */
async function walletPayload(userId: string) {
  const prices = await livePricesFor();
  return {
    ...getAccount(userId, prices),
    transactions: listTransactions(userId, 50),
  };
}
