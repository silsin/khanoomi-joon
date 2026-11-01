/**
 * Database layer using Node.js built-in SQLite (Node 22+)
 * Single file — no Prisma CLI required.
 * This module is SERVER ONLY — never imported by client components.
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";

let _db: DatabaseSync | null = null;
let _schemaReady = false;

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const filePart = url.replace(/^file:/, "");
  if (path.isAbsolute(filePart)) return filePart;
  // Statically scoped to /app/data or prisma/ subfolder — suppresses NFT over-trace
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    filePart
  );
}

/** Create tables used at runtime if migrations were not applied yet. */
function ensureSchema(db: DatabaseSync) {
  if (_schemaReady) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS otp_codes (
      id         TEXT PRIMARY KEY,
      phone      TEXT NOT NULL,
      code_hash  TEXT NOT NULL,
      attempts   INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
    CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);

    CREATE TABLE IF NOT EXISTS special_offers (
      id               TEXT PRIMARY KEY,
      product_id       TEXT NOT NULL,
      discount_percent REAL NOT NULL DEFAULT 0,
      sort_order       INTEGER NOT NULL DEFAULT 0,
      active           INTEGER NOT NULL DEFAULT 1,
      created_at       TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_special_offers_active ON special_offers(active, sort_order);
  `);
  ensureOrderShippingColumns(db);
  ensureSupportTables(db);
  ensureProductExpressColumn(db);
  ensureProductLowWageColumn(db);
  ensureProductCoinColumn(db);
  ensureProductNewArrivalColumn(db);
  ensureProductVariantsSpecsColumns(db);
  ensureProductFixedPriceColumn(db);
  ensureOrderItemExtrasColumns(db);
  ensureProductReviewsTable(db);
  ensureCategoryParentColumn(db);
  ensurePromoBannersTable(db);
  _schemaReady = true;
}

/** «بنرهای تبلیغاتی» — added by migration 027; ensure it at runtime too. */
function ensurePromoBannersTable(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS promo_banners (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      sub        TEXT NOT NULL DEFAULT '',
      href       TEXT NOT NULL DEFAULT '/products',
      image      TEXT NOT NULL DEFAULT '',
      theme      TEXT NOT NULL DEFAULT 'dark' CHECK(theme IN ('dark','light')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_promo_banners_active ON promo_banners(active, sort_order);
  `);
}

/** «ارسال فوری» flag — added by migration 026; ensure it at runtime too. */
function ensureProductExpressColumn(db: DatabaseSync) {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get();
  if (!table) return;
  const cols = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
  if (!cols.some(c => c.name === "express_shipping")) {
    db.exec("ALTER TABLE products ADD COLUMN express_shipping INTEGER NOT NULL DEFAULT 0");
    db.exec("CREATE INDEX IF NOT EXISTS idx_products_express ON products(express_shipping)");
  }
}

/** «کم اُجرت» flag — added by migration 028; ensure it at runtime too. */
function ensureProductLowWageColumn(db: DatabaseSync) {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get();
  if (!table) return;
  const cols = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
  if (!cols.some(c => c.name === "low_wage")) {
    db.exec("ALTER TABLE products ADD COLUMN low_wage INTEGER NOT NULL DEFAULT 0");
    db.exec("CREATE INDEX IF NOT EXISTS idx_products_low_wage ON products(low_wage)");
  }
}

/** «سکه و آبشده» flag — added by migration 029; ensure it at runtime too. */
function ensureProductCoinColumn(db: DatabaseSync) {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get();
  if (!table) return;
  const cols = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
  if (!cols.some(c => c.name === "coin")) {
    db.exec("ALTER TABLE products ADD COLUMN coin INTEGER NOT NULL DEFAULT 0");
    db.exec("CREATE INDEX IF NOT EXISTS idx_products_coin ON products(coin)");
  }
}

/** «جدیدترین محصولات» flag — checkbox managed from the product form; the
 *  homepage section shows flagged products (newest first). */
function ensureProductNewArrivalColumn(db: DatabaseSync) {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get();
  if (!table) return;
  const cols = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
  if (!cols.some(c => c.name === "new_arrival")) {
    db.exec("ALTER TABLE products ADD COLUMN new_arrival INTEGER NOT NULL DEFAULT 0");
    db.exec("CREATE INDEX IF NOT EXISTS idx_products_new_arrival ON products(new_arrival)");
  }
}

/** «قیمت ثابت» lock — product keeps its stored base even when live pricing is on. */
function ensureProductFixedPriceColumn(db: DatabaseSync) {
  ensureColumns(db, "products", { fixed_price: "INTEGER NOT NULL DEFAULT 0" });
}

/** Add any missing columns to a table — shared by the runtime schema guards. */
function ensureColumns(db: DatabaseSync, table: string, columns: Record<string, string>) {
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(table);
  if (!exists) return;
  const have = new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name)
  );
  for (const [name, ddl] of Object.entries(columns)) {
    if (!have.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
  }
}

/** Product variants + specs — added by migration 030; ensure them at runtime too. */
function ensureProductVariantsSpecsColumns(db: DatabaseSync) {
  ensureColumns(db, "products", {
    variants: "TEXT NOT NULL DEFAULT '[]'",
    specs: "TEXT NOT NULL DEFAULT '[]'",
  });
}

/** Order-line extras — added by migration 031; ensure them at runtime too. */
function ensureOrderItemExtrasColumns(db: DatabaseSync) {
  ensureColumns(db, "order_items", {
    variant_weight: "REAL",
    gift_pack: "TEXT",
    postcard: "TEXT",
  });
}

/** «دیدگاه‌ها» table — added by migration 032; ensure it at runtime too. */
function ensureProductReviewsTable(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id         TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      user_id    TEXT,
      name       TEXT NOT NULL,
      rating     INTEGER NOT NULL DEFAULT 5,
      body       TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id, status);
    CREATE INDEX IF NOT EXISTS idx_product_reviews_status  ON product_reviews(status, created_at);
  `);
}

/** «دسته‌بندی / زیردسته‌بندی» — added for the category tree; ensure it at runtime too. */
function ensureCategoryParentColumn(db: DatabaseSync) {
  ensureColumns(db, "categories", { parent_id: "TEXT" });
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'").get();
  if (exists) db.exec("CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)");
}

function ensureOrderShippingColumns(db: DatabaseSync) {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'").get();
  if (!table) return;
  const existing = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
  const names = new Set(existing.map(c => c.name));
  const cols: [string, string][] = [
    ["recipient_first_name", "TEXT"],
    ["recipient_last_name", "TEXT"],
    ["recipient_phone", "TEXT"],
    ["recipient_email", "TEXT"],
    ["province", "TEXT"],
    ["county", "TEXT"],
    ["postal_code", "TEXT"],
    ["delivery_phone", "TEXT"],
  ];
  for (const [col, type] of cols) {
    if (!names.has(col)) db.exec(`ALTER TABLE orders ADD COLUMN ${col} ${type}`);
  }
}

function ensureSupportTables(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id         TEXT PRIMARY KEY,
      status     TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','CLOSED')),
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      phone      TEXT,
      subject    TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at);

    CREATE TABLE IF NOT EXISTS support_messages (
      id         TEXT PRIMARY KEY,
      ticket_id  TEXT NOT NULL,
      sender     TEXT NOT NULL CHECK(sender IN ('CUSTOMER','ADMIN')),
      body       TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);
  `);
}

export function getDb(): DatabaseSync {
  if (!_db) {
    const dbPath = resolveDbPath();
    mkdirSync(path.dirname(dbPath), { recursive: true });
    _db = new DatabaseSync(dbPath);
    _db.exec("PRAGMA journal_mode=WAL");
    _db.exec("PRAGMA foreign_keys=ON");
    ensureSchema(_db);
  }
  return _db;
}

export function generateId(): string {
  return randomBytes(12).toString("hex");
}

// ── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string | null;
  phone_login: string | null;
  address: string | null;
  role: "ADMIN" | "CUSTOMER";
  created_at: string;
  updated_at: string;
}

export const users = {
  findByEmail(email: string): User | undefined {
    return getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;
  },
  findByPhone(phone: string): User | undefined {
    return getDb().prepare("SELECT * FROM users WHERE phone_login = ?").get(phone) as User | undefined;
  },
  findById(id: string): Omit<User, "password"> | undefined {
    return getDb()
      .prepare("SELECT id, email, name, phone, phone_login, address, role, created_at, updated_at FROM users WHERE id = ?")
      .get(id) as Omit<User, "password"> | undefined;
  },
  update(id: string, data: { name?: string; phone?: string; address?: string; email?: string }) {
    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => `${k} = ?`).join(", ");
    const values = Object.values(data).filter(v => v !== undefined);
    if (!fields) return;
    getDb().prepare(`UPDATE users SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
  },
  create(data: { name: string; email: string; password: string; role?: string; phone_login?: string }): User {
    const id = generateId();
    getDb()
      .prepare("INSERT INTO users (id, email, password, name, role, phone_login) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, data.email, data.password, data.name, data.role ?? "CUSTOMER", data.phone_login ?? null);
    return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as User;
  },
  list(opts: { search?: string; limit?: number; offset?: number } = {}) {
    const { search, limit = 20, offset = 0 } = opts;
    const db = getDb();
    if (search) {
      const s = `%${search}%`;
      return {
        rows: db.prepare(`SELECT id, email, name, phone, phone_login, role, created_at,
          (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS order_count
          FROM users WHERE name LIKE ? OR email LIKE ? OR phone_login LIKE ?
          ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(s, s, s, limit, offset) as (Omit<User, "password"> & { order_count: number })[],
        total: (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE name LIKE ? OR email LIKE ? OR phone_login LIKE ?").get(s, s, s) as { cnt: number }).cnt,
      };
    }
    return {
      rows: db.prepare(`SELECT id, email, name, phone, phone_login, role, created_at,
        (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS order_count
        FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(limit, offset) as (Omit<User, "password"> & { order_count: number })[],
      total: (db.prepare("SELECT COUNT(*) as cnt FROM users").get() as { cnt: number }).cnt,
    };
  },
};

// ── OTP codes ────────────────────────────────────────────────────────────────

export interface OtpCode {
  id: string;
  phone: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  created_at: string;
}

export const otpCodes = {
  invalidateForPhone(phone: string) {
    getDb().prepare("DELETE FROM otp_codes WHERE phone = ?").run(phone);
  },
  create(data: { phone: string; code_hash: string; expires_at: string }): OtpCode {
    const id = generateId();
    const created_at = new Date().toISOString();
    getDb()
      .prepare("INSERT INTO otp_codes (id, phone, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(id, data.phone, data.code_hash, data.expires_at, created_at);
    return getDb().prepare("SELECT * FROM otp_codes WHERE id = ?").get(id) as OtpCode;
  },
  findLatestValid(phone: string): OtpCode | undefined {
    const row = getDb()
      .prepare("SELECT * FROM otp_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1")
      .get(phone) as OtpCode | undefined;
    if (!row || new Date(row.expires_at).getTime() <= Date.now()) return undefined;
    return row;
  },
  incrementAttempts(id: string) {
    getDb().prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?").run(id);
  },
  delete(id: string) {
    getDb().prepare("DELETE FROM otp_codes WHERE id = ?").run(id);
  },
  countRecentSends(phone: string): number {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    return (
      getDb()
        .prepare("SELECT COUNT(*) as cnt FROM otp_codes WHERE phone = ? AND created_at >= ?")
        .get(phone, hourAgo) as { cnt: number }
    ).cnt;
  },
  lastSentAt(phone: string): string | null {
    const row = getDb()
      .prepare("SELECT created_at FROM otp_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1")
      .get(phone) as { created_at: string } | undefined;
    return row?.created_at ?? null;
  },
  purgeExpired() {
    const now = new Date().toISOString();
    getDb().prepare("DELETE FROM otp_codes WHERE expires_at <= ?").run(now);
  },
};

// ── Categories ───────────────────────────────────────────────────────────────

export interface Category {
  id: string; name: string; slug: string; description: string | null; image: string | null; created_at: string;
  /** Parent category id (null = top-level). Drives the tree in filters/menus. */
  parent_id?: string | null;
}

export interface CategoryNode extends Category {
  product_count: number;
  parent_name: string | null;
  child_count: number;
}

export const categories = {
  /** Roots first, then each parent's children grouped underneath it. */
  list() {
    return getDb().prepare(
      `SELECT c.*,
              p.name as parent_name,
              (SELECT COUNT(*) FROM products WHERE category_id = c.id) as product_count,
              (SELECT COUNT(*) FROM categories ch WHERE ch.parent_id = c.id) as child_count
         FROM categories c
         LEFT JOIN categories p ON p.id = c.parent_id
        ORDER BY CASE WHEN p.id IS NULL THEN 0 ELSE 1 END,
                 COALESCE(p.name, c.name) ASC,
                 c.name ASC`
    ).all() as CategoryNode[];
  },
  findById(id: string) {
    return getDb().prepare("SELECT * FROM categories WHERE id = ?").get(id) as Category | undefined;
  },
  findBySlug(slug: string) {
    return getDb().prepare("SELECT * FROM categories WHERE slug = ?").get(slug) as Category | undefined;
  },
  create(data: { name: string; slug: string; description?: string; image?: string; parent_id?: string | null }) {
    const id = generateId();
    getDb().prepare("INSERT INTO categories (id, name, slug, description, image, parent_id) VALUES (?, ?, ?, ?, ?, ?)").run(
      id, data.name, data.slug, data.description ?? null, data.image ?? null, data.parent_id ?? null
    );
    return getDb().prepare("SELECT * FROM categories WHERE id = ?").get(id) as Category;
  },
  update(id: string, data: Partial<{ name: string; slug: string; description: string; image: string; parent_id: string | null }>) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    getDb().prepare(`UPDATE categories SET ${fields} WHERE id = ?`).run(...Object.values(data), id);
    return getDb().prepare("SELECT * FROM categories WHERE id = ?").get(id) as Category;
  },
  /** The category plus every category nested under it (cycle-safe). */
  descendantIds(id: string): string[] {
    const db = getDb();
    const out = new Set<string>([id]);
    const queue = [id];
    while (queue.length) {
      const current = queue.shift()!;
      const kids = db.prepare("SELECT id FROM categories WHERE parent_id = ?").all(current) as { id: string }[];
      for (const k of kids) {
        if (out.has(k.id)) continue;
        out.add(k.id);
        queue.push(k.id);
      }
    }
    return [...out];
  },
  countProducts(id: string) {
    return (getDb().prepare("SELECT COUNT(*) as cnt FROM products WHERE category_id = ?").get(id) as { cnt: number }).cnt;
  },
  delete(id: string) {
    const db = getDb();
    // Never orphan children — lift them to the deleted node's own level.
    const cat = db.prepare("SELECT parent_id FROM categories WHERE id = ?").get(id) as { parent_id?: string | null } | undefined;
    db.prepare("UPDATE categories SET parent_id = ? WHERE parent_id = ?").run(cat?.parent_id ?? null, id);
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  },
};

// ── Products ─────────────────────────────────────────────────────────────────

export interface Product {
  id: string; name: string; slug: string; description: string | null;
  price: number; weight: number; karat: number; stock: number;
  images: string; videos: string; featured: number; published: number;
  express_shipping: number;
  low_wage: number;
  coin: number;
  /** 1 = نمایش در بخش «جدیدترین محصولات» صفحه اصلی (checkbox محصول فرم). */
  new_arrival: number;
  /** JSON array of weight/price/stock choices; "[]" = single-weight product. */
  variants: string;
  /** JSON array of {label, value} rows for the «خصوصیات محصولات طلا» table. */
  specs: string;
  ajrat_percent: number | null;
  ajrat_fixed: number | null;
  ajrat_override: number;
  /** 1 = «قیمت ثابت» — keeps the stored base even when live pricing is on. */
  fixed_price: number;
  category_id: string; created_at: string; updated_at: string;
}

export const products = {
  list(opts: { categoryId?: string; featured?: boolean; express?: boolean; lowWage?: boolean; coin?: boolean; newArrival?: boolean; discount?: boolean; search?: string; limit?: number; offset?: number; adminMode?: boolean } = {}) {
    const { categoryId, featured, express, lowWage, coin, newArrival, discount, search, limit = 12, offset = 0, adminMode = false } = opts;
    const db = getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (!adminMode) { conditions.push("p.published = 1"); }
    if (categoryId) {
      // `?category=` is used with two different values across the app: the raw
      // id (collections page, category icons, admin) and the slug (top menu,
      // product page). Resolve either one to the real id so both forms work.
      const resolved = db
        .prepare("SELECT id FROM categories WHERE id = ? OR slug = ?")
        .get(categoryId, categoryId) as { id: string } | undefined;
      const rootId = resolved ? resolved.id : categoryId;
      // Picking a parent shows its own products plus every sub-category's.
      const ids = categories.descendantIds(rootId);
      if (ids.length > 1) {
        conditions.push(`p.category_id IN (${ids.map(() => "?").join(", ")})`);
        params.push(...ids);
      } else {
        conditions.push("p.category_id = ?");
        params.push(rootId);
      }
    }
    if (featured !== undefined) { conditions.push("p.featured = ?"); params.push(featured ? 1 : 0); }
    if (express !== undefined) { conditions.push("p.express_shipping = ?"); params.push(express ? 1 : 0); }
    if (lowWage !== undefined) { conditions.push("p.low_wage = ?"); params.push(lowWage ? 1 : 0); }
    if (coin !== undefined) { conditions.push("p.coin = ?"); params.push(coin ? 1 : 0); }
    if (newArrival !== undefined) { conditions.push("p.new_arrival = ?"); params.push(newArrival ? 1 : 0); }
    if (discount !== undefined) {
      // Same rule the listing uses to draw the red % badge (see products page).
      conditions.push("(p.ajrat_override = 1 AND p.ajrat_percent IS NOT NULL AND p.ajrat_percent < 5)");
    }
    if (search) { conditions.push("(p.name LIKE ? OR p.description LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db.prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as (Product & { category_name: string; category_slug: string })[];
    const total = (db.prepare(`SELECT COUNT(*) as cnt FROM products p ${where}`).get(...params) as { cnt: number }).cnt;
    return { rows, total };
  },
  findById(id: string) {
    return getDb().prepare(
      "SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ? OR p.slug = ?"
    ).get(id, id) as (Product & { category_name: string; category_slug: string }) | undefined;
  },
  create(data: Omit<Product, "created_at" | "updated_at">) {
    const id = generateId();
    getDb().prepare(
      "INSERT INTO products (id, name, slug, description, price, weight, karat, stock, images, videos, featured, published, express_shipping, low_wage, coin, new_arrival, variants, specs, category_id, ajrat_percent, ajrat_fixed, ajrat_override, fixed_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, data.name, data.slug, data.description ?? null, data.price, data.weight, data.karat, data.stock, data.images, data.videos ?? "[]", data.featured, data.published, data.express_shipping ?? 0, data.low_wage ?? 0, data.coin ?? 0, data.new_arrival ?? 0, data.variants ?? "[]", data.specs ?? "[]", data.category_id, data.ajrat_percent ?? null, data.ajrat_fixed ?? null, data.ajrat_override ?? 0, data.fixed_price ?? 0);
    return products.findById(id)!;
  },
  update(id: string, data: Partial<Omit<Product, "id" | "created_at" | "updated_at">>) {
    const fields = Object.keys(data).map(k => `${k === "category_id" ? "category_id" : k} = ?`).join(", ");
    getDb().prepare(`UPDATE products SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(...Object.values(data), id);
    return products.findById(id)!;
  },
  delete(id: string) {
    getDb().prepare("DELETE FROM products WHERE id = ?").run(id);
  },
  countBySlug(slug: string, excludeId?: string) {
    if (excludeId) {
      return (getDb().prepare("SELECT COUNT(*) as cnt FROM products WHERE slug = ? AND id != ?").get(slug, excludeId) as { cnt: number }).cnt;
    }
    return (getDb().prepare("SELECT COUNT(*) as cnt FROM products WHERE slug = ?").get(slug) as { cnt: number }).cnt;
  },
};

// ── Product reviews («دیدگاه‌ها») ─────────────────────────────────────────────

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string | null;
  name: string;
  rating: number;
  body: string;
  /** PENDING until an admin approves it in /admin/reviews. */
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
}

export const productReviews = {
  /** Approved reviews of one product, newest first. */
  listApproved(productId: string, limit = 50) {
    return getDb().prepare(
      "SELECT * FROM product_reviews WHERE product_id = ? AND status = 'APPROVED' ORDER BY created_at DESC LIMIT ?"
    ).all(productId, limit) as ProductReview[];
  },
  /** { count, average } over the approved reviews — zeros when there is none. */
  summary(productId: string) {
    const row = getDb().prepare(
      "SELECT COUNT(*) as count, AVG(rating) as average FROM product_reviews WHERE product_id = ? AND status = 'APPROVED'"
    ).get(productId) as { count: number; average: number | null };
    return {
      count: row.count,
      average: row.average ? Math.round(row.average * 10) / 10 : 0,
    };
  },
  /** Admin moderation list, optionally filtered by status. */
  listForAdmin(opts: { status?: string; limit?: number; offset?: number } = {}) {
    const { status, limit = 20, offset = 0 } = opts;
    const db = getDb();
    const where = status ? "WHERE r.status = ?" : "";
    const params: unknown[] = status ? [status] : [];
    const rows = db.prepare(
      `SELECT r.*, p.name as product_name, p.slug as product_slug
       FROM product_reviews r LEFT JOIN products p ON p.id = r.product_id
       ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as (ProductReview & { product_name: string | null; product_slug: string | null })[];
    const total = (db.prepare(`SELECT COUNT(*) as cnt FROM product_reviews r ${where}`).get(...params) as { cnt: number }).cnt;
    return { rows, total };
  },
  countByStatus(status: string) {
    return (getDb().prepare("SELECT COUNT(*) as cnt FROM product_reviews WHERE status = ?").get(status) as { cnt: number }).cnt;
  },
  /** The user's latest non-rejected review of a product (one review per user). */
  findMine(productId: string, userId: string) {
    return getDb().prepare(
      "SELECT * FROM product_reviews WHERE product_id = ? AND user_id = ? AND status != 'REJECTED' ORDER BY created_at DESC LIMIT 1"
    ).get(productId, userId) as ProductReview | undefined;
  },
  create(data: { productId: string; userId: string | null; name: string; rating: number; body: string }) {
    const id = generateId();
    getDb().prepare(
      "INSERT INTO product_reviews (id, product_id, user_id, name, rating, body, status) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')"
    ).run(id, data.productId, data.userId, data.name, data.rating, data.body);
    return getDb().prepare("SELECT * FROM product_reviews WHERE id = ?").get(id) as ProductReview;
  },
  setStatus(id: string, status: string) {
    getDb().prepare("UPDATE product_reviews SET status = ? WHERE id = ?").run(status, id);
    return getDb().prepare("SELECT * FROM product_reviews WHERE id = ?").get(id) as ProductReview | undefined;
  },
  delete(id: string) {
    getDb().prepare("DELETE FROM product_reviews WHERE id = ?").run(id);
  },
};

// ── Orders ───────────────────────────────────────────────────────────────────

export interface Order {
  id: string; status: string; total: number; address: string | null;
  note: string | null; user_id: string; created_at: string; updated_at: string;
  recipient_first_name?: string | null;
  recipient_last_name?: string | null;
  recipient_phone?: string | null;
  recipient_email?: string | null;
  province?: string | null;
  county?: string | null;
  postal_code?: string | null;
  delivery_phone?: string | null;
}

export interface OrderItem {
  id: string; quantity: number; price: number; order_id: string;
  /** Null once the referenced product has been deleted (ON DELETE SET NULL). */
  product_id: string | null;
  /** Weight chosen on the product page when the product has weight variants. */
  variant_weight?: number | null;
  /** Free gift options picked on the product page. */
  gift_pack?: string | null;
  postcard?: string | null;
}

export const orders = {
  list(opts: { userId?: string; limit?: number; offset?: number } = {}) {
    const { userId, limit = 20, offset = 0 } = opts;
    const db = getDb();
    const where = userId ? "WHERE o.user_id = ?" : "";
    const params: unknown[] = userId ? [userId] : [];
    const rows = db.prepare(
      `SELECT o.*, u.name as user_name, u.email as user_email FROM orders o LEFT JOIN users u ON u.id = o.user_id ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as (Order & { user_name: string; user_email: string })[];
    const total = (db.prepare(`SELECT COUNT(*) as cnt FROM orders o ${where}`).get(...params) as { cnt: number }).cnt;
    return { rows, total };
  },
  findById(id: string, userId?: string) {
    const db = getDb();
    const where = userId ? "WHERE o.id = ? AND o.user_id = ?" : "WHERE o.id = ?";
    const params: unknown[] = userId ? [id, userId] : [id];
    const order = db.prepare(
      `SELECT o.*, u.name as user_name, u.email as user_email, u.phone as user_phone, u.phone_login as user_phone_login
       FROM orders o LEFT JOIN users u ON u.id = o.user_id ${where}`
    ).get(...params) as (Order & {
      user_name: string;
      user_email: string;
      user_phone: string | null;
      user_phone_login: string | null;
    }) | undefined;
    if (!order) return undefined;
    const items = db.prepare(
      "SELECT oi.*, p.name as product_name, p.images as product_images FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?"
    ).all(id) as (OrderItem & { product_name: string; product_images: string })[];
    return { ...order, items };
  },
  create(data: {
    userId: string;
    total: number;
    address: string;
    note?: string | null;
    recipientFirstName: string;
    recipientLastName: string;
    recipientPhone: string;
    recipientEmail: string;
    province: string;
    county: string;
    postalCode: string;
    deliveryPhone: string;
    items: {
      productId: string;
      quantity: number;
      price: number;
      /** Set when the customer picked a weight variant on the product page. */
      variantWeight?: number | null;
      giftPack?: string | null;
      postcard?: string | null;
    }[];
  }) {
    const db = getDb();
    const id = generateId();
    db.prepare(`
      INSERT INTO orders (
        id, status, total, address, note, user_id,
        recipient_first_name, recipient_last_name, recipient_phone, recipient_email,
        province, county, postal_code, delivery_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, "PENDING", data.total, data.address, data.note ?? null, data.userId,
      data.recipientFirstName, data.recipientLastName, data.recipientPhone, data.recipientEmail,
      data.province, data.county, data.postalCode, data.deliveryPhone,
    );
    for (const item of data.items) {
      db.prepare(
        "INSERT INTO order_items (id, quantity, price, order_id, product_id, variant_weight, gift_pack, postcard) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        generateId(), item.quantity, item.price, id, item.productId,
        item.variantWeight ?? null, item.giftPack ?? null, item.postcard ?? null
      );
    }
    return orders.findById(id)!;
  },
  updateStatus(id: string, status: string) {
    getDb().prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    return orders.findById(id)!;
  },
};

// ── Hero Slides ──────────────────────────────────────────────────────────────

export interface HeroSlide {
  id: string; sort_order: number; tag: string;
  title1: string; title2: string; title3: string;
  subtitle: string; cta_label: string; cta_href: string;
  cta2_label: string; cta2_href: string;
  cta3_label: string; cta3_href: string;
  content_position: string;
  image_fit: string;
  image: string; bg_color: string; accent: string;
  active: number; created_at: string;
}

export const heroSlides = {
  list() {
    return getDb().prepare(
      "SELECT * FROM hero_slides ORDER BY sort_order ASC, created_at ASC"
    ).all() as HeroSlide[];
  },
  listActive() {
    return getDb().prepare(
      "SELECT * FROM hero_slides WHERE active = 1 ORDER BY sort_order ASC"
    ).all() as HeroSlide[];
  },
  findById(id: string) {
    return getDb().prepare("SELECT * FROM hero_slides WHERE id = ?").get(id) as HeroSlide | undefined;
  },
  create(data: Omit<HeroSlide, "id" | "created_at">) {
    const id = generateId();
    getDb().prepare(`
      INSERT INTO hero_slides (id,sort_order,tag,title1,title2,title3,subtitle,cta_label,cta_href,cta2_label,cta2_href,cta3_label,cta3_href,content_position,image_fit,image,bg_color,accent,active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(id, data.sort_order, data.tag, data.title1, data.title2, data.title3, data.subtitle,
       data.cta_label, data.cta_href, data.cta2_label, data.cta2_href,
       data.cta3_label ?? "", data.cta3_href ?? "",
       data.content_position ?? "right",
       data.image_fit ?? "cover",
       data.image, data.bg_color, data.accent, data.active);
    return heroSlides.findById(id)!;
  },
  update(id: string, data: Partial<Omit<HeroSlide, "id" | "created_at">>) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    getDb().prepare(`UPDATE hero_slides SET ${fields} WHERE id = ?`).run(...Object.values(data), id);
    return heroSlides.findById(id)!;
  },
  delete(id: string) {
    getDb().prepare("DELETE FROM hero_slides WHERE id = ?").run(id);
  },
};

// ── Promo banners (بنرهای تبلیغاتی) ────────────────────────────────────────────

export interface PromoBanner {
  id: string;
  title: string;
  sub: string;
  href: string;
  image: string;
  theme: "dark" | "light";
  sort_order: number;
  active: number;
  created_at: string;
}

export const promoBanners = {
  list() {
    return getDb().prepare(
      "SELECT * FROM promo_banners ORDER BY sort_order ASC, created_at ASC"
    ).all() as PromoBanner[];
  },
  listActive() {
    return getDb().prepare(
      "SELECT * FROM promo_banners WHERE active = 1 ORDER BY sort_order ASC, created_at ASC"
    ).all() as PromoBanner[];
  },
  findById(id: string) {
    return getDb().prepare("SELECT * FROM promo_banners WHERE id = ?").get(id) as PromoBanner | undefined;
  },
  create(data: Omit<PromoBanner, "id" | "created_at">) {
    const id = generateId();
    getDb().prepare(`
      INSERT INTO promo_banners (id,title,sub,href,image,theme,sort_order,active)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(id, data.title, data.sub ?? "", data.href ?? "/products", data.image ?? "",
       data.theme === "light" ? "light" : "dark", data.sort_order ?? 0, data.active);
    return promoBanners.findById(id)!;
  },
  update(id: string, data: Partial<Omit<PromoBanner, "id" | "created_at">>) {
    const existing = promoBanners.findById(id);
    if (!existing) return undefined;
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    if (fields) getDb().prepare(`UPDATE promo_banners SET ${fields} WHERE id = ?`).run(...Object.values(data), id);
    return promoBanners.findById(id)!;
  },
  delete(id: string) {
    getDb().prepare("DELETE FROM promo_banners WHERE id = ?").run(id);
  },
};

// ── Stats ────────────────────────────────────────────────────────────────────

export const stats = {
  getDashboard() {
    const db = getDb();
    return {
      totalUsers: (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'CUSTOMER'").get() as { cnt: number }).cnt,
      totalProducts: (db.prepare("SELECT COUNT(*) as cnt FROM products WHERE published = 1").get() as { cnt: number }).cnt,
      totalOrders: (db.prepare("SELECT COUNT(*) as cnt FROM orders").get() as { cnt: number }).cnt,
      totalRevenue: (db.prepare("SELECT COALESCE(SUM(total),0) as rev FROM orders WHERE status IN ('CONFIRMED','PROCESSING','SHIPPED','DELIVERED')").get() as { rev: number }).rev,
      pendingOrders: (db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'PENDING'").get() as { cnt: number }).cnt,
    };
  },
  getRecentOrders(limit = 5) {
    return getDb().prepare(
      `SELECT o.*, u.name as user_name, u.email as user_email FROM orders o LEFT JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT ?`
    ).all(limit) as (Order & { user_name: string; user_email: string })[];
  },
};

// ── Support tickets ───────────────────────────────────────────────────────────

export interface SupportTicket {
  id: string;
  status: "OPEN" | "CLOSED";
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender: "CUSTOMER" | "ADMIN";
  body: string;
  created_at: string;
}

export const support = {
  createTicket(data: { name: string; email: string; phone?: string; subject?: string; message: string }) {
    const db = getDb();
    const id = generateId();
    db.prepare(
      "INSERT INTO support_tickets (id, status, name, email, phone, subject) VALUES (?, 'OPEN', ?, ?, ?, ?)"
    ).run(id, data.name, data.email, data.phone ?? null, data.subject ?? null);
    db.prepare(
      "INSERT INTO support_messages (id, ticket_id, sender, body) VALUES (?, ?, 'CUSTOMER', ?)"
    ).run(generateId(), id, data.message);
    return id;
  },

  listTickets(opts: { status?: "OPEN" | "CLOSED"; search?: string; limit?: number; offset?: number } = {}) {
    const { status, search, limit = 20, offset = 0 } = opts;
    const db = getDb();
    const where: string[] = [];
    const params: unknown[] = [];
    if (status) {
      where.push("t.status = ?");
      params.push(status);
    }
    if (search) {
      where.push("(t.name LIKE ? OR t.email LIKE ? OR t.phone LIKE ? OR t.subject LIKE ? OR t.id LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = db.prepare(
      `SELECT t.*,
        (SELECT body FROM support_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at ASC LIMIT 1) AS first_message,
        (SELECT created_at FROM support_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
        (SELECT sender FROM support_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender
       FROM support_tickets t
       ${whereSql}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as (SupportTicket & {
      first_message?: string | null;
      last_message_at?: string | null;
      last_sender?: string | null;
    })[];
    const total = (db.prepare(`SELECT COUNT(*) as cnt FROM support_tickets t ${whereSql}`).get(...params) as { cnt: number }).cnt;
    return { rows, total };
  },

  getTicketDetail(id: string) {
    const db = getDb();
    const ticket = db.prepare("SELECT * FROM support_tickets WHERE id = ?").get(id) as SupportTicket | undefined;
    if (!ticket) return undefined;
    const messages = db.prepare("SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC").all(id) as SupportMessage[];
    return { ticket, messages };
  },

  reply(ticketId: string, body: string) {
    const db = getDb();
    db.prepare("INSERT INTO support_messages (id, ticket_id, sender, body) VALUES (?, ?, 'ADMIN', ?)").run(
      generateId(),
      ticketId,
      body
    );
    db.prepare("UPDATE support_tickets SET updated_at = datetime('now') WHERE id = ?").run(ticketId);
  },

  setStatus(ticketId: string, status: "OPEN" | "CLOSED") {
    const db = getDb();
    db.prepare("UPDATE support_tickets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, ticketId);
  },
};

// ── Special offers (پیشنهاد شگفت انگیز) ──────────────────────────────────────

export interface SpecialOfferRow {
  id: string;
  product_id: string;
  discount_percent: number;
  sort_order: number;
  active: number;
  created_at: string;
}

export interface SpecialOfferWithProduct extends SpecialOfferRow {
  name: string;
  slug: string;
  price: number;
  weight: number;
  karat: number;
  stock: number;
  images: string;
  videos: string;
  ajrat_override: number;
  ajrat_percent: number | null;
  ajrat_fixed: number | null;
  fixed_price: number;
  published: number;
}

export const specialOffers = {
  /** All offers joined with their product, ordered for display. */
  listWithProduct(opts: { activeOnly?: boolean } = {}) {
    const { activeOnly = false } = opts;
    const db = getDb();
    const where = activeOnly ? "WHERE so.active = 1 AND p.published = 1" : "";
    return db.prepare(
      `SELECT so.*, p.name, p.slug, p.price, p.weight, p.karat, p.stock, p.images, p.videos,
              p.ajrat_override, p.ajrat_percent, p.ajrat_fixed, p.fixed_price, p.published
       FROM special_offers so
       INNER JOIN products p ON p.id = so.product_id
       ${where}
       ORDER BY so.sort_order ASC, so.created_at ASC`
    ).all() as SpecialOfferWithProduct[];
  },

  create(data: { product_id: string; discount_percent: number; sort_order?: number; active?: number }) {
    const db = getDb();
    const id = generateId();
    db.prepare(
      "INSERT INTO special_offers (id, product_id, discount_percent, sort_order, active) VALUES (?, ?, ?, ?, ?)"
    ).run(id, data.product_id, data.discount_percent, data.sort_order ?? 0, data.active ?? 1);
    return this.findById(id);
  },

  findById(id: string) {
    const db = getDb();
    const offer = db.prepare("SELECT * FROM special_offers WHERE id = ?").get(id) as SpecialOfferRow | undefined;
    if (!offer) return undefined;
    const withProduct = db.prepare(
      `SELECT so.*, p.name, p.slug, p.price, p.weight, p.karat, p.stock, p.images, p.videos,
              p.ajrat_override, p.ajrat_percent, p.ajrat_fixed, p.fixed_price, p.published
       FROM special_offers so
       INNER JOIN products p ON p.id = so.product_id
       WHERE so.id = ?`
    ).get(id) as SpecialOfferWithProduct | undefined;
    return withProduct ?? offer;
  },

  update(id: string, data: Partial<Pick<SpecialOfferRow, "discount_percent" | "sort_order" | "active">>) {
    const db = getDb();
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    if (!fields) return this.findById(id);
    db.prepare(`UPDATE special_offers SET ${fields} WHERE id = ?`).run(...Object.values(data), id);
    return this.findById(id);
  },

  delete(id: string) {
    getDb().prepare("DELETE FROM special_offers WHERE id = ?").run(id);
  },

  /** Delete every offer row for a product (called when product is deleted). */
  deleteByProductId(productId: string) {
    getDb().prepare("DELETE FROM special_offers WHERE product_id = ?").run(productId);
  },

  countByProductId(productId: string) {
    return (getDb().prepare("SELECT COUNT(*) as cnt FROM special_offers WHERE product_id = ?").get(productId) as { cnt: number }).cnt;
  },
};
