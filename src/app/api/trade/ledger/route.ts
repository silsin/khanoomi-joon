import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/response";
import { corsPreflight, withCors } from "@/lib/cors";
import { getAuthUser } from "@/lib/auth";
import { getDebt, listLedger, recordPayment, WholesaleError } from "@/lib/wholesale";

/**
 * GET  /api/trade/ledger → نسیه statement (what the goldsmith owes) + entries
 * POST /api/trade/ledger → record a settlement (payment) against the balance
 */
export async function GET(req: NextRequest) {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    return withCors(req, ok({ debt: getDebt(user.userId), entries: listLedger(user.userId) }));
  } catch (e) {
    console.error("[trade/ledger] GET error:", e);
    return withCors(req, serverError());
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return withCors(req, error("احراز هویت لازم است", 401));

  try {
    const body = (await req.json()) as { amount?: number; note?: string };
    const entry = recordPayment(user.userId, Number(body.amount), body.note ?? "");
    return withCors(req, ok({ entry, debt: getDebt(user.userId), entries: listLedger(user.userId) }));
  } catch (e) {
    if (e instanceof WholesaleError) return withCors(req, error(e.message, 400));
    console.error("[trade/ledger] POST error:", e);
    return withCors(req, serverError());
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
