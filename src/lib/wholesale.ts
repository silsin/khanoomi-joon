/**
 * Wholesale ordering engine — for goldsmiths (طلا‌فروش) who order from خانوم جون
 * instead of trading spot or calling on the phone.
 *
 * Domain differences from `trading.ts`:
 *   • A goldsmith fills a **basket** of catalog items and places an **order**;
 *     prices are **locked at order time** (snapshot), not filled instantly.
 *   • Every order moves through a lifecycle: PENDING → CONFIRMED → PREPARING →
 *     DELIVERED (or CANCELLED), so the goldsmith can track it.
 *   • Money is tracked as a **credit/debt ledger** (نسیه) — wholesale is usually
 *     on account, so an order debits what they owe and a payment credits it.
 *
 * Money = **Toman** (integers). Weight = **grams** (REAL). Live prices come from
 * the site's gold board (اتحادیه / خانوم جون) via `trade-market.ts`.
 *
 * SERVER ONLY. Tables are created on first touch, like the rest of the app.
 */
import { getDb, generateId } from "./db";

let _ready = false;

/** Money in whole Toman. */
function money(value: number): number {
  return Math.round(value);
}

function ensureSchema(): void {
  if (_ready) return;
  _ready = true;
  getDb().exec(`
    -- What خانوم جون offers to goldsmiths.
    CREATE TABLE IF NOT EXISTS wholesale_items (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      category      TEXT NOT NULL DEFAULT 'gold',
      unit          TEXT NOT NULL DEFAULT 'g',
      price_mode    TEXT NOT NULL DEFAULT 'perGram',
      symbol        TEXT NOT NULL,
      grams_per_unit REAL NOT NULL DEFAULT 1,
      gap_percent   REAL NOT NULL DEFAULT 0,
      min_qty       REAL NOT NULL DEFAULT 0,
      max_qty       REAL NOT NULL DEFAULT 0,
      stock_note    TEXT DEFAULT '',
      is_active     INTEGER NOT NULL DEFAULT 1,
      sort_id       INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ws_items_sort ON wholesale_items(sort_id);

    CREATE TABLE IF NOT EXISTS wholesale_orders (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      code         INTEGER NOT NULL,
      status       TEXT NOT NULL DEFAULT 'PENDING',
      total_amount INTEGER NOT NULL DEFAULT 0,
      total_qty    REAL NOT NULL DEFAULT 0,
      note         TEXT DEFAULT '',
      placed_at    TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ws_orders_user ON wholesale_orders(user_id, code DESC);

    CREATE TABLE IF NOT EXISTS wholesale_order_items (
      id          TEXT PRIMARY KEY,
      order_id    TEXT NOT NULL,
      item_id     TEXT NOT NULL,
      name        TEXT NOT NULL,
      unit        TEXT NOT NULL,
      qty         REAL NOT NULL,
      unit_price  INTEGER NOT NULL,
      amount      INTEGER NOT NULL,
      gap_percent REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_ws_order_items_order ON wholesale_order_items(order_id);

    -- نسیه ledger: delta > 0 = they owe more (order), delta < 0 = paid (credit).
    CREATE TABLE IF NOT EXISTS wholesale_ledger (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      delta      INTEGER NOT NULL,
      kind       TEXT NOT NULL,
      ref_id     TEXT DEFAULT '',
      note       TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ws_ledger_user ON wholesale_ledger(user_id, created_at DESC);
  `);
}

// ── Catalog ─────────────────────────────────────────────────────────────────

export interface WholesaleItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  priceMode: "direct" | "perGram";
  symbol: string;
  gramsPerUnit: number;
  gapPercent: number;
  minQty: number;
  maxQty: number;
  stockNote: string;
  isActive: boolean;
  sortId: number;
}

type ItemRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price_mode: string;
  symbol: string;
  grams_per_unit: number;
  gap_percent: number;
  min_qty: number;
  max_qty: number;
  stock_note: string;
  is_active: number;
  sort_id: number;
};

function toItem(r: ItemRow): WholesaleItem {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    unit: r.unit,
    priceMode: r.price_mode === "direct" ? "direct" : "perGram",
    symbol: r.symbol,
    gramsPerUnit: r.grams_per_unit,
    gapPercent: r.gap_percent,
    minQty: r.min_qty,
    maxQty: r.max_qty,
    stockNote: r.stock_note ?? "",
    isActive: Boolean(r.is_active),
    sortId: r.sort_id,
  };
}

const ITEM_COLS =
  "id, name, category, unit, price_mode, symbol, grams_per_unit, gap_percent, " +
  "min_qty, max_qty, stock_note, is_active, sort_id";

export function listCatalog(activeOnly = true): WholesaleItem[] {
  ensureSchema();
  const rows = getDb()
    .prepare(
      `SELECT ${ITEM_COLS} FROM wholesale_items ${activeOnly ? "WHERE is_active = 1" : ""} ORDER BY sort_id, name`
    )
    .all() as ItemRow[];
  return rows.map(toItem);
}

export function getItem(id: string): WholesaleItem | null {
  ensureSchema();
  const row = getDb()
    .prepare(`SELECT ${ITEM_COLS} FROM wholesale_items WHERE id = ?`)
    .get(id) as ItemRow | undefined;
  return row ? toItem(row) : null;
}

/** Clamp everything to sane ranges so a bad payload cannot poison the catalog. */
function clampItem(input: Partial<WholesaleItem>): WholesaleItem {
  const gap = Number(input.gapPercent);
  const grams = Number(input.gramsPerUnit);
  const min = Number(input.minQty);
  const max = Number(input.maxQty);
  return {
    id: String(input.id ?? "").trim().slice(0, 60),
    name: String(input.name ?? "").trim().slice(0, 120),
    category: String(input.category ?? "").trim().slice(0, 60),
    unit: String(input.unit ?? "گرم").trim().slice(0, 30),
    priceMode: input.priceMode === "direct" ? "direct" : "perGram",
    symbol: String(input.symbol ?? "GOLD18").trim().slice(0, 30),
    gramsPerUnit: Number.isFinite(grams) && grams > 0 ? Math.min(grams, 100_000) : 1,
    gapPercent: Number.isFinite(gap) ? Math.max(-50, Math.min(gap, 300)) : 0,
    minQty: Number.isFinite(min) && min > 0 ? min : 0,
    maxQty: Number.isFinite(max) && max > 0 ? max : 0,
    stockNote: String(input.stockNote ?? "").trim().slice(0, 200),
    isActive: input.isActive !== false,
    sortId: Number.isFinite(Number(input.sortId)) ? Number(input.sortId) : 0,
  };
}

/** Create or update a catalog item. Returns the stored row. */
export function saveItem(input: Partial<WholesaleItem>): WholesaleItem {
  ensureSchema();
  const item = clampItem(input);
  if (!item.name) throw new WholesaleError("نام کالا الزامی است");
  if (!item.id) throw new WholesaleError("شناسه کالا الزامی است");

  const db = getDb();
  db.prepare(
    `INSERT INTO wholesale_items
       (id, name, category, unit, price_mode, symbol, grams_per_unit, gap_percent,
        min_qty, max_qty, stock_note, is_active, sort_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, category = excluded.category, unit = excluded.unit,
        price_mode = excluded.price_mode, symbol = excluded.symbol,
        grams_per_unit = excluded.grams_per_unit, gap_percent = excluded.gap_percent,
        min_qty = excluded.min_qty, max_qty = excluded.max_qty,
        stock_note = excluded.stock_note, is_active = excluded.is_active,
        sort_id = excluded.sort_id, updated_at = datetime('now')`
  ).run(
    item.id, item.name, item.category, item.unit, item.priceMode, item.symbol,
    item.gramsPerUnit, item.gapPercent, item.minQty, item.maxQty,
    item.stockNote, item.isActive ? 1 : 0, item.sortId
  );

  return getItem(item.id) as WholesaleItem;
}

/** Soft-delete: hides the item but keeps it on historical orders. */
export function deleteItem(id: string): boolean {
  ensureSchema();
  const res = getDb()
    .prepare("UPDATE wholesale_items SET is_active = 0, updated_at = datetime('now') WHERE id = ?")
    .run(id) as { changes: number };
  return res.changes > 0;
}

/** Default catalog so a fresh install is not an empty screen. */
export const DEFAULT_CATALOG: Partial<WholesaleItem>[] = [
  { id: "GOLD18_WIRE_750",  name: "سیم طلا ۷۵۰ (هر متر)",   category: "طلای صنعتی", unit: "متر",   priceMode: "perGram", symbol: "GOLD18", gramsPerUnit: 4.3318, gapPercent: 2.5, minQty: 1,  sortId: 1 },
  { id: "GOLD18_WIRE_1000", name: "سیم طلا ۷۵۰ ضخیم (هر متر)", category: "طلای صنعتی", unit: "متر", priceMode: "perGram", symbol: "GOLD18", gramsPerUnit: 5.5,    gapPercent: 2.5, minQty: 1,  sortId: 2 },
  { id: "GOLD18_SHEET_1G",  name: "ورق طلا ۱۸ عیار (هر گرم)", category: "ورق و صفحه",  unit: "گرم", priceMode: "perGram", symbol: "GOLD18", gramsPerUnit: 1,      gapPercent: 3,   minQty: 5,  sortId: 3 },
  { id: "GOLD24_GRAIN_1G",  name: "دان طلای ۲۴ عیار (هر گرم)", category: "ماده اولیه",  unit: "گرم", priceMode: "perGram", symbol: "GOLD24", gramsPerUnit: 1,      gapPercent: 1.5, minQty: 10, sortId: 4 },
  { id: "COIN_NEW_EACH",    name: "سکه تمام طرح جدید",       category: "سکه",         unit: "عدد", priceMode: "direct", symbol: "COIN_NEW", gramsPerUnit: 1, gapPercent: 1, minQty: 1, maxQty: 500, sortId: 5 },
  { id: "COIN_HALF_EACH",   name: "نیم سکه",                 category: "سکه",         unit: "عدد", priceMode: "direct", symbol: "COIN_HALF", gramsPerUnit: 1, gapPercent: 1, minQty: 2, maxQty: 500, sortId: 6 },
  { id: "COIN_QUARTER_EACH",name: "ربع سکه",                 category: "سکه",         unit: "عدد", priceMode: "direct", symbol: "COIN_QUARTER", gramsPerUnit: 1, gapPercent: 1, minQty: 2, maxQty: 500, sortId: 7 },
  { id: "MAZANEH_EACH",     name: "مظنه طلای آبشده",          category: "مثقال",       unit: "مثقال", priceMode: "direct", symbol: "MAZANEH", gramsPerUnit: 1, gapPercent: 1.5, minQty: 1, sortId: 8 }
];

/** Insert `DEFAULT_CATALOG` items that are missing. Idempotent. */
export function seedCatalog(): number {
  ensureSchema();
  let added = 0;
  for (const item of DEFAULT_CATALOG) {
    if (!getItem(item.id as string)) {
      saveItem(item);
      added++;
    }
  }
  return added;
}

/**
 * Unit price in Toman for a catalog item, given the live base price of its
 * `symbol`. `direct` items (coins, bars sold per piece) apply the gap straight
 * to the symbol price; `perGram` items (wire/sheet) multiply by the item weight.
 */
export function priceItem(item: WholesaleItem, basePrice: number): number {
  const gap = 1 + (item.gapPercent || 0) / 100;
  const base = item.priceMode === "perGram" ? basePrice * (item.gramsPerUnit || 1) : basePrice;
  return money(base * gap);
}


export const WHOLESALE_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "DELIVERED",
  "CANCELLED",
] as const;
export type WholesaleStatus = (typeof WHOLESALE_STATUSES)[number];

export class WholesaleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WholesaleError";
  }
}

// ── Orders ──────────────────────────────────────────────────────────────────

export interface OrderLine {
  itemId: string;
  qty: number;
}

export interface PricedLine {
  itemId: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  amount: number;
  gapPercent: number;
}

export interface WholesaleOrder {
  id: string;
  userId: string;
  code: number;
  status: WholesaleStatus;
  totalAmount: number;
  totalQty: number;
  note: string;
  placedAt: string;
  updatedAt: string;
  lines: PricedLine[];
}

type OrderRow = {
  id: string;
  user_id: string;
  code: number;
  status: string;
  total_amount: number;
  total_qty: number;
  note: string;
  placed_at: string;
  updated_at: string;
};

type LineRow = {
  item_id: string;
  name: string;
  unit: string;
  qty: number;
  unit_price: number;
  amount: number;
  gap_percent: number;
};

const ORDER_COLS = "id, user_id, code, status, total_amount, total_qty, note, placed_at, updated_at";

function loadLines(orderId: string): PricedLine[] {
  const rows = getDb()
    .prepare(
      "SELECT item_id, name, unit, qty, unit_price, amount, gap_percent " +
        "FROM wholesale_order_items WHERE order_id = ?"
    )
    .all(orderId) as LineRow[];
  return rows.map(r => ({
    itemId: r.item_id,
    name: r.name,
    unit: r.unit,
    qty: r.qty,
    unitPrice: r.unit_price,
    amount: r.amount,
    gapPercent: r.gap_percent,
  }));
}

function toOrder(r: OrderRow): WholesaleOrder {
  return {
    id: r.id,
    userId: r.user_id,
    code: r.code,
    status: (WHOLESALE_STATUSES as readonly string[]).includes(r.status)
      ? (r.status as WholesaleStatus)
      : "PENDING",
    totalAmount: r.total_amount,
    totalQty: r.total_qty,
    note: r.note ?? "",
    placedAt: r.placed_at,
    updatedAt: r.updated_at,
    lines: loadLines(r.id),
  };
}

/** Next sequential human-friendly order code (e.g. #1042). */
function nextOrderCode(): number {
  const row = getDb().prepare("SELECT MAX(code) AS m FROM wholesale_orders").get() as
    | { m: number | null }
    | undefined;
  return (row?.m ?? 1000) + 1;
}

export function listOrders(userId: string, limit = 50): WholesaleOrder[] {
  ensureSchema();
  const rows = getDb()
    .prepare(`SELECT ${ORDER_COLS} FROM wholesale_orders WHERE user_id = ? ORDER BY code DESC LIMIT ?`)
    .all(userId, limit) as OrderRow[];
  return rows.map(toOrder);
}

export function getOrder(userId: string, orderId: string): WholesaleOrder | null {
  ensureSchema();
  const row = getDb()
    .prepare(`SELECT ${ORDER_COLS} FROM wholesale_orders WHERE id = ? AND user_id = ?`)
    .get(orderId, userId) as OrderRow | undefined;
  return row ? toOrder(row) : null;
}

export interface QuoteResult {
  lines: PricedLine[];
  totalAmount: number;
  totalQty: number;
}

/**
 * Price a basket against the live board **without** persisting anything — the
 * goldsmith sees the total before committing. `prices` maps symbol → Toman.
 */
export function quote(lines: OrderLine[], prices: Record<string, number>): QuoteResult {
  ensureSchema();
  const priced: PricedLine[] = [];
  let totalAmount = 0;
  let totalQty = 0;

  for (const line of lines) {
    const item = getItem(line.itemId);
    if (!item) throw new WholesaleError(`کالای «${line.itemId}» یافت نشد`);
    const qty = Number(line.qty);
    if (!Number.isFinite(qty) || qty <= 0) throw new WholesaleError(`مقدار «${item.name}» نامعتبر است`);
    if (item.minQty && qty < item.minQty)
      throw new WholesaleError(`حداقل سفارش «${item.name}» ${item.minQty} ${item.unit} است`);
    if (item.maxQty && qty > item.maxQty)
      throw new WholesaleError(`حداکثر سفارش «${item.name}» ${item.maxQty} ${item.unit} است`);

    const base = prices[item.symbol] ?? 0;
    const unitPrice = priceItem(item, base);
    const amount = money(unitPrice * qty);
    priced.push({
      itemId: item.id,
      name: item.name,
      unit: item.unit,
      qty,
      unitPrice,
      amount,
      gapPercent: item.gapPercent,
    });
    totalAmount += amount;
    totalQty += qty;
  }

  if (!priced.length) throw new WholesaleError("سبد خرید خالی است");
  return { lines: priced, totalAmount: money(totalAmount), totalQty };
}

/**
 * Place an order: re-price the basket at the live board, persist order + line
 * snapshots, and debit the نسیه ledger. Prices are frozen into the lines.
 */
export function placeOrder(
  userId: string,
  lines: OrderLine[],
  prices: Record<string, number>,
  note = ""
): WholesaleOrder {
  ensureSchema();
  const q = quote(lines, prices);
  const db = getDb();
  const id = generateId();
  const code = nextOrderCode();

  db.prepare(
    "INSERT INTO wholesale_orders (id, user_id, code, status, total_amount, total_qty, note) " +
      "VALUES (?, ?, ?, 'PENDING', ?, ?, ?)"
  ).run(id, userId, code, q.totalAmount, q.totalQty, note.slice(0, 500));

  const insLine = db.prepare(
    "INSERT INTO wholesale_order_items (id, order_id, item_id, name, unit, qty, unit_price, amount, gap_percent) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const line of q.lines) {
    insLine.run(generateId(), id, line.itemId, line.name, line.unit, line.qty, line.unitPrice, line.amount, line.gapPercent);
  }

  // نسیه: the order increases what the goldsmith owes.
  addLedgerEntry(userId, q.totalAmount, "ORDER", id, `سفارش #${code}`);

  const row = db.prepare(`SELECT ${ORDER_COLS} FROM wholesale_orders WHERE id = ?`).get(id) as OrderRow;
  return toOrder(row);
}


// ── نسیه ledger ──────────────────────────────────────────────────────────────

export interface LedgerEntry {
  id: string;
  userId: string;
  /** > 0 increases what they owe; < 0 is a payment that reduces it. */
  delta: number;
  kind: string;
  refId: string;
  note: string;
  createdAt: string;
}

type LedgerRow = {
  id: string;
  user_id: string;
  delta: number;
  kind: string;
  ref_id: string;
  note: string;
  created_at: string;
};

function toLedger(r: LedgerRow): LedgerEntry {
  return {
    id: r.id,
    userId: r.user_id,
    delta: r.delta,
    kind: r.kind,
    refId: r.ref_id ?? "",
    note: r.note ?? "",
    createdAt: r.created_at,
  };
}

function addLedgerEntry(
  userId: string,
  delta: number,
  kind: string,
  refId = "",
  note = ""
): void {
  ensureSchema();
  getDb()
    .prepare(
      "INSERT INTO wholesale_ledger (id, user_id, delta, kind, ref_id, note) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(generateId(), userId, money(delta), kind, refId, note.slice(0, 300));
}

/** Outstanding debt in Toman (positive = they owe خانوم جون). */
export function getDebt(userId: string): number {
  ensureSchema();
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(delta), 0) AS total FROM wholesale_ledger WHERE user_id = ?")
    .get(userId) as { total: number };
  return money(row?.total ?? 0);
}

export function listLedger(userId: string, limit = 100): LedgerEntry[] {
  ensureSchema();
  const rows = getDb()
    .prepare(
      "SELECT id, user_id, delta, kind, ref_id, note, created_at FROM wholesale_ledger " +
        "WHERE user_id = ? ORDER BY rowid DESC LIMIT ?"
    )
    .all(userId, limit) as LedgerRow[];
  return rows.map(toLedger);
}

/** Record a payment that reduces the goldsmith's debt. */
export function recordPayment(userId: string, amount: number, note = ""): LedgerEntry {
  const value = money(Number(amount));
  if (!Number.isFinite(value) || value <= 0) throw new WholesaleError("مبلغ پرداخت نامعتبر است");
  addLedgerEntry(userId, -value, "PAYMENT", "", note || "پرداخت");
  const row = getDb()
    .prepare(
      "SELECT id, user_id, delta, kind, ref_id, note, created_at FROM wholesale_ledger " +
        "WHERE user_id = ? ORDER BY rowid DESC LIMIT 1"
    )
    .get(userId) as LedgerRow;
  return toLedger(row);
}

// ── Admin: order lifecycle ───────────────────────────────────────────────────

/**
 * Move an order to a new status. Cancelling refunds the debt it created; other
 * transitions just update the timestamp. Admin-only (enforced in the route).
 */
export function setOrderStatus(orderId: string, status: string): WholesaleOrder | null {
  ensureSchema();
  if (!(WHOLESALE_STATUSES as readonly string[]).includes(status)) {
    throw new WholesaleError("وضعیت نامعتبر است");
  }
  const db = getDb();
  const existing = db
    .prepare("SELECT id, user_id, code, status, total_amount FROM wholesale_orders WHERE id = ?")
    .get(orderId) as
    | { id: string; user_id: string; code: number; status: string; total_amount: number }
    | undefined;
  if (!existing) return null;

  const wasCancelled = existing.status === "CANCELLED";
  const willCancel = status === "CANCELLED";

  // Only credit the debt once, when transitioning into CANCELLED.
  if (willCancel && !wasCancelled) {
    addLedgerEntry(existing.user_id, -existing.total_amount, "CANCEL", orderId, `لغو سفارش #${existing.code}`);
  } else if (!willCancel && wasCancelled) {
    // Un-cancelling re-charges the order.
    addLedgerEntry(existing.user_id, existing.total_amount, "ORDER", orderId, `بازگشت سفارش #${existing.code}`);
  }

  db.prepare("UPDATE wholesale_orders SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, orderId);

  const row = db.prepare(`SELECT ${ORDER_COLS} FROM wholesale_orders WHERE id = ?`).get(orderId) as OrderRow;
  return toOrder(row);
}

