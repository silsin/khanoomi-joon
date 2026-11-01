import { getDb } from "./db";
import { FONT_OPTIONS, TYPO_SECTIONS, clampTypoSize } from "./typography";
import { clampPriceBarFontSize } from "./price-bar-settings";
import { tgSendMessage, escapeHtml } from "./telegram";

const TYPO_KEY_BY_FA: Record<string, string> = {
  "متن": "typo_body", "متن اصلی": "typo_body",
  "عنوان": "typo_heading", "عناوین": "typo_heading", "تیتر": "typo_heading",
  "محصول": "typo_product", "نام محصول": "typo_product",
  "قیمت": "typo_price", "اعداد": "typo_price",
  "منو": "typo_nav", "ناوبری": "typo_nav",
  "اسلایدر": "typo_slider", "بنر": "typo_slider",
};

function ensureSettingsTable() {
  getDb().exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')));");
}

export function botGetSetting(key: string): string | null {
  ensureSettingsTable();
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function botSetSettings(entries: Record<string, string>) {
  ensureSettingsTable();
  const db = getDb();
  for (const [k, v] of Object.entries(entries)) {
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(k, String(v));
  }
}

export function botGetAdminIds(): number[] {
  const raw = (botGetSetting("telegram_admin_ids")?.trim() || process.env.TELEGRAM_ADMIN_IDS?.trim() || "");
  return raw.split(/[,\s]+/).map(s => parseInt(s, 10)).filter(n => !Number.isNaN(n));
}

export function botIsAdmin(chatId: number): boolean {
  return botGetAdminIds().includes(chatId);
}

export function botAddAdmin(chatId: number) {
  const ids = new Set(botGetAdminIds());
  ids.add(chatId);
  botSetSettings({ telegram_admin_ids: [...ids].join(",") });
}

function adminPin(): string {
  return (process.env.TELEGRAM_ADMIN_PIN?.trim() || process.env.ADMIN_SETUP_PIN?.trim() || "1234");
}

const MAIN_KEYBOARD = { keyboard: [[{ text: "📊 وضعیت" }, { text: "🧾 سفارش‌ها" }], [{ text: "📦 محصولات" }, { text: "🖼 اسلایدها" }], [{ text: "💰 طلا" }, { text: "📢 بنر" }], [{ text: "🔤 فونت‌ها" }, { text: "❓ راهنما" }]], resize_keyboard: true };

export const BOT_HELP = "مدیریت دلی‌گلد از تلگرام 🤖\n— از دکمه‌ها استفاده کن یا تایپ کن —\n\n📊 وضعیت — آمار فروشگاه\n🧾 سفارش‌ها — ۵ سفارش آخر\n📦 محصولات — ۱۰ محصول آخر\n📦 محصول <شماره> — جزئیات کامل یک محصول\n\n✏️ ویرایش محصول (شماره از لیست):\nنام <شماره> <متن جدید>\nقیمت <شماره> <عدد>\nموجودی <شماره> <عدد>\nوزن <شماره> <عدد>\nعیار <شماره> <عدد>\nتوضیح <شماره> <متن>\n✅ نمایش <شماره> — انتشار محصول\n🚫 مخفی <شماره> — عدم نمایش\n⭐ ویژه <شماره> — عضو ویترین ویژه\n\n🖼 اسلایدها — لیست اسلایدها\nاسلاید خاموش <شماره>\nاسلاید روشن <شماره>\nاسلاید تیتر <شماره> <متن>\n\n💰 طلا [قیمت] — قیمت دستی طلا\n📢 بنر <متن> — بنر بالای سایت\n🔤 فونت‌ها — لیست فونت‌ها و بخش‌ها\n🔤 فونت عنوان وزیرمتن 30 — فونت/سایز بخش\n🔤 نوارفونت لاله‌زار 16 — فونت نوار قیمت\n🔤 سایز عنوان 32 — سایز بخش (۸ تا ۲۰۰)";

function resolveFontId(input: string): string | null {
  const t = input.trim();
  const byId = FONT_OPTIONS.find(f => f.id.toLowerCase() === t.toLowerCase());
  if (byId) return byId.id;
  const byLabel = FONT_OPTIONS.find(f => f.label === t);
  if (byLabel) return byLabel.id;
  const norm = t.replace(/\s+/g, "").toLowerCase();
  return FONT_OPTIONS.find(f => f.id.replace(/\+/g, "").toLowerCase() === norm)?.id ?? null;
}

function resolveTypoKey(input: string): string | null {
  const t = input.trim().toLowerCase();
  return TYPO_SECTIONS.find(s => s.key.toLowerCase() === t || s.key.replace("typo_", "") === t)?.key
    ?? TYPO_SECTIONS.find(s => s.label === input.trim())?.key ?? null;
}
export async function botHandleMessage(chatId: number, rawText: string): Promise<void> {
  const text = (rawText || "").trim();
  if (!text) return;
  const low = text.toLowerCase();
  if (/^\/start(\s|$)/i.test(text) || text === "شروع") {
    const ids = botGetAdminIds();
    if (ids.length === 0) {
      const pin = text.replace(/^\/start/i, "").trim();
      if (pin === adminPin()) {
        botAddAdmin(chatId);
        await tgSendMessage(chatId, "✅ خوش آمدی مدیر!\n\n" + BOT_HELP, MAIN_KEYBOARD);
      } else {
        await tgSendMessage(chatId, "🔐 برای فعال‌سازی، پین را بفرست:\n<code>/start PIN</code>");
      }
    } else if (botIsAdmin(chatId)) {
      await tgSendMessage(chatId, "سلام مدیر 👋\n\n" + BOT_HELP, MAIN_KEYBOARD);
    } else {
      await tgSendMessage(chatId, "⛔ دسترسی نداری.");
    }
    return;
  }
  if (!botIsAdmin(chatId)) {
    await tgSendMessage(chatId, "⛔ فقط مدیر دسترسی دارد.");
    return;
  }
  if (text === "❓ راهنما" || low === "/help" || text === "راهنما" || text === "کمک" || low === "help") {
    await tgSendMessage(chatId, BOT_HELP);
    return;
  }
  if (text === "📊 وضعیت" || low === "/stats" || text === "وضعیت" || text === "آمار" || low === "stats") {
    const db = getDb();
    const q = (sql: string) => (db.prepare(sql).get() as Record<string, number>);
    const users = q("SELECT COUNT(*) c FROM users WHERE role='CUSTOMER'").c ?? 0;
    const prods = q("SELECT COUNT(*) c FROM products WHERE published=1").c ?? 0;
    const orders = q("SELECT COUNT(*) c FROM orders").c ?? 0;
    const pending = q("SELECT COUNT(*) c FROM orders WHERE status='PENDING'").c ?? 0;
    const rev = q("SELECT COALESCE(SUM(total),0) r FROM orders WHERE status IN ('CONFIRMED','PROCESSING','SHIPPED','DELIVERED')").r ?? 0;
    await tgSendMessage(chatId, "📊 <b>وضعیت فروشگاه</b>\n👥 مشتری: " + users + "\n📦 محصول فعال: " + prods + "\n🧾 سفارش: " + orders + " (در انتظار: " + pending + ")\n💰 درآمد: " + Number(rev).toLocaleString("fa-IR") + " تومان");
    return;
  }
  if (text === "🧾 سفارش‌ها" || low === "/orders" || text === "سفارش‌ها" || text === "سفارشها" || low === "orders") {
    const rows = getDb().prepare("SELECT total, status FROM orders ORDER BY created_at DESC LIMIT 5").all() as { total: number; status: string }[];
    if (!rows.length) { await tgSendMessage(chatId, "🧾 سفارشی ثبت نشده."); return; }
    const lines = rows.map((o, i) => (i + 1) + ". " + Number(o.total).toLocaleString("fa-IR") + " تومان — <b>" + escapeHtml(o.status) + "</b>");
    await tgSendMessage(chatId, "🧾 <b>۵ سفارش آخر:</b>\n\n" + lines.join("\n\n"));
    return;
  }
  if (text === "💰 طلا" || low === "/gold" || text === "طلا" || low === "gold") {
    const manual = botGetSetting("gold_manual_price");
    await tgSendMessage(chatId, manual ? "💰 قیمت دستی فعلی: <b>" + Number(manual).toLocaleString("fa-IR") + " تومان</b>\nبرای تغییر: <code>طلا 2450000</code>" : "💰 قیمت دستی ثبت نشده. برای ثبت: <code>طلا 2450000</code>");
    return;
  }

  const gm = text.match(/^(?:💰\s*)?(?:طلا|gold)\s+([\d۰-۹,\s]+)$/i);
  if (gm) {
    const fa = gm[1].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const price = parseInt(fa.replace(/[\s,]/g, ""), 10);
    if (Number.isNaN(price) || price <= 0) { await tgSendMessage(chatId, "⚠️ عدد معتبر بفرست. مثال: <code>طلا 2450000</code>"); return; }
    botSetSettings({ gold_manual_price: String(price) });
    await tgSendMessage(chatId, "✅ قیمت دستی ثبت شد: <b>" + price.toLocaleString("fa-IR") + " تومان</b>");
    return;
  }
  const bm = text.match(/^(?:📢\s*)?(?:بنر|banner)\s+([\s\S]+)$/i);
  if (bm) {
    const msg = bm[1].trim().slice(0, 200);
    botSetSettings({ site_announcement: msg });
    await tgSendMessage(chatId, "✅ بنر بالای سایت شد:\n«" + escapeHtml(msg) + "»");
    return;
  }
  if (text === "📢 بنر" || low === "/banner" || text === "بنر" || low === "banner") {
    const cur = botGetSetting("site_announcement") || "(خالی)";
    await tgSendMessage(chatId, "📢 بنر فعلی: «" + escapeHtml(cur) + "»\nبرای تغییر: <code>بنر متن جدید...</code>");
    return;
  }
  if (text === "🔤 فونت‌ها" || low === "/fonts" || text === "فونت‌ها" || text === "فونتها" || low === "fonts") {
    const names = FONT_OPTIONS.map((f, i) => (i + 1) + ". " + f.label + " — <code>" + f.id + "</code>").join("\n");
    const secs = TYPO_SECTIONS.map(s => "• " + s.label).join("\n");
    await tgSendMessage(chatId, "🔤 <b>فونت‌ها:</b>\n" + names + "\n\n<b>بخش‌ها:</b>\n" + secs + "\n\nمثال:\n<code>فونت عنوان وزیرمتن 30</code>\n<code>نوارفونت لاله‌زار 16</code>\n<code>سایز عنوان 32</code>");
    return;
  }
  const barM = text.match(/^(?:🔤\s*)?(?:نوارفونت|barfont)\s+(\S+)(?:\s+([\d۰-۹]{1,3}))?\s*$/i);
  if (barM) {
    const fontId = resolveFontId(barM[1]);
    if (!fontId) { await tgSendMessage(chatId, "⚠️ فونت پیدا نشد. <code>فونت‌ها</code> را ببین."); return; }
    const numFa = (barM[2] || "").replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const patch: Record<string, string> = { price_bar_font_id: fontId };
    if (numFa) patch.price_bar_font_size = String(clampPriceBarFontSize(numFa));
    botSetSettings(patch);
    const label = FONT_OPTIONS.find(f => f.id === fontId)?.label ?? fontId;
    await tgSendMessage(chatId, "✅ نوار قیمت → فونت <b>" + escapeHtml(label) + "</b>" + (numFa ? " سایز <b>" + patch.price_bar_font_size + "px</b>" : ""));
    return;
  }
  const sizeM = text.match(/^(?:سایز|size)\s+(\S+(?:\s+\S+)?)\s+([\d۰-۹]{1,3})\s*$/i);
  if (sizeM) {
    const key = TYPO_KEY_BY_FA[sizeM[1].trim()] || resolveTypoKey(sizeM[1].trim());
    if (!key) { await tgSendMessage(chatId, "⚠️ بخش پیدا نشد. بخش‌ها: متن، عنوان، محصول، قیمت، منو، اسلایدر"); return; }
    const sec = TYPO_SECTIONS.find(s => s.key === key)!;
    const numFa = sizeM[2].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const size = String(clampTypoSize(numFa, sec.defaultSize));
    botSetSettings({ [key + "_size"]: size });
    await tgSendMessage(chatId, "✅ سایز «" + sec.label + "» شد <b>" + size + "px</b>");
    return;
  }
  const fontM = text.match(/^(?:🔤\s*)?(?:فونت|font)\s+(\S+(?:\s+\S+)?)\s+(\S+)(?:\s+([\d۰-۹]{1,3}))?\s*$/i);
  if (fontM) {
    const key = TYPO_KEY_BY_FA[fontM[1].trim()] || resolveTypoKey(fontM[1].trim());
    const fontId = resolveFontId(fontM[2]);
    if (!key || !fontId) { await tgSendMessage(chatId, "⚠️ بخش یا فونت پیدا نشد. <code>فونت‌ها</code> را ببین."); return; }
    const sec = TYPO_SECTIONS.find(s => s.key === key)!;
    const patch: Record<string, string> = { [key + "_font"]: fontId };
    if (fontM[3]) {
      const numFa = fontM[3].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
      patch[key + "_size"] = String(clampTypoSize(numFa, sec.defaultSize));
    }
    botSetSettings(patch);
    const label = FONT_OPTIONS.find(f => f.id === fontId)?.label ?? fontId;
    await tgSendMessage(chatId, "✅ «" + sec.label + "» → فونت <b>" + escapeHtml(label) + "</b>" + (fontM[3] ? " سایز <b>" + patch[key + "_size"] + "px</b>" : ""));
    return;
  }

  // ── Lists (products / slides) then delegate the rest ─────────────────────
  if (text === "📦 محصولات" || low === "/products" || text === "محصولات" || low === "products") {
    const rows = getDb().prepare("SELECT id, name, price, stock, published, featured FROM products ORDER BY created_at DESC LIMIT 10").all() as { id: string; name: string; price: number; stock: number; published: number; featured: number }[];
    if (!rows.length) { await tgSendMessage(chatId, "📦 محصولی نیست."); return; }
    const lines = rows.map((p, i) =>
      (i + 1) + ". " + escapeHtml(p.name) + "\n   " + faNum(p.price) + " تومان | موجودی " + faNum(p.stock) +
      (p.published ? "" : " | 🚫 مخفی") + (p.featured ? " | ⭐" : "") + "\n   <code>" + p.id.slice(0, 6) + "</code>");
    await tgSendMessage(chatId, "📦 <b>۱۰ محصول آخر</b> (شماره را برای ویرایش استفاده کن):\n\n" + lines.join("\n"));
    return;
  }
  if (text === "🖼 اسلایدها" || low === "/slides" || text === "اسلایدها" || low === "slides") {
    const rows = getDb().prepare("SELECT id, title1, title2, title3, active, sort_order FROM hero_slides ORDER BY sort_order ASC, created_at ASC LIMIT 20").all() as { id: string; title1: string; title2: string; title3: string; active: number; sort_order: number }[];
    if (!rows.length) { await tgSendMessage(chatId, "🖼 اسلایدی نیست. از پنل اضافه کن."); return; }
    const lines = rows.map((s, i) =>
      (i + 1) + ". " + escapeHtml([s.title1, s.title2, s.title3].filter(Boolean).join(" ") || "(بی‌تیتر)") +
      (s.active ? " | ✅" : " | ⛔") + " ترتیب " + faNum(s.sort_order) + "\n   <code>" + s.id.slice(0, 6) + "</code>");
    await tgSendMessage(chatId, "🖼 <b>اسلایدها:</b>\n\n" + lines.join("\n"));
    return;
  }

  await botHandleCatalog(chatId, text, low);
  return;
}

/** Short numeric index (from lists) or id-prefix (min 4 chars) → row id. */
function resolveRef(refRaw: string, table: "products" | "hero_slides"): { id: string } | null {
  const ref = refRaw.trim().replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const db = getDb();
  if (/^\d+$/.test(ref)) {
    const idx = parseInt(ref, 10);
    if (idx < 1 || idx > 50) return null;
    const q = table === "products"
      ? "SELECT id FROM products ORDER BY created_at DESC LIMIT 50"
      : "SELECT id FROM hero_slides ORDER BY sort_order ASC, created_at ASC LIMIT 50";
    const rows = db.prepare(q).all() as { id: string }[];
    return idx <= rows.length ? { id: rows[idx - 1].id } : null;
  }
  if (ref.length >= 4) {
    const rows = db.prepare("SELECT id FROM " + table).all() as { id: string }[];
    const hit = rows.find(r => r.id.startsWith(ref));
    if (hit) return { id: hit.id };
  }
  return null;
}

function faNum(n: number): string {
  return Number(n).toLocaleString("fa-IR");
}

export async function botHandleCatalog(chatId: number, text: string, low: string): Promise<void> {
  const db = getDb();

  // product detail
  const pdM = text.match(/^(?:📦\s*)?(?:محصول|product)\s+(\S+)\s*$/i);
  if (pdM) {
    const ref = resolveRef(pdM[1], "products");
    if (!ref) { await tgSendMessage(chatId, "⚠️ محصول پیدا نشد. اول <code>محصولات</code> را ببین."); return; }
    const p = db.prepare("SELECT * FROM products WHERE id = ?").get(ref.id) as Record<string, string | number | null> | undefined;
    if (!p) { await tgSendMessage(chatId, "⚠️ محصول پیدا نشد."); return; }
    await tgSendMessage(chatId,
      "📦 <b>" + escapeHtml(String(p.name)) + "</b>\n" +
      "قیمت: " + faNum(Number(p.price)) + " تومان\n" +
      "وزن: " + faNum(Number(p.weight)) + " گرم | عیار: " + faNum(Number(p.karat)) + "\n" +
      "موجودی: " + faNum(Number(p.stock)) + "\n" +
      "وضعیت: " + (Number(p.published) ? "✅ نمایش" : "🚫 مخفی") + (Number(p.featured) ? " | ⭐ ویژه" : "") + "\n" +
      (p.description ? "توضیح: " + escapeHtml(String(p.description)).slice(0, 150) + "\n" : "") +
      "<code>" + String(p.id).slice(0, 6) + "</code>");
    return;
  }

  // name
  const nm = text.match(/^(?:نام|name)\s+(\S+)\s+([\s\S]+)$/i);
  if (nm) {
    const ref = resolveRef(nm[1], "products");
    if (!ref) { await tgSendMessage(chatId, "⚠️ محصول پیدا نشد."); return; }
    const name = nm[2].trim().slice(0, 120);
    db.prepare("UPDATE products SET name = ?, updated_at = datetime('now') WHERE id = ?").run(name, ref.id);
    await tgSendMessage(chatId, "✅ نام شد: «" + escapeHtml(name) + "»");
    return;
  }

  await botHandleCatalog2(chatId, text, low);
}

export async function botHandleCatalog2(chatId: number, text: string, low: string): Promise<void> {
  const db = getDb();

  // price
  const pm = text.match(/^(?:قیمت|price)\s+(\S+)\s+([\d۰-۹,\s]+)$/i);
  if (pm) {
    const ref = resolveRef(pm[1], "products");
    if (!ref) { await tgSendMessage(chatId, "⚠️ محصول پیدا نشد."); return; }
    const fa = pm[2].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const price = parseFloat(fa.replace(/[\s,]/g, ""));
    if (Number.isNaN(price) || price < 0) { await tgSendMessage(chatId, "⚠️ عدد معتبر بفرست."); return; }
    db.prepare("UPDATE products SET price = ?, updated_at = datetime('now') WHERE id = ?").run(price, ref.id);
    await tgSendMessage(chatId, "✅ قیمت شد: <b>" + faNum(price) + " تومان</b>");
    return;
  }

  // stock
  const sm = text.match(/^(?:موجودی|stock)\s+(\S+)\s+([\d۰-۹]+)$/i);
  if (sm) {
    const ref = resolveRef(sm[1], "products");
    if (!ref) { await tgSendMessage(chatId, "⚠️ محصول پیدا نشد."); return; }
    const fa = sm[2].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const stock = parseInt(fa, 10);
    if (Number.isNaN(stock) || stock < 0) { await tgSendMessage(chatId, "⚠️ عدد معتبر بفرست."); return; }
    db.prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?").run(stock, ref.id);
    await tgSendMessage(chatId, "✅ موجودی شد: <b>" + faNum(stock) + "</b>");
    return;
  }

  // weight
  const wm = text.match(/^(?:وزن|weight)\s+(\S+)\s+([\d۰-۹.,]+)$/i);
  if (wm) {
    const ref = resolveRef(wm[1], "products");
    if (!ref) { await tgSendMessage(chatId, "⚠️ محصول پیدا نشد."); return; }
    const fa = wm[2].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/،/g, ".");
    const weight = parseFloat(fa);
    if (Number.isNaN(weight) || weight < 0) { await tgSendMessage(chatId, "⚠️ عدد معتبر بفرست."); return; }
    db.prepare("UPDATE products SET weight = ?, updated_at = datetime('now') WHERE id = ?").run(weight, ref.id);
    await tgSendMessage(chatId, "✅ وزن شد: <b>" + faNum(weight) + " گرم</b>");
    return;
  }

  // karat
  const km = text.match(/^(?:عیار|karat)\s+(\S+)\s+([\d۰-۹]+)$/i);
  if (km) {
    const ref = resolveRef(km[1], "products");
    if (!ref) { await tgSendMessage(chatId, "⚠️ محصول پیدا نشد."); return; }
    const fa = km[2].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const karat = parseInt(fa, 10);
    if (![14, 18, 21, 24].includes(karat)) { await tgSendMessage(chatId, "⚠️ عیار باید ۱۴، ۱۸، ۲۱ یا ۲۴ باشد."); return; }
    db.prepare("UPDATE products SET karat = ?, updated_at = datetime('now') WHERE id = ?").run(karat, ref.id);
    await tgSendMessage(chatId, "✅ عیار شد: <b>" + faNum(karat) + "</b>");
    return;
  }

  // description
  const dm = text.match(/^(?:توضیح|description|desc)\s+(\S+)\s+([\s\S]+)$/i);
  if (dm) {
    const ref = resolveRef(dm[1], "products");
    if (!ref) { await tgSendMessage(chatId, "⚠️ محصول پیدا نشد."); return; }
    const desc = dm[2].trim().slice(0, 1000);
    db.prepare("UPDATE products SET description = ?, updated_at = datetime('now') WHERE id = ?").run(desc, ref.id);
    await tgSendMessage(chatId, "✅ توضیح ذخیره شد.");
    return;
  }

  await botHandleCatalog3(chatId, text, low);
}

export async function botHandleCatalog3(chatId: number, text: string, low: string): Promise<void> {
  const db = getDb();

  // publish / hide / featured
  const pubM = text.match(/^(?:✅\s*)?(?:نمایش|publish)\s+(\S+)\s*$/i);
  if (pubM) {
    const ref = resolveRef(pubM[1], "products");
    if (!ref) { await tgSendMessage(chatId, "⚠️ محصول پیدا نشد."); return; }
    db.prepare("UPDATE products SET published = 1, updated_at = datetime('now') WHERE id = ?").run(ref.id);
    await tgSendMessage(chatId, "✅ محصول منتشر شد.");
    return;
  }
  const unpubM = text.match(/^(?:🚫\s*)?(?:مخفی|unpublish|hide)\s+(\S+)\s*$/i);
  if (unpubM) {
    const ref = resolveRef(unpubM[1], "products");
    if (!ref) { await tgSendMessage(chatId, "⚠️ محصول پیدا نشد."); return; }
    db.prepare("UPDATE products SET published = 0, updated_at = datetime('now') WHERE id = ?").run(ref.id);
    await tgSendMessage(chatId, "🚫 محصول مخفی شد.");
    return;
  }
  const featM = text.match(/^(?:⭐\s*)?(?:ویژه|featured)\s+(\S+)\s*$/i);
  if (featM) {
    const ref = resolveRef(featM[1], "products");
    if (!ref) { await tgSendMessage(chatId, "⚠️ محصول پیدا نشد."); return; }
    const p = db.prepare("SELECT featured FROM products WHERE id = ?").get(ref.id) as { featured: number } | undefined;
    if (!p) { await tgSendMessage(chatId, "⚠️ محصول پیدا نشد."); return; }
    const next = p.featured ? 0 : 1;
    db.prepare("UPDATE products SET featured = ?, updated_at = datetime('now') WHERE id = ?").run(next, ref.id);
    await tgSendMessage(chatId, next ? "⭐ به ویترین ویژه اضافه شد." : "از ویترین ویژه حذف شد.");
    return;
  }

  // slides on/off/title
  const slOff = text.match(/^(?:اسلاید خاموش|slide off)\s+(\S+)\s*$/i);
  if (slOff) {
    const ref = resolveRef(slOff[1], "hero_slides");
    if (!ref) { await tgSendMessage(chatId, "⚠️ اسلاید پیدا نشد."); return; }
    db.prepare("UPDATE hero_slides SET active = 0 WHERE id = ?").run(ref.id);
    await tgSendMessage(chatId, "⛔ اسلاید خاموش شد.");
    return;
  }
  const slOn = text.match(/^(?:اسلاید روشن|slide on)\s+(\S+)\s*$/i);
  if (slOn) {
    const ref = resolveRef(slOn[1], "hero_slides");
    if (!ref) { await tgSendMessage(chatId, "⚠️ اسلاید پیدا نشد."); return; }
    db.prepare("UPDATE hero_slides SET active = 1 WHERE id = ?").run(ref.id);
    await tgSendMessage(chatId, "✅ اسلاید روشن شد.");
    return;
  }
  const slTitle = text.match(/^(?:اسلاید تیتر|slide title)\s+(\S+)\s+([\s\S]+)$/i);
  if (slTitle) {
    const ref = resolveRef(slTitle[1], "hero_slides");
    if (!ref) { await tgSendMessage(chatId, "⚠️ اسلاید پیدا نشد."); return; }
    const t = slTitle[2].trim().slice(0, 80);
    db.prepare("UPDATE hero_slides SET title1 = ? WHERE id = ?").run(t, ref.id);
    await tgSendMessage(chatId, "✅ تیتر اسلاید شد: «" + escapeHtml(t) + "»");
    return;
  }

  // strip size / speed
  const stM = text.match(/^(?:نوارسایز|stripsize)\s+([\d۰-۹]{1,2})\s*$/i);
  if (stM) {
    const n = parseInt(stM[1].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))), 10);
    if (Number.isNaN(n) || n < 8 || n > 40) { await tgSendMessage(chatId, "⚠️ سایز باید ۸ تا ۴۰ باشد."); return; }
    botSetSettings({ promo_strip_font_size: String(n) });
    await tgSendMessage(chatId, "✅ سایز نوار طلایی شد <b>" + faNum(n) + "px</b>");
    return;
  }
  const spM = text.match(/^(?:نوارسرعت|stripspeed)\s+([\d۰-۹]{1,3})\s*$/i);
  if (spM) {
    const n = parseInt(spM[1].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))), 10);
    if (Number.isNaN(n) || n < 5 || n > 120) { await tgSendMessage(chatId, "⚠️ سرعت باید ۵ تا ۱۲۰ ثانیه باشد. عدد کمتر = سریع‌تر."); return; }
    botSetSettings({ promo_strip_speed: String(n) });
    await tgSendMessage(chatId, "✅ سرعت نوار طلایی شد <b>" + faNum(n) + " ثانیه</b>");
    return;
  }

  await tgSendMessage(chatId, "🤔 نفهمیدم.\n" + BOT_HELP);
}




