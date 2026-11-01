/**
 * Trade symbols and their live prices.
 *
 * The PWA needs one canonical list of tradeable symbols with a Toman price,
 * resolved from the site's existing gold-price pipeline (اتحادیه first, خانوم جون
 * as the alternate source). This module is that single mapping so the board, the
 * chart and the order book can never disagree.
 *
 * The board's own GET handler is called directly (not over HTTP) so the trading
 * API shares the exact same in-memory cache, snapshot and in-flight guard as a
 * shopper pressing the refresh button.
 */
import { NextRequest } from "next/server";
import { getCandles } from "./trading";
import { getSetting } from "./settings";
import { GET as goldPriceGET } from "@/app/api/admin/gold-price/route";

export interface TradeSymbol {
  /** Stable key stored on orders/positions/history. */
  symbol: string;
  name: string;
  /** Short label for the symbol picker. */
  short: string;
  /** Unit shown next to the price. */
  unit: string;
  /** Coins are traded per piece, gold per gram. */
  kind: "gold" | "coin";
}

export const TRADE_SYMBOLS: TradeSymbol[] = [
  { symbol: "GOLD18", name: "طلای ۱۸ عیار", short: "۱۸ عیار", unit: "گرم", kind: "gold" },
  { symbol: "GOLD24", name: "طلای ۲۴ عیار", short: "۲۴ عیار", unit: "گرم", kind: "gold" },
  { symbol: "MAZANEH", name: "مظنه تهران", short: "مظنه", unit: "مثقال", kind: "gold" },
  { symbol: "COIN_NEW", name: "سکه امامی (طرح جدید)", short: "سکه جدید", unit: "عدد", kind: "coin" },
  { symbol: "COIN_OLD", name: "سکه بهار آزادی (طرح قدیم)", short: "سکه قدیم", unit: "عدد", kind: "coin" },
  { symbol: "COIN_HALF", name: "نیم سکه", short: "نیم سکه", unit: "عدد", kind: "coin" },
  { symbol: "COIN_QUARTER", name: "ربع سکه", short: "ربع سکه", unit: "عدد", kind: "coin" },
  { symbol: "COIN_GRAM", name: "سکه گرمی", short: "سکه گرمی", unit: "عدد", kind: "coin" },
];

export const DEFAULT_TRADE_SYMBOL = "GOLD18";

export function isTradeSymbol(value: string): boolean {
  return TRADE_SYMBOLS.some(s => s.symbol === value);
}

export function symbolMeta(symbol: string): TradeSymbol | null {
  return TRADE_SYMBOLS.find(s => s.symbol === symbol) ?? null;
}

export type PriceChoice = "auto" | "estjt" | "tgju" | "akbari";

export function isPriceChoice(v: string | null): v is PriceChoice {
  return v === "auto" || v === "estjt" || v === "tgju" || v === "akbari";
}

/**
 * Read the live board once, then map every trade symbol to a Toman price.
 * A coin is priced per piece and gold per gram, so `price` of a symbol is
 * directly comparable with what the shopper sees on the site.
 *
 * `choice` picks the upstream, `null` (the default) honors the site-wide
 * `gold_price_source` setting — `"auto"` (estjt primary + TGJU gap-fill) is
 * only for callers that ask for it explicitly, so the public feed and the
 * order book always move together.
 */
export async function livePrices(
  choice: PriceChoice | null = null
): Promise<{
  prices: Record<string, number>;
  /**
   * Per-side quotes (akbari-style): what the shop BUYS at (customer sells)
   * and SELLS at (customer buys), per symbol. Empty objects when the source
   * carries no margins — callers then fall back to the base fee model.
   */
  buys: Record<string, number>;
  sells: Record<string, number>;
  /** Which upstream actually produced the payload. */
  source: string;
  sourceTitle: string;
  updatedAt: number;
  stale: boolean;
  note?: string;
}> {
  const sourceChoice: PriceChoice = isPriceChoice(choice) ? choice : (getSetting("gold_price_source")?.trim() as PriceChoice) || "auto";
  const actualChoice: PriceChoice = isPriceChoice(sourceChoice) ? sourceChoice : "auto";
  const req = new NextRequest(`http://internal/api/admin/gold-price?source=${actualChoice}`);
  const res = await goldPriceGET(req);
  const json = (await res.json()) as {
    data?: {
      source?: string;
      sourceTitle?: string;
      updatedAt?: number;
      stale?: boolean;
      note?: string;
      rates?: Record<string, number | undefined>;
      buys?: Record<string, number | undefined>;
      sells?: Record<string, number | undefined>;
    };
  };
  const d = json?.data ?? {};
  const r = d.rates ?? {};

  const prices: Record<string, number> = {};
  const put = (symbol: string, value: number | undefined) => {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) prices[symbol] = Math.round(value);
  };

  put("GOLD18", r.gold18k);
  put("GOLD24", r.gold24k);
  put("MAZANEH", r.mazanehTehran);
  put("COIN_NEW", r.coinNew);
  put("COIN_OLD", r.coinOld);
  put("COIN_HALF", r.coinHalf);
  put("COIN_QUARTER", r.coinQuarter);
  put("COIN_GRAM", r.coinGram);

  // Side quotes ride the same rate-key → symbol mapping; a quote is only
  // accepted when its base price exists, and buy must be above sell.
  const buys: Record<string, number> = {};
  const sells: Record<string, number> = {};
  const putQuote = (symbol: string, buy: number | undefined, sell: number | undefined) => {
    if (!(symbol in prices)) return;
    const b = Math.round(Number(buy));
    const s = Math.round(Number(sell));
    if (Number.isFinite(b) && Number.isFinite(s) && b > 0 && s > 0 && b >= s) {
      buys[symbol] = b;
      sells[symbol] = s;
    }
  };
  putQuote("GOLD18", d.buys?.gold18k, d.sells?.gold18k);
  putQuote("GOLD24", d.buys?.gold24k, d.sells?.gold24k);
  putQuote("MAZANEH", d.buys?.mazanehTehran, d.sells?.mazanehTehran);
  putQuote("COIN_NEW", d.buys?.coinNew, d.sells?.coinNew);
  putQuote("COIN_OLD", d.buys?.coinOld, d.sells?.coinOld);
  putQuote("COIN_HALF", d.buys?.coinHalf, d.sells?.coinHalf);
  putQuote("COIN_QUARTER", d.buys?.coinQuarter, d.sells?.coinQuarter);
  putQuote("COIN_GRAM", d.buys?.coinGram, d.sells?.coinGram);

  return {
    prices,
    buys,
    sells,
    source: d.source ?? "fallback",
    sourceTitle: d.sourceTitle ?? "",
    updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : Date.now(),
    stale: Boolean(d.stale),
    ...(d.note ? { note: d.note } : {}),
  };
}

/** Candles for the chart, re-exported so routes don't reach into the engine. */
export function candlesFor(symbol: string, range: string) {
  return getCandles(symbol, range);
}
