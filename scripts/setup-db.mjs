/**
 * Database setup + seed script
 * Uses Node.js 22 built-in SQLite — no extra dependencies.
 * Reads DATABASE_URL env var to find the DB file path.
 * Safe to run on every container start (fully idempotent).
 */
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");

// ── Resolve DB path ─────────────────────────────────────────────────────────
// DATABASE_URL can be:
//   file:/app/data/delly-gold.db   (Docker / absolute)
//   file:./prisma/dev.db           (local dev / relative)
function resolveDbPath() {
  const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const filePart = url.replace(/^file:/, "");
  if (path.isAbsolute(filePart)) return filePart;
  return path.resolve(path.join(__dirname, ".."), filePart);
}

const DB_PATH = resolveDbPath();

// Ensure parent directory exists (important in Docker)
mkdirSync(path.dirname(DB_PATH), { recursive: true });

console.log("🗄️  Database path:", DB_PATH);

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode=WAL");
db.exec("PRAGMA foreign_keys=ON");

// ── Migrations ───────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT UNIQUE NOT NULL,
    applied_at TEXT DEFAULT (datetime('now'))
  );
`);

const migrations = [
  {
    name: "001_create_users",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id         TEXT PRIMARY KEY,
        email      TEXT UNIQUE NOT NULL,
        password   TEXT NOT NULL,
        name       TEXT NOT NULL,
        phone      TEXT,
        role       TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK(role IN ('ADMIN','CUSTOMER')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `,
  },
  {
    name: "002_create_categories",
    sql: `
      CREATE TABLE IF NOT EXISTS categories (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        slug        TEXT UNIQUE NOT NULL,
        description TEXT,
        image       TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
      );
    `,
  },
  {
    name: "003_create_products",
    sql: `
      CREATE TABLE IF NOT EXISTS products (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        slug        TEXT UNIQUE NOT NULL,
        description TEXT,
        price       REAL NOT NULL,
        weight      REAL NOT NULL,
        karat       INTEGER NOT NULL DEFAULT 18,
        stock       INTEGER NOT NULL DEFAULT 0,
        images      TEXT NOT NULL DEFAULT '[]',
        featured    INTEGER NOT NULL DEFAULT 0,
        published   INTEGER NOT NULL DEFAULT 1,
        category_id TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now')),
        updated_at  TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
    `,
  },
  {
    name: "004_create_orders",
    sql: `
      CREATE TABLE IF NOT EXISTS orders (
        id         TEXT PRIMARY KEY,
        status     TEXT NOT NULL DEFAULT 'PENDING'
                   CHECK(status IN ('PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED')),
        total      REAL NOT NULL,
        address    TEXT,
        note       TEXT,
        user_id    TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id         TEXT PRIMARY KEY,
        quantity   INTEGER NOT NULL,
        price      REAL NOT NULL,
        order_id   TEXT NOT NULL,
        product_id TEXT NOT NULL,
        FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
      CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `,
  },
  {
    name: "005_create_wishlist",
    sql: `
      CREATE TABLE IF NOT EXISTS wishlist_items (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL,
        product_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(user_id, product_id)
      );
    `,
  },
  {
    name: "006_user_address",
    sql: `ALTER TABLE users ADD COLUMN address TEXT;`,
  },
  {
    name: "007_product_ajrat",
    sql: `
      ALTER TABLE products ADD COLUMN ajrat_percent REAL;
      ALTER TABLE products ADD COLUMN ajrat_fixed REAL;
      ALTER TABLE products ADD COLUMN ajrat_override INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    name: "008_category_image",
    sql: `ALTER TABLE categories ADD COLUMN banner_image TEXT;`,
  },
  {
    name: "009_hero_slides",
    sql: `
      CREATE TABLE IF NOT EXISTS hero_slides (
        id         TEXT PRIMARY KEY,
        sort_order INTEGER NOT NULL DEFAULT 0,
        tag        TEXT NOT NULL DEFAULT '',
        title1     TEXT NOT NULL DEFAULT '',
        title2     TEXT NOT NULL DEFAULT '',
        title3     TEXT NOT NULL DEFAULT '',
        subtitle   TEXT NOT NULL DEFAULT '',
        cta_label  TEXT NOT NULL DEFAULT 'مشاهده محصولات',
        cta_href   TEXT NOT NULL DEFAULT '/products',
        cta2_label TEXT NOT NULL DEFAULT '',
        cta2_href  TEXT NOT NULL DEFAULT '',
        image      TEXT NOT NULL DEFAULT '',
        bg_color   TEXT NOT NULL DEFAULT '#f2ebe0',
        accent     TEXT NOT NULL DEFAULT '#c8a12a',
        active     INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `,
  },
  {
    name: "010_site_settings_extended",
    sql: `
      CREATE TABLE IF NOT EXISTS settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('site_announcement', 'با اعتماد شما، سال‌ها طلایی ساختیم.'),
        ('site_phone1', ''),
        ('site_phone2', ''),
        ('site_address', ''),
        ('site_email', ''),
        ('site_instagram', ''),
        ('site_telegram', ''),
        ('site_whatsapp', ''),
        ('promo_banner1_title', ''),
        ('promo_banner1_sub', ''),
        ('promo_banner1_href', '/products'),
        ('promo_banner1_image', ''),
        ('promo_banner2_title', ''),
        ('promo_banner2_sub', ''),
        ('promo_banner2_href', '/products'),
        ('promo_banner2_image', '');
    `,
  },
  {
    name: "011_fix_promo_keys",
    sql: `
      INSERT OR IGNORE INTO settings (key, value)
        SELECT 'promo_b1_title', value FROM settings WHERE key = 'promo_banner1_title';
      INSERT OR IGNORE INTO settings (key, value)
        SELECT 'promo_b1_sub', value FROM settings WHERE key = 'promo_banner1_sub';
      INSERT OR IGNORE INTO settings (key, value)
        SELECT 'promo_b1_href', value FROM settings WHERE key = 'promo_banner1_href';
      INSERT OR IGNORE INTO settings (key, value)
        SELECT 'promo_b1_image', value FROM settings WHERE key = 'promo_banner1_image';
      INSERT OR IGNORE INTO settings (key, value)
        SELECT 'promo_b2_title', value FROM settings WHERE key = 'promo_banner2_title';
      INSERT OR IGNORE INTO settings (key, value)
        SELECT 'promo_b2_sub', value FROM settings WHERE key = 'promo_banner2_sub';
      INSERT OR IGNORE INTO settings (key, value)
        SELECT 'promo_b2_href', value FROM settings WHERE key = 'promo_banner2_href';
      INSERT OR IGNORE INTO settings (key, value)
        SELECT 'promo_b2_image', value FROM settings WHERE key = 'promo_banner2_image';
    `,
  },
  {
    name: "012_nav_links",
    sql: `
      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('nav_links', '[{"label":"هدیه","href":"/products"},{"label":"کالکشن","href":"/collections"},{"label":"تخفیف‌دار","href":"/products"},{"label":"✨ پرو مجازی","href":"/tryon"},{"label":"گردنبند","href":"/products?category=necklaces"},{"label":"گوشواره","href":"/products?category=earrings"},{"label":"انگشتر","href":"/products?category=rings"},{"label":"دستبند","href":"/products?category=bracelets"},{"label":"ست و نیم‌ست","href":"/products"},{"label":"پابند","href":"/products"},{"label":"جاسوئیچی","href":"/products"},{"label":"بچه‌گانه","href":"/products"},{"label":"سکه","href":"/products"}]'),
        ('promo_strip_links', '[{"label":"جدیدترین محصولات","href":"/products"},{"label":"جدیدترین گردنبندها","href":"/products?category=necklaces"},{"label":"خرید اقساطی طلا","href":"/contact"},{"label":"جدیدترین کالکشن‌ها","href":"/collections"},{"label":"پرفروش‌ترین محصولات","href":"/products"},{"label":"جدیدترین دستبندها","href":"/products?category=bracelets"},{"label":"جدیدترین گوشواره‌ها","href":"/products?category=earrings"},{"label":"محصولات ویژه","href":"/products"}]');
    `,
  },
  {
    name: "013_phone_auth",
    sql: `
      ALTER TABLE users ADD COLUMN phone_login TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_login ON users(phone_login) WHERE phone_login IS NOT NULL;
    `,
  },
  {
    name: "014_slide_buttons",
    sql: `
      ALTER TABLE hero_slides ADD COLUMN cta3_label TEXT NOT NULL DEFAULT '';
      ALTER TABLE hero_slides ADD COLUMN cta3_href  TEXT NOT NULL DEFAULT '';
      ALTER TABLE hero_slides ADD COLUMN content_position TEXT NOT NULL DEFAULT 'right';
    `,
  },
  {
    name: "015_slide_image_fit",
    sql: `ALTER TABLE hero_slides ADD COLUMN image_fit TEXT NOT NULL DEFAULT 'cover';`,
  },
  {
    name: "016_otp_codes",
    sql: `
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
    `,
  },
  {
    name: "017_order_shipping_fields",
    sql: `
      ALTER TABLE orders ADD COLUMN recipient_first_name TEXT;
      ALTER TABLE orders ADD COLUMN recipient_last_name TEXT;
      ALTER TABLE orders ADD COLUMN recipient_phone TEXT;
      ALTER TABLE orders ADD COLUMN recipient_email TEXT;
      ALTER TABLE orders ADD COLUMN province TEXT;
      ALTER TABLE orders ADD COLUMN county TEXT;
      ALTER TABLE orders ADD COLUMN postal_code TEXT;
      ALTER TABLE orders ADD COLUMN delivery_phone TEXT;
    `,
  },
  {
    name: "018_social_icon_settings",
    sql: `
      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('site_social_instagram_icon', ''),
        ('site_social_telegram_icon', ''),
        ('site_social_bale_icon', ''),
        ('site_social_whatsapp_icon', ''),
        ('site_social_install_icon', '');
    `,
  },
  {
    name: "019_price_bar_part_order",
    sql: `
      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('price_bar_part_order', 'label,gold,amount,currency');
    `,
  },
  {
    name: "020_about_contact_page_settings",
    sql: `
      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('about_page_json', '{}'),
        ('contact_page_json', '{}');
    `,
  },
  {
    name: "021_support_tickets",
    sql: `
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
    `,
  },
  {
    name: "022_special_offers",
    sql: `
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
      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('special_offers_title', 'پیشنهاد شگفت انگیز'),
        ('special_offers_href', '/products'),
        ('special_offers_enabled', '1');
    `,
  },
  {
    name: "023_special_offers_countdown",
    sql: `
      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('special_offers_end', '');
    `,
  },
  {
    // order_items.product_id referenced products(id) with no ON DELETE action, so
    // deleting a product that had ever been ordered raised
    // "FOREIGN KEY constraint failed" — surfaced by the API as HTTP 500.
    // Rebuild the table so the product reference is nullable and clears itself,
    // keeping the order line (quantity/price) intact for order history.
    name: "024_order_items_product_fk",
    sql: `
      PRAGMA foreign_keys=OFF;
      BEGIN;
      DROP TABLE IF EXISTS order_items_new;
      CREATE TABLE order_items_new (
        id         TEXT PRIMARY KEY,
        quantity   INTEGER NOT NULL,
        price      REAL NOT NULL,
        order_id   TEXT NOT NULL,
        product_id TEXT,
        FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      );
      INSERT INTO order_items_new (id, quantity, price, order_id, product_id)
        SELECT id, quantity, price, order_id, product_id FROM order_items;
      DROP TABLE order_items;
      ALTER TABLE order_items_new RENAME TO order_items;
      CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
      COMMIT;
      PRAGMA foreign_keys=ON;
    `,
  },
  {
    // Product video support: JSON array of video URLs, same pattern as `images`.
    // The first video is treated as the product's "video banner" — shown in the
    // detail gallery and as the hover preview on product list cards.
    name: "025_product_videos",
    sql: `ALTER TABLE products ADD COLUMN videos TEXT NOT NULL DEFAULT '[]';`,
  },
  {
    // «محصولات ارسال فوری» — a simple flag on the product (no separate table),
    // toggled from the product add/edit form. The homepage renders flagged
    // products in their own colored panel with the same cards as special offers.
    name: "026_product_express_shipping",
    sql: `
      ALTER TABLE products ADD COLUMN express_shipping INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_products_express ON products(express_shipping);
    `,
  },
  {
    // «بنرهای تبلیغاتی» — admin-manageable homepage promo cards
    // (تخفیف‌های دلی‌گلد / طلای کم اُجرت / ...). Replaces the hardcoded pair
    // in PromoBanners.tsx; existing settings values are migrated into rows.
    name: "027_promo_banners",
    sql: `
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

      INSERT INTO promo_banners (id, title, sub, href, image, theme, sort_order, active)
      SELECT lower(hex(randomblob(12))),
        COALESCE(NULLIF((SELECT value FROM settings WHERE key = 'promo_b1_title'), ''), 'تخفیف‌های دلی‌گلد'),
        COALESCE(NULLIF((SELECT value FROM settings WHERE key = 'promo_b1_sub'), ''),   'محصولات تخفیف‌دار'),
        COALESCE(NULLIF((SELECT value FROM settings WHERE key = 'promo_b1_href'), ''),  '/products'),
        COALESCE(NULLIF((SELECT value FROM settings WHERE key = 'promo_b1_image'), ''), 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=500&q=80'),
        'dark', 0, 1
      WHERE NOT EXISTS (SELECT 1 FROM promo_banners);

      INSERT INTO promo_banners (id, title, sub, href, image, theme, sort_order, active)
      SELECT lower(hex(randomblob(12))),
        COALESCE(NULLIF((SELECT value FROM settings WHERE key = 'promo_b2_title'), ''), 'طلای کم اُجرت'),
        COALESCE(NULLIF((SELECT value FROM settings WHERE key = 'promo_b2_sub'), ''),   'محصولات با کمترین اُجرت ساخت'),
        COALESCE(NULLIF((SELECT value FROM settings WHERE key = 'promo_b2_href'), ''),  '/products'),
        COALESCE(NULLIF((SELECT value FROM settings WHERE key = 'promo_b2_image'), ''), 'https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=500&q=80'),
        'light', 1, 1
      WHERE (SELECT COUNT(*) FROM promo_banners) < 2;
    `,
  },
  {
    // «محصولات کم اُجرت» — another simple product flag like «ارسال فوری» (026),
    // toggled from the product add/edit form. Flagged products render in their
    // own homepage panel (violet theme, same cards as special offers).
    name: "028_product_low_wage",
    sql: `
      ALTER TABLE products ADD COLUMN low_wage INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_products_low_wage ON products(low_wage);
    `,
  },
  {
    // «سکه و آبشده» — coin/melted-gold flag like «ارسال فوری» (026), managed
    // from the dedicated «سکه و آبشده» admin page (/admin/coin-products).
    // Flagged products render in their own homepage panel (gold theme) and
    // are browsable at /products?coin=true.
    name: "029_product_coin",
    sql: `
      ALTER TABLE products ADD COLUMN coin INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_products_coin ON products(coin);
    `,
  },
  {
    // «صفحه محصول» — product variants (weight/price/stock choices) + the specs
    // table rows, both JSON arrays on the product row. Managed from the product
    // form in /admin/products and rendered by /products/[slug].
    name: "030_product_variants_specs",
    sql: `
      ALTER TABLE products ADD COLUMN variants TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE products ADD COLUMN specs TEXT NOT NULL DEFAULT '[]';
    `,
  },
  {
    // Per-line gift options + the chosen weight variant, copied onto the order
    // line so the admin can see what was actually ordered.
    name: "031_order_item_extras",
    sql: `
      ALTER TABLE order_items ADD COLUMN variant_weight REAL;
      ALTER TABLE order_items ADD COLUMN gift_pack TEXT;
      ALTER TABLE order_items ADD COLUMN postcard TEXT;
    `,
  },
  {
    // «دیدگاه‌ها» — customer reviews, moderated from /admin/reviews.
    name: "032_product_reviews",
    sql: `
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
    `,
  },
  {
    // «جدیدترین محصولات» — simple product flag toggled from the product form.
    // Flagged products render in their own homepage panel (same gold cards as
    // «پرفروش‌ترین محصولات», newest first) and are browsable at /products?new=true.
    name: "033_product_new_arrival",
    sql: `
      ALTER TABLE products ADD COLUMN new_arrival INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_products_new_arrival ON products(new_arrival);
    `,
  },
];

let appliedCount = 0;
for (const migration of migrations) {
  const exists = db.prepare("SELECT id FROM _migrations WHERE name = ?").get(migration.name);
  if (!exists) {
    db.exec(migration.sql);
    db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(migration.name);
    console.log(`  ✅ Migration: ${migration.name}`);
    appliedCount++;
  }
}
if (appliedCount === 0) {
  console.log("  ℹ️  All migrations already applied");
}

// ── Seed ─────────────────────────────────────────────────────────────────────
function generateId() {
  return createHash("sha256")
    .update(Math.random().toString() + Date.now().toString())
    .digest("hex")
    .slice(0, 24);
}

// Admin user
const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@dellygold.com");
if (!adminExists) {
  const hash = await bcrypt.hash("Admin@1234", 12);
  db.prepare("INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)").run(
    generateId(), "admin@dellygold.com", hash, "مدیر سیستم", "ADMIN"
  );
  console.log("  ✅ Admin user created");
} else {
  console.log("  ℹ️  Admin user already exists");
}

// Categories
const categoryData = [
  { name: "گردنبند",  slug: "necklaces", description: "انواع گردنبندهای طلا" },
  { name: "انگشتر",  slug: "rings",      description: "انواع انگشترهای طلا" },
  { name: "دستبند",  slug: "bracelets",  description: "انواع دستبندهای طلا" },
  { name: "گوشواره", slug: "earrings",   description: "انواع گوشواره‌های طلا" },
];
const catIds = {};
for (const cat of categoryData) {
  const existing = db.prepare("SELECT id FROM categories WHERE slug = ?").get(cat.slug);
  if (!existing) {
    const id = generateId();
    db.prepare("INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)").run(
      id, cat.name, cat.slug, cat.description
    );
    catIds[cat.slug] = id;
  } else {
    catIds[cat.slug] = existing.id;
  }
}
console.log("  ✅ Categories ready");

// Products
const productData = [
  { name: "گردنبند قلبی طلا",      slug: "gold-heart-necklace",  price: 1750000, weight: 1.4,  karat: 18, stock: 5, category: "necklaces", featured: 1 },
  { name: "انگشتر ظریف نگین‌دار",  slug: "delicate-stone-ring",  price: 2450000, weight: 1.85, karat: 18, stock: 3, category: "rings",      featured: 1 },
  { name: "دستبند گارنت",          slug: "garnet-bracelet",      price: 3980000, weight: 2.1,  karat: 18, stock: 2, category: "bracelets",  featured: 0 },
  { name: "گوشواره حلقه‌ای",       slug: "hoop-earrings",        price: 1820000, weight: 1.3,  karat: 18, stock: 8, category: "earrings",   featured: 1 },
  { name: "گردنبند کلاسیک",        slug: "classic-necklace",     price: 2700000, weight: 1.42, karat: 18, stock: 4, category: "necklaces",  featured: 0 },
  { name: "النگوی طلا",            slug: "gold-bangle",          price: 4200000, weight: 2.1,  karat: 18, stock: 1, category: "bracelets",  featured: 1 },
];
let productCount = 0;
for (const p of productData) {
  const existing = db.prepare("SELECT id FROM products WHERE slug = ?").get(p.slug);
  if (!existing) {
    db.prepare(
      "INSERT INTO products (id, name, slug, description, price, weight, karat, stock, images, featured, published, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      generateId(), p.name, p.slug,
      `${p.name} از طلای ${p.karat} عیار`,
      p.price, p.weight, p.karat, p.stock,
      "[]", p.featured, 1, catIds[p.category]
    );
    productCount++;
  }
}
console.log(`  ✅ ${productCount} product(s) seeded`);

db.close();

console.log("\n🎉 Database ready!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Admin:    http://localhost:3000/admin");
console.log("Email:    admin@dellygold.com");
console.log("Password: Admin@1234");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
