/**
 * Trading engine — wallets, positions, orders and the price history that feeds
 * the chart of the separate Vue PWA.
 *
 * Everything is money in **Toman** (integers) and weight in **grams**
 * (REAL). Positions use weighted-average cost, so a position opened in several
 * buys keeps one average entry price — that is what traders expect from a P&L.
 *
 * SERVER ONLY (imports the SQLite layer). Like the rest of `db.ts`, tables are
 * created on first touch so a fresh database needs no manual migration.
 */
import { getDb, generateId } from "./db";

let _ready = false;

function ensureSchema(): void {
  if (_ready) return;
  _ready = true;
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS trade_wallets (
      user_id    TEXT PRIMARY KEY,
      balance    INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- One row per symbol the user currently holds (grams > 0).
    CREATE TABLE IF NOT EXISTS trade_positions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      symbol     TEXT NOT NULL,
      grams      REAL NOT NULL DEFAULT 0,
      avg_cost   INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, symbol)
    );
    CREATE INDEX IF NOT EXISTS idx_trade_positions_user ON trade_positions(user_id);

    CREATE TABLE IF NOT EXISTS trade_orders (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      symbol     TEXT NOT NULL,
      side       TEXT NOT NULL,
      grams      REAL NOT NULL,
      price      INTEGER NOT NULL,
      amount     INTEGER NOT NULL,
      fee        INTEGER NOT NULL DEFAULT 0,
      pnl        INTEGER,
      status     TEXT NOT NULL DEFAULT 'FILLED',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_trade_orders_user ON trade_orders(user_id, created_at DESC);

    -- Sampled price ticks (server-side) so the chart has real history.
    CREATE TABLE IF NOT EXISTS trade_price_history (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      price  INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      at     INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_trade_price_history_sym ON trade_price_history(symbol, at DESC);

    CREATE TABLE IF NOT EXISTS trade_deposits (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      amount     INTEGER NOT NULL,
      kind       TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_trade_deposits_user ON trade_deposits(user_id, created_at DESC);

    -- The wallet ledger: every Toman that entered, left, or moved between
    -- symbols. amount is always the wallet impact (positive = money in),
    -- because that is what a statement line means to a user.
    CREATE TABLE IF NOT EXISTS trade_transactions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      kind       TEXT NOT NULL,
      amount     INTEGER NOT NULL DEFAULT 0,
      symbol     TEXT,
      grams      REAL,
      note       TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_trade_transactions_user ON trade_transactions(user_id, created_at DESC);
  `);
}

/** Commissions are quoted in percent (e.g. 0.5 = half a percent). */
export const TRADE_FEE_PERCENT = 0.5;

export type TradeSide = "BUY" | "SELL";

export interface TradeWallet {
  userId: string;
  balance: number;
  updatedAt: string;
}

export interface TradePosition {
  id: string;
  userId: string;
  symbol: string;
  grams: number;
  avgCost: number;
}

export interface TradeOrder {
  id: string;
  userId: string;
  symbol: string;
  side: TradeSide;
  grams: number;
  price: number;
  amount: number;
  fee: number;
  pnl: number | null;
  status: string;
  createdAt: string;
}

export class TradeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradeError";
  }
}

/** Round money to whole Toman — never store fractional rial. */
function money(value: number): number {
  return Math.round(value);
}

function feeFor(amount: number): number {
  return money((amount * TRADE_FEE_PERCENT) / 100);
}

// ── Wallet ──────────────────────────────────────────────────────────────────

export function getWallet(userId: string): TradeWallet {
  ensureSchema();
  const db = getDb();
  const sel = db.prepare(
    "SELECT user_id, balance, updated_at FROM trade_wallets WHERE user_id = ?"
  );
  const row = sel.get(userId) as
    | { user_id: string; balance: number; updated_at: string }
    | undefined;
  if (row) return { userId: row.user_id, balance: row.balance, updatedAt: row.updated_at };

  // Created lazily so a brand-new user always has a row to read.
  db.prepare("INSERT INTO trade_wallets (user_id, balance) VALUES (?, 0)").run(userId);
  const fresh = sel.get(userId) as { user_id: string; balance: number; updated_at: string };
  return { userId: fresh.user_id, balance: fresh.balance, updatedAt: fresh.updated_at };
}

function credit(userId: string, amount: number): void {
  getWallet(userId);
  getDb()
    .prepare(
      "UPDATE trade_wallets SET balance = balance + ?, updated_at = datetime('now') WHERE user_id = ?"
    )
    .run(amount, userId);
}

/** Demo top-up so the PWA is usable before a real payment gateway is wired. */
export function deposit(userId: string, amount: number): TradeWallet {
  const value = money(Number(amount));
  if (!Number.isFinite(value) || value <= 0) throw new TradeError("مبلغ واریز نامعتبر است");
  if (value > 500_000_000) throw new TradeError("حداکثر مبلغ هر واریز ۵۰۰ میلیون تومان است");
  credit(userId, value);
  getDb()
    .prepare("INSERT INTO trade_deposits (id, user_id, amount, kind) VALUES (?, ?, ?, ?)")
    .run(generateId(), userId, value, "DEMO_DEPOSIT");
  recordTx(userId, "DEPOSIT", value, null, null, "واریز به کیف پول");
  return getWallet(userId);
}

// ── Ledger ──────────────────────────────────────────────────────────────────

/** Every kind of movement the wallet statement can show. */
export type TradeTxKind =
  | "DEPOSIT"  // money in
  | "WITHDRAW" // money out
  | "BUY"      // cash spent on gold
  | "SELL"     // cash received from gold
  | "CONVERT"  // gold → gold, no cash moves
  | "FEE";     // commission, shown for reference

export interface TradeTransaction {
  id: string;
  userId: string;
  kind: TradeTxKind;
  /** Toman moved. Positive = into the wallet, negative = out of it. */
  amount: number;
  symbol: string | null;
  grams: number | null;
  note: string;
  createdAt: string;
}

/**
 * Append one statement line. Called *after* the balance has already moved, so a
 * failure here must never roll back a completed trade — losing the audit row is
 * the better outcome.
 */
function recordTx(
  userId: string,
  kind: TradeTxKind,
  amount: number,
  symbol: string | null,
  grams: number | null,
  note: string
): void {
  getDb()
    .prepare(
      "INSERT INTO trade_transactions (id, user_id, kind, amount, symbol, grams, note) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(generateId(), userId, kind, money(amount), symbol, grams, note);
}

type TxRow = {
  id: string;
  user_id: string;
  kind: string;
  amount: number;
  symbol: string | null;
  grams: number | null;
  note: string;
  created_at: string;
};

export function listTransactions(userId: string, limit = 100): TradeTransaction[] {
  ensureSchema();
  const rows = getDb()
    .prepare(
      "SELECT id, user_id, kind, amount, symbol, grams, note, created_at " +
        "FROM trade_transactions WHERE user_id = ? " +
        "ORDER BY created_at DESC, rowid DESC LIMIT ?"
    )
    .all(userId, limit) as TxRow[];
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    kind: r.kind as TradeTxKind,
    amount: r.amount,
    symbol: r.symbol,
    grams: r.grams,
    note: r.note,
    createdAt: r.created_at,
  }));
}

type DepositRow = {
  id: string;
  user_id: string;
  amount: number;
  kind: string;
  created_at: string;
};

export interface TradeDeposit {
  id: string;
  userId: string;
  amount: number;
  kind: string;
  createdAt: string;
}

export function listDeposits(userId: string, limit = 50): TradeDeposit[] {
  ensureSchema();
  const rows = getDb()
    .prepare(
      "SELECT id, user_id, amount, kind, created_at FROM trade_deposits " +
        "WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?"
    )
    .all(userId, limit) as DepositRow[];
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    amount: r.amount,
    kind: r.kind,
    createdAt: r.created_at,
  }));
}

// ── Withdrawals ─────────────────────────────────────────────────────────────

/** Largest single withdrawal, matching the deposit ceiling so they stay in step. */
export const MAX_WITHDRAW = 500_000_000;

/**
 * Move cash out of the wallet. In this build it records a payout request; wire a
 * real gateway's verification here before taking real money (see the route).
 *
 * The balance is checked and debited in a single statement, so two concurrent
 * withdrawals cannot both pass the same check and overdraw the wallet.
 */
export function withdraw(userId: string, amount: number, note = ""): TradeWallet {
  const value = money(Number(amount));
  if (!Number.isFinite(value) || value <= 0) throw new TradeError("مبلغ برداشت نامعتبر است");
  if (value > MAX_WITHDRAW)
    throw new TradeError("حداکثر مبلغ هر برداشت ۵۰۰ میلیون تومان است");

  ensureSchema();
  getWallet(userId); // make sure the row exists before we update it

  // The WHERE clause is the guard: only debit when the funds are really there.
  const result = getDb()
    .prepare(
      "UPDATE trade_wallets SET balance = balance - ?, updated_at = datetime('now') " +
        "WHERE user_id = ? AND balance >= ?"
    )
    .run(value, userId, value);
  if (result.changes !== 1) throw new TradeError("موجودی کیف پول کافی نیست");

  recordTx(userId, "WITHDRAW", -value, null, null, note || "برداشت از کیف پول");
  return getWallet(userId);
}

// ── Conversion (gold → gold) ────────────────────────────────────────────────

export interface ConvertInput {
  fromSymbol: string;
  toSymbol: string;
  /** Weight of the source symbol to liquidate. */
  grams: number;
  /** Mid price per symbol — used to value positions and as a fallback leg price. */
  prices: Record<string, number>;
  /** Bid side per symbol; the source leg is a sale, so it fills here when present. */
  sells?: Record<string, number>;
  /** Ask side per symbol; the target leg is a purchase, so it fills here when present. */
  buys?: Record<string, number>;
}

export interface ConvertResult {
  fromSymbol: string;
  toSymbol: string;
  /** Weight taken out of the source holding. */
  gramsOut: number;
  /** Weight added to the target holding. */
  gramsIn: number;
  /** Cash the source leg raised, before commission. */
  grossAmount: number;
  /** Commission charged on the liquidation leg. */
  fee: number;
  /** Price used for the source symbol. */
  priceOut: number;
  /** Price used for the target symbol. */
  priceIn: number;
  wallet: TradeWallet;
  positions: PositionView[];
}

/**
 * Swap one gold holding for another without touching the cash balance: sell
 * symbol A, immediately buy symbol B with the proceeds.
 *
 * One commission is charged, on the liquidation leg — what a desk does when it
 * nets a swap. Both legs happen inside a transaction, so a failure part-way
 * cannot leave the user with gold removed but nothing bought.
 *
 * `prices` must come from the server's own board (the route reads it), never the
 * client, or the swap could be steered to a favourable price.
 */
export function convert(userId: string, input: ConvertInput): ConvertResult {
  ensureSchema();
  const from = (input.fromSymbol ?? "").trim();
  const to = (input.toSymbol ?? "").trim();
  const grams = Number(input.grams);

  if (!from) throw new TradeError("نماد مبدأ نامعتبر است");
  if (!to) throw new TradeError("نماد مقصد نامعتبر است");
  if (from === to) throw new TradeError("نماد مبدأ و مقصد یکسان است");
  if (!Number.isFinite(grams) || grams <= 0) throw new TradeError("وزن نامعتبر است");
  if (grams < 0.001) throw new TradeError("حداقل وزن تبدیل ۰٫۰۰۱ است");
  if (grams > 100_000) throw new TradeError("حداکثر وزن هر تبدیل ۱۰۰٬۰۰۰ است");

  // Each leg fills on ITS side of the spread, exactly as the order route does:
  // the source is sold (bid), the target is bought (ask). Only when the source
  // carries no margins do we fall back to the single mid price.
  const priceOut = money(Number(input.sells?.[from] ?? input.prices?.[from]));
  const priceIn = money(Number(input.buys?.[to] ?? input.prices?.[to]));
  if (!Number.isFinite(priceOut) || priceOut <= 0)
    throw new TradeError("قیمت نماد مبدأ در دسترس نیست");
  if (!Number.isFinite(priceIn) || priceIn <= 0)
    throw new TradeError("قیمت نماد مقصد در دسترس نیست");

  const source = getPosition(userId, from);
  if (!source || source.grams + 1e-9 < grams) {
    throw new TradeError("از نماد مبدأ به اندازه درخواستی موجودی ندارید");
  }

  // One commission, taken off the liquidation leg.
  const grossAmount = money(grams * priceOut);
  const fee = feeFor(grossAmount);
  const netAmount = money(grossAmount - fee);
  const gramsIn = netAmount / priceIn;
  if (gramsIn <= 1e-9) throw new TradeError("ارزش سفارش برای خرید نماد مقصد کافی نیست");

  const db = getDb();
  db.exec("BEGIN");
  try {
    // Leg 1 — liquidate the source, keeping its weighted-average cost basis.
    upsertPosition(userId, from, source.grams - grams, source.avgCost);
    // All three rows below are kind CONVERT: a swap moves weight, not cash, so
    // none of them may be counted when reconciling the ledger to the balance.
    // `amount` is a signed reference figure — showing it keeps the statement
    // readable instead of printing a bare 0 for the whole swap.
    recordTx(
      userId,
      "CONVERT",
      -grossAmount,
      from,
      grams,
      `تبدیل ${from} به ${to} — فروش ${grams} ${from} (${grossAmount.toLocaleString("fa-IR")} تومان)`
    );
    recordTx(
      userId,
      "CONVERT",
      -fee,
      from,
      grams,
      `کارمزد تبدیل (${fee.toLocaleString("fa-IR")} تومان)`
    );

    // Leg 2 — buy the target, weighted into any existing holding.
    const target = getPosition(userId, to);
    const held = target?.grams ?? 0;
    const totalGrams = held + gramsIn;
    const avgCost =
      totalGrams > 0 ? ((target?.avgCost ?? 0) * held + priceIn * gramsIn) / totalGrams : priceIn;
    upsertPosition(userId, to, totalGrams, avgCost);
    recordTx(
      userId,
      "CONVERT",
      netAmount,
      to,
      gramsIn,
      `تبدیل ${from} به ${to} — خرید ${gramsIn.toFixed(3)} ${to} (${netAmount.toLocaleString("fa-IR")} تومان)`
    );

    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  return {
    fromSymbol: from,
    toSymbol: to,
    gramsOut: grams,
    gramsIn,
    grossAmount,
    fee,
    priceOut,
    priceIn,
    wallet: getWallet(userId),
    positions: listPositions(userId).map(p => {
      const market = input.prices[p.symbol] ?? p.avgCost;
      const marketValue = money(p.grams * market);
      const cost = money(p.grams * p.avgCost);
      const pnl = marketValue - cost;
      return {
        ...p,
        marketValue,
        pnl,
        pnlPercent: cost > 0 ? (pnl / cost) * 100 : 0,
      };
    }),
  };
}

// ── Positions ───────────────────────────────────────────────────────────────

type PositionRow = {
  id: string;
  user_id: string;
  symbol: string;
  grams: number;
  avg_cost: number;
};

function toPosition(r: PositionRow): TradePosition {
  return { id: r.id, userId: r.user_id, symbol: r.symbol, grams: r.grams, avgCost: r.avg_cost };
}

export function listPositions(userId: string): TradePosition[] {
  ensureSchema();
  const rows = getDb()
    .prepare(
      "SELECT id, user_id, symbol, grams, avg_cost FROM trade_positions " +
        "WHERE user_id = ? AND grams > 0 ORDER BY symbol"
    )
    .all(userId) as PositionRow[];
  return rows.map(toPosition);
}

export function getPosition(userId: string, symbol: string): TradePosition | null {
  ensureSchema();
  const row = getDb()
    .prepare(
      "SELECT id, user_id, symbol, grams, avg_cost FROM trade_positions WHERE user_id = ? AND symbol = ?"
    )
    .get(userId, symbol) as PositionRow | undefined;
  if (!row || row.grams <= 0) return null;
  return toPosition(row);
}

function upsertPosition(userId: string, symbol: string, grams: number, avgCost: number): void {
  ensureSchema();
  const db = getDb();
  if (grams <= 1e-9) {
    // Fully closed — drop the row so `listPositions` stays clean.
    db.prepare("DELETE FROM trade_positions WHERE user_id = ? AND symbol = ?").run(userId, symbol);
    return;
  }
  db.prepare(
    `INSERT INTO trade_positions (id, user_id, symbol, grams, avg_cost, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, symbol)
     DO UPDATE SET grams = excluded.grams, avg_cost = excluded.avg_cost,
                   updated_at = datetime('now')`
  ).run(generateId(), userId, symbol, grams, money(avgCost));
}

// ── Orders ──────────────────────────────────────────────────────────────────

type OrderRow = {
  id: string;
  user_id: string;
  symbol: string;
  side: string;
  grams: number;
  price: number;
  amount: number;
  fee: number;
  pnl: number | null;
  status: string;
  created_at: string;
};

function toOrder(r: OrderRow): TradeOrder {
  return {
    id: r.id,
    userId: r.user_id,
    symbol: r.symbol,
    side: r.side === "SELL" ? "SELL" : "BUY",
    grams: r.grams,
    price: r.price,
    amount: r.amount,
    fee: r.fee,
    pnl: r.pnl,
    status: r.status,
    createdAt: r.created_at,
  };
}

const ORDER_COLUMNS =
  "id, user_id, symbol, side, grams, price, amount, fee, pnl, status, created_at";

export function listOrders(userId: string, limit = 100): TradeOrder[] {
  ensureSchema();
  const rows = getDb()
    .prepare(`SELECT ${ORDER_COLUMNS} FROM trade_orders WHERE user_id = ? ORDER BY rowid DESC LIMIT ?`)
    .all(userId, limit) as OrderRow[];
  return rows.map(toOrder);
}

export interface PlaceOrderInput {
  symbol: string;
  side: TradeSide;
  /** Weight in grams (fractional allowed, e.g. 0.5). */
  grams: number;
  /** Execution price in Toman per gram, supplied by the client's live board. */
  price: number;
}

/**
 * Execute a market order. The caller (API route) is responsible for supplying a
 * server-trusted price — this function never fetches one itself.
 */
export function placeOrder(userId: string, input: PlaceOrderInput): TradeOrder {
  ensureSchema();
  const symbol = (input.symbol ?? "").trim();
  const side: TradeSide = input.side === "SELL" ? "SELL" : "BUY";
  const grams = Number(input.grams);
  const price = money(Number(input.price));

  if (!symbol) throw new TradeError("نماد معاملاتی نامعتبر است");
  if (!Number.isFinite(grams) || grams <= 0) throw new TradeError("وزن نامعتبر است");
  if (grams < 0.001) throw new TradeError("حداقل وزن معامله ۰٫۰۰۱ گرم است");
  if (grams > 100_000) throw new TradeError("حداکثر وزن هر سفارش ۱۰۰٬۰۰۰ گرم است");
  if (!Number.isFinite(price) || price <= 0) throw new TradeError("قیمت نامعتبر است");

  const amount = money(grams * price);
  const fee = feeFor(amount);
  const position = getPosition(userId, symbol);
  const wallet = getWallet(userId);

  if (side === "BUY") {
    const need = amount + fee;
    if (wallet.balance < need) {
      throw new TradeError(
        `موجودی کیف پول کافی نیست (نیاز: ${need.toLocaleString("fa-IR")} تومان)`
      );
    }
    credit(userId, -need);

    // Weighted-average entry price across every buy of this symbol.
    const held = position?.grams ?? 0;
    const totalGrams = held + grams;
    const avgCost =
      totalGrams > 0 ? ((position?.avgCost ?? 0) * held + price * grams) / totalGrams : price;
    upsertPosition(userId, symbol, totalGrams, avgCost);
    recordTx(userId, "BUY", -amount, symbol, grams, `خرید ${symbol}`);
    recordTx(userId, "FEE", -fee, symbol, grams, "کارمزد خرید");
    return insertOrder(userId, { symbol, side, grams, price, amount, fee, pnl: null });
  }

  // SELL — needs an open position big enough to cover the order.
  if (!position || position.grams + 1e-9 < grams) {
    throw new TradeError("از این نماد به اندازه سفارش در حساب شما موجودی نیست");
  }
  const realized = money((price - position.avgCost) * grams) - fee;
  credit(userId, amount - fee);
  upsertPosition(userId, symbol, position.grams - grams, position.avgCost);
  recordTx(userId, "SELL", amount - fee, symbol, grams, `فروش ${symbol}`);
  return insertOrder(userId, { symbol, side, grams, price, amount, fee, pnl: realized });
}

function insertOrder(
  userId: string,
  o: {
    symbol: string;
    side: TradeSide;
    grams: number;
    price: number;
    amount: number;
    fee: number;
    pnl: number | null;
  }
): TradeOrder {
  const id = generateId();
  getDb()
    .prepare(
      "INSERT INTO trade_orders (id, user_id, symbol, side, grams, price, amount, fee, pnl) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, userId, o.symbol, o.side, o.grams, o.price, o.amount, o.fee, o.pnl);

  const row = getDb()
    .prepare(`SELECT ${ORDER_COLUMNS} FROM trade_orders WHERE id = ?`)
    .get(id) as OrderRow;
  return toOrder(row);
}

// ── Account summary ─────────────────────────────────────────────────────────

export interface PositionView extends TradePosition {
  marketValue: number;
  pnl: number;
  pnlPercent: number;
}

export interface AccountSummary {
  wallet: TradeWallet;
  positions: PositionView[];
  /** Cash + market value of every open position. */
  equity: number;
  totalPnl: number;
  feePercent: number;
}

/**
 * `prices` maps a trade symbol to its Toman-per-gram price. The route layer
 * decides which live source produced it; the engine only does the arithmetic.
 */
export function getAccount(userId: string, prices: Record<string, number>): AccountSummary {
  const wallet = getWallet(userId);
  const positions: PositionView[] = listPositions(userId).map(p => {
    const market = prices[p.symbol] ?? p.avgCost;
    const marketValue = money(p.grams * market);
    const cost = money(p.grams * p.avgCost);
    const pnl = marketValue - cost;
    return {
      ...p,
      marketValue,
      pnl,
      pnlPercent: cost > 0 ? (pnl / cost) * 100 : 0,
    };
  });
  const equity = money(wallet.balance + positions.reduce((s, p) => s + p.marketValue, 0));
  return {
    wallet,
    positions,
    equity,
    totalPnl: positions.reduce((s, p) => s + p.pnl, 0),
    feePercent: TRADE_FEE_PERCENT,
  };
}

// ── Price history (chart series) ────────────────────────────────────────────

/**
 * Store one sample. The poller and the PWA both call this, so the series keeps
 * growing even while nobody has the app open. Samples closer than `minGapMs` to
 * the previous one are dropped, so a chatty client cannot flood the table.
 */
export function recordTick(
  symbol: string,
  price: number,
  source = "",
  minGapMs = 30_000
): void {
  const value = money(Number(price));
  if (!symbol || !Number.isFinite(value) || value <= 0) return;
  ensureSchema();
  const db = getDb();
  const now = Date.now();
  const last = db
    .prepare("SELECT at FROM trade_price_history WHERE symbol = ? ORDER BY at DESC LIMIT 1")
    .get(symbol) as { at: number } | undefined;
  if (last && now - last.at < minGapMs) return;

  db.prepare("INSERT INTO trade_price_history (symbol, price, source, at) VALUES (?, ?, ?, ?)")
    .run(symbol, value, source, now);
  // Keep the table bounded — six months of ticks is far more than a chart needs.
  db.prepare("DELETE FROM trade_price_history WHERE at < ?")
    .run(now - 180 * 24 * 60 * 60 * 1000);
}

const RANGE_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

/** Bucket width per range — enough buckets to draw a chart, not so many it's noise. */
const BUCKET_MS: Record<string, number> = {
  "1h": 60 * 1000,            // 1 minute
  "24h": 15 * 60 * 1000,      // 15 minutes
  "7d": 2 * 60 * 60 * 1000,   // 2 hours
  "30d": 24 * 60 * 60 * 1000, // 1 day
};

export const TRADE_RANGES = ["1h", "24h", "7d", "30d"] as const;

export function normalizeRange(range: string | null): string {
  return range && (TRADE_RANGES as readonly string[]).includes(range) ? range : "24h";
}

export interface Candle {
  /** Bucket start, unix ms. */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

/** OHLC buckets for the candlestick chart. */
export function getCandles(symbol: string, range = "24h"): Candle[] {
  const bucket = BUCKET_MS[range] ?? BUCKET_MS["24h"];
  ensureSchema();
  const rows = getDb()
    .prepare(
      "SELECT price, at FROM trade_price_history WHERE symbol = ? AND at >= ? ORDER BY at ASC"
    )
    .all(symbol, Date.now() - (RANGE_MS[range] ?? RANGE_MS["24h"])) as
    { price: number; at: number }[];

  const byBucket = new Map<number, Candle>();
  for (const row of rows) {
    const t = Math.floor(row.at / bucket) * bucket;
    const candle = byBucket.get(t);
    if (!candle) {
      byBucket.set(t, { t, o: row.price, h: row.price, l: row.price, c: row.price });
    } else {
      candle.h = Math.max(candle.h, row.price);
      candle.l = Math.min(candle.l, row.price);
      candle.c = row.price;
    }
  }
  return [...byBucket.values()].sort((a, b) => a.t - b.t);
}

/** Raw ticks — used for the line chart and the last-price marker. */
export function getTicks(symbol: string, range = "24h"): { at: number; price: number }[] {
  ensureSchema();
  return getDb()
    .prepare(
      "SELECT at, price FROM trade_price_history WHERE symbol = ? AND at >= ? ORDER BY at ASC"
    )
    .all(symbol, Date.now() - (RANGE_MS[range] ?? RANGE_MS["24h"])) as
    { at: number; price: number }[];
}

export interface SymbolStats {
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  changePercent: number;
  samples: number;
  /** Downsampled recent prices (oldest → newest) for a sparkline. */
  spark: number[];
}

/**
 * True 24-hour window stats for one symbol (Binance-style header numbers).
 * `open` is the first recorded sample inside the window; `close` the current
 * price. Returns null when the window has no samples — the UI then falls back
 * to the visible chart range and says so.
 */
export function get24hStats(symbol: string, currentPrice?: number): SymbolStats | null {
  ensureSchema();
  const rows = getDb()
    .prepare(
      "SELECT price FROM trade_price_history WHERE symbol = ? AND at >= ? ORDER BY at ASC"
    )
    .all(symbol, Date.now() - RANGE_MS["24h"]) as { price: number }[];

  if (!rows.length) return null;

  const open = rows[0].price;
  let high = rows[0].price;
  let low = rows[0].price;
  for (const r of rows) {
    if (r.price > high) high = r.price;
    if (r.price < low) low = r.price;
  }
  const close = typeof currentPrice === "number" && currentPrice > 0 ? currentPrice : rows[rows.length - 1].price;
  const change = close - open;

  return {
    open,
    high,
    low,
    close,
    change,
    changePercent: open > 0 ? (change / open) * 100 : 0,
    samples: rows.length,
    spark: downsample(rows.map(r => r.price), 24),
  };
}

/**
 * Reduce a series to `points` evenly-spaced samples (oldest → newest) so a
 * sparkline stays cheap to render. Never returns an empty array when given
 * input, and always keeps the true last value so the tip matches the price.
 */
function downsample(values: number[], points: number): number[] {
  if (values.length === 0) return [];
  if (values.length <= points) return values.slice();
  const out: number[] = [];
  const step = (values.length - 1) / (points - 1);
  for (let i = 0; i < points; i++) {
    out.push(values[Math.round(i * step)]);
  }
  return out;
}

/** 24h stats for every symbol in one call — feeds the market dropdown. */
export function getAll24hStats(prices: Record<string, number>): Record<string, SymbolStats> {
  const out: Record<string, SymbolStats> = {};
  for (const symbol of Object.keys(prices)) {
    const stats = get24hStats(symbol, prices[symbol]);
    if (stats) out[symbol] = stats;
  }
  return out;
}

