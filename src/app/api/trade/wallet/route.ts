import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { getAuthUser } from "@/lib/auth";
import { livePrices } from "@/lib/trade-market";
import {
  getAccount,
  deposit,
  withdraw,
  convert,
  listTransactions,
  TradeError,
} from "@/lib/trading";

/**
 * GET  /api/trade/wallet → cash balance, gold holdings, and the ledger.
 * POST /api/trade/wallet → deposit / withdraw / convert.
 *   body: { action: "deposit" | "withdraw" | "convert", ... }
 *
 * This is the wallet surface the PWA's Wallet page talks to. Everything is
 * scoped to the bearer token, so a user can only ever see and move their own
 * money. The P/L and equity arithmetic lives in `getAccount`, so this route
 * never re-implements it.
 *
 * Prices are never accepted from the client: `convert` re-reads the live board
 * here, exactly as the order route does, so a tampered payload cannot swap gold
 * at a price of its choosing.
 */

/** One snapshot shape reused by GET and after every POST action. */
async function snapshot(userId: string) {
  // Fall back to cost basis when the board is down, so the page still renders.
  const market = await livePrices(null);
  const prices: Record<string, number> = {
    ...market.prices,
    ...market.sells,
    ...market.buys,
  };
  return {
    account: getAccount(userId, prices),
    prices,
    transactions: listTransactions(userId, 100),
  };
}

export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    return withCors(req, ok(await snapshot(user.userId)));
  } catch (e) {
    console.error("[trade/wallet] error:", e);
    return withCors(req, serverError());
  }
}

export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    const body = (await req.json()) as {
      action?: string;
      amount?: number;
      fromSymbol?: string;
      toSymbol?: string;
      grams?: number;
      note?: string;
    };
    const action = (body.action ?? "").toLowerCase();

    if (action === "deposit") {
      deposit(user.userId, Number(body.amount));
      return withCors(req, ok(await snapshot(user.userId)));
    }

    if (action === "withdraw") {
      // A real gateway would move money to a bank card/iban; until one is wired
      // this books the debit and records an audit note.
      withdraw(user.userId, Number(body.amount), body.note);
      return withCors(req, ok(await snapshot(user.userId)));
    }

    if (action === "convert") {
      // Server-side prices only — see the note above.
      const market = await livePrices(null);
      const prices: Record<string, number> = {
        ...market.prices,
        ...market.sells,
        ...market.buys,
      };
      const result = convert(user.userId, {
        fromSymbol: body.fromSymbol ?? "",
        toSymbol: body.toSymbol ?? "",
        grams: Number(body.grams),
        prices,
      });
      return withCors(req, ok({ ...(await snapshot(user.userId)), convert: result }));
    }

    return withCors(req, error("کنش نامعتبر است", 400));
  } catch (e) {
    if (e instanceof TradeError) return withCors(req, error(e.message, 400));
    console.error("[trade/wallet] error:", e);
    return withCors(req, serverError());
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

