import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
function dbPath() {
  const u = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const p = u.replace(/^file:/, "");
  if (path.isAbsolute(p)) return p;
  return path.resolve(path.join(here, ".."), p);
}
const db = new DatabaseSync(dbPath());
function get(k) {
  db.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  const r = db.prepare("SELECT value FROM settings WHERE key=?").get(k);
  return r ? r.value : null;
}
function set(e) {
  for (const k of Object.keys(e)) {
    db.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(k, String(e[k]));
  }
}
function admins() {
  const r = (get("telegram_admin_ids") || process.env.TELEGRAM_ADMIN_IDS || "").trim();
  return r.split(/[,\s]+/).map(s => parseInt(s, 10)).filter(n => !Number.isNaN(n));
}
const TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
if (!TOKEN) { console.error("TELEGRAM_BOT_TOKEN missing"); process.exit(1); }
const call = (m, p) => fetch("https://api.telegram.org/bot" + TOKEN + "/" + m, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }).then(r => r.json());
const send = (c, t) => call("sendMessage", { chat_id: c, text: t, parse_mode: "HTML" }).catch(e => console.error("send", e.message));
const FONTS = ["Vazirmatn", "Amiri", "Lalezar", "Cairo", "Tajawal", "Readex+Pro"];
const FONTS2 = ["Noto+Naskh+Arabic", "Noto+Kufi+Arabic", "IBM+Plex+Sans+Arabic", "Reem+Kufi", "Scheherazade+New", "Lateef"];
const ALL_FONTS = FONTS.concat(FONTS2);
const SECS = ["typo_body", "typo_heading", "typo_product", "typo_price", "typo_nav", "typo_slider"];
const clamp = (v, fb) => { const n = parseInt(String(v || ""), 10); if (Number.isNaN(n)) return fb; return Math.min(200, Math.max(8, n)); };
async function handle(chat, text) {
  text = (text || "").trim();
  if (text.indexOf("/start") === 0) {
    if (!admins().length) {
      const pin = text.replace("/start", "").trim();
      const want = (process.env.TELEGRAM_ADMIN_PIN || "1234").trim();
      if (pin === want) {
        const s = new Set(admins()); s.add(chat);
        set({ telegram_admin_ids: Array.from(s).join(",") });
        await send(chat, "✅ خوش آمدی مدیر! " + HELP);
      } else { await send(chat, "🔐 بفرست: /start PIN"); }
    } else if (admins().indexOf(chat) >= 0) { await send(chat, "سلام مدیر 👋 " + HELP); }
    else { await send(chat, "⛔ دسترسی نداری."); }
    return;
  }
  if (admins().indexOf(chat) < 0) { await send(chat, "⛔ فقط مدیر."); return; }
  if (text === "help" || text === "راهنما" || text === "کمک") { await send(chat, HELP_FA); return; }
  if (text === "وضعیت" || text === "آمار" || text === "stats") {
    const u = db.prepare("SELECT COUNT(*) c FROM users WHERE role='CUSTOMER'").get().c;
    const o = db.prepare("SELECT COUNT(*) c FROM orders").get().c;
    await send(chat, "📊 مشتری:" + u + " سفارش:" + o);
    return;
  }
  if (text === "سفارش‌ها" || text === "سفارشها" || text === "orders") {
    const rows = db.prepare("SELECT total,status FROM orders ORDER BY created_at DESC LIMIT 5").all();
    await send(chat, rows.length ? rows.map((r, i) => (i + 1) + ". " + r.total + " " + r.status).join("\n") : "🧾 سفارشی نیست");
    return;
  }
  if (text === "طلا" || text === "gold") {
    const v = get("gold_manual_price");
    await send(chat, v ? "💰 قیمت: " + Number(v).toLocaleString("fa-IR") : "بفرست: طلا 2450000");
    return;
  }
  let m = text.match(/^(?:طلا|gold)\s+([\d۰-۹,\s]+)$/i);
  if (m) {
    const fa = m[1].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const p = parseInt(fa.replace(/[\s,]/g, ""), 10);
    if (!(p > 0)) { await send(chat, "⚠️ عدد اشتباه"); return; }
    set({ gold_manual_price: String(p) });
    await send(chat, "✅ ثبت شد: " + p.toLocaleString("fa-IR"));
    return;
  }
  m = text.match(/^(?:بنر|banner)\s+([\s\S]+)$/i);
  if (m) { set({ site_announcement: m[1].trim().slice(0, 200) }); await send(chat, "✅ بنر ذخیره شد"); return; }
  if (text === "فونت‌ها" || text === "فونتها" || text === "fonts") { await send(chat, "فونت‌ها: " + ALL_FONTS.join(", ") + " | بخش‌ها: متن عنوان محصول قیمت منو اسلایدر"); return; }
  const FA_SEC = { "متن": "typo_body", "عنوان": "typo_heading", "عناوین": "typo_heading", "محصول": "typo_product", "قیمت": "typo_price", "منو": "typo_nav", "اسلایدر": "typo_slider" };
  const FA_FONT = { "وزیرمتن": "Vazirmatn", "امیری": "Amiri" };
  m = text.match(/^(?:نوارفونت|barfont)\s+(\S+)(?:\s+([\d۰-۹]+))?/i);
  if (m) {
    const fid = FA_FONT[m[1]] || m[1];
    if (ALL_FONTS.indexOf(fid) < 0) { await send(chat, "فونت پیدا نشد"); return; }
    const e = { price_bar_font_id: fid };
    if (m[2]) e.price_bar_font_size = String(clamp(m[2], 12));
    set(e); await send(chat, "✅ فونت نوار ذخیره شد"); return;
  }
  m = text.match(/^(?:سایز|size)\s+(\S+)\s+([\d۰-۹]+)/i);
  if (m) {
    const k = FA_SEC[m[1]] || (m[1].indexOf("typo_") === 0 ? m[1] : "typo_" + m[1]);
    if (SECS.indexOf(k) < 0) { await send(chat, "بخش پیدا نشد"); return; }
    set({ [k + "_size"]: String(clamp(m[2], 14)) }); await send(chat, "✅ سایز ذخیره شد"); return;
  }
  m = text.match(/^(?:فونت|font)\s+(\S+)\s+(\S+)(?:\s+([\d۰-۹]+))?/i);
  if (m) {
    const k = FA_SEC[m[1]] || (m[1].indexOf("typo_") === 0 ? m[1] : "typo_" + m[1]);
    const fid = FA_FONT[m[2]] || m[2];
    if (SECS.indexOf(k) < 0 || ALL_FONTS.indexOf(fid) < 0) { await send(chat, "بخش یا فونت اشتباه"); return; }
    const e = { [k + "_font"]: fid };
    if (m[3]) e[k + "_size"] = String(clamp(m[3], 14));
    set(e); await send(chat, "✅ فونت ذخیره شد"); return;
  }
  // ── Products & slides lists ──
  if (text === "محصولات" || text === "products" || text === "📦 محصولات") {
    const rows = db.prepare("SELECT id, name, price, stock, published, featured FROM products ORDER BY created_at DESC LIMIT 10").all();
    if (!rows.length) { await send(chat, "📦 محصولی نیست"); return; }
    const lines = rows.map((p, i) => (i + 1) + ". " + p.name + "\n   " + Number(p.price).toLocaleString("fa-IR") + " تومان | موجودی " + p.stock + (p.published ? "" : " | 🚫") + (p.featured ? " ⭐" : ""));
    await send(chat, "📦 ۱۰ محصول آخر (شماره برای ویرایش):\n" + lines.join("\n"));
    return;
  }
  if (text === "اسلایدها" || text === "slides" || text === "🖼 اسلایدها") {
    const rows = db.prepare("SELECT id, title1, title2, title3, active, sort_order FROM hero_slides ORDER BY sort_order ASC LIMIT 20").all();
    if (!rows.length) { await send(chat, "🖼 اسلایدی نیست"); return; }
    const lines = rows.map((s, i) => (i + 1) + ". " + [s.title1, s.title2, s.title3].filter(Boolean).join(" ") + (s.active ? " ✅" : " ⛔"));
    await send(chat, "🖼 اسلایدها:\n" + lines.join("\n"));
    return;
  }
  await handleCatalog(chat, text);
}
function faN(n) { return Number(n).toLocaleString("fa-IR"); }
function findRef(ref, table) {
  ref = String(ref).replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  if (/^\d+$/.test(ref)) {
    const idx = parseInt(ref, 10);
    if (idx < 1 || idx > 50) return null;
    const q = table === "products" ? "SELECT id FROM products ORDER BY created_at DESC LIMIT 50" : "SELECT id FROM hero_slides ORDER BY sort_order ASC LIMIT 50";
    const rows = db.prepare(q).all();
    return idx <= rows.length ? rows[idx - 1].id : null;
  }
  if (ref.length >= 4) {
    const rows = db.prepare("SELECT id FROM " + table).all();
    const hit = rows.find(r => r.id.startsWith(ref));
    if (hit) return hit.id;
  }
  return null;
}
async function handleCatalog(chat, text) {
  let m = text.match(/^(?:محصول|product)\s+(\S+)\s*$/i);
  if (m) {
    const id = findRef(m[1], "products");
    if (!id) { await send(chat, "محصول پیدا نشد"); return; }
    const p = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!p) { await send(chat, "محصول پیدا نشد"); return; }
    await send(chat, "📦 " + p.name + "\nقیمت: " + faN(p.price) + "\nوزن: " + faN(p.weight) + " | عیار: " + faN(p.karat) + "\nموجودی: " + faN(p.stock) + (p.published ? " ✅" : " 🚫") + (p.featured ? " ⭐" : ""));
    return;
  }
  m = text.match(/^(?:نام|name)\s+(\S+)\s+([\s\S]+)$/i);
  if (m) { const id = findRef(m[1], "products"); if (!id) { await send(chat, "محصول پیدا نشد"); return; } db.prepare("UPDATE products SET name=?, updated_at=datetime('now') WHERE id=?").run(m[2].trim().slice(0,120), id); await send(chat, "✅ نام ذخیره شد"); return; }
  await handleCatalog2(chat, text);
}
async function handleCatalog2(chat, text) {
  let m = text.match(/^(?:قیمت|price)\s+(\S+)\s+([\d۰-۹,\s]+)$/i);
  if (m) {
    const id = findRef(m[1], "products"); if (!id) { await send(chat, "محصول پیدا نشد"); return; }
    const fa = m[2].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const v = parseFloat(fa.replace(/[\s,]/g, ""));
    if (!(v >= 0)) { await send(chat, "عدد اشتباه"); return; }
    db.prepare("UPDATE products SET price=?, updated_at=datetime('now') WHERE id=?").run(v, id);
    await send(chat, "✅ قیمت شد: " + faN(v) + " تومان"); return;
  }
  m = text.match(/^(?:موجودی|stock)\s+(\S+)\s+([\d۰-۹]+)$/i);
  if (m) {
    const id = findRef(m[1], "products"); if (!id) { await send(chat, "محصول پیدا نشد"); return; }
    const fa = m[2].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const v = parseInt(fa, 10); if (!(v >= 0)) { await send(chat, "عدد اشتباه"); return; }
    db.prepare("UPDATE products SET stock=?, updated_at=datetime('now') WHERE id=?").run(v, id);
    await send(chat, "✅ موجودی شد: " + faN(v)); return;
  }
  m = text.match(/^(?:وزن|weight)\s+(\S+)\s+([\d۰-۹.,]+)$/i);
  if (m) {
    const id = findRef(m[1], "products"); if (!id) { await send(chat, "محصول پیدا نشد"); return; }
    const fa = m[2].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/،/g, ".");
    const v = parseFloat(fa); if (!(v >= 0)) { await send(chat, "عدد اشتباه"); return; }
    db.prepare("UPDATE products SET weight=?, updated_at=datetime('now') WHERE id=?").run(v, id);
    await send(chat, "✅ وزن شد: " + faN(v)); return;
  }
  m = text.match(/^(?:عیار|karat)\s+(\S+)\s+([\d۰-۹]+)$/i);
  if (m) {
    const id = findRef(m[1], "products"); if (!id) { await send(chat, "محصول پیدا نشد"); return; }
    const fa = m[2].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const v = parseInt(fa, 10);
    if ([14,18,21,24].indexOf(v) < 0) { await send(chat, "عیار باید ۱۴ ۱۸ ۲۱ ۲۴"); return; }
    db.prepare("UPDATE products SET karat=?, updated_at=datetime('now') WHERE id=?").run(v, id);
    await send(chat, "✅ عیار شد: " + faN(v)); return;
  }
  await handleCatalog3(chat, text);
}
async function handleCatalog3(chat, text) {
  let m = text.match(/^(?:توضیح|desc|description)\s+(\S+)\s+([\s\S]+)$/i);
  if (m) { const id = findRef(m[1], "products"); if (!id) { await send(chat, "محصول پیدا نشد"); return; } db.prepare("UPDATE products SET description=?, updated_at=datetime('now') WHERE id=?").run(m[2].trim().slice(0,1000), id); await send(chat, "✅ توضیح ذخیره شد"); return; }
  m = text.match(/^(?:نمایش|publish)\s+(\S+)\s*$/i);
  if (m) { const id = findRef(m[1], "products"); if (!id) { await send(chat, "محصول پیدا نشد"); return; } db.prepare("UPDATE products SET published=1, updated_at=datetime('now') WHERE id=?").run(id); await send(chat, "✅ منتشر شد"); return; }
  m = text.match(/^(?:مخفی|hide|unpublish)\s+(\S+)\s*$/i);
  if (m) { const id = findRef(m[1], "products"); if (!id) { await send(chat, "محصول پیدا نشد"); return; } db.prepare("UPDATE products SET published=0, updated_at=datetime('now') WHERE id=?").run(id); await send(chat, "🚫 مخفی شد"); return; }
  m = text.match(/^(?:ویژه|featured)\s+(\S+)\s*$/i);
  if (m) {
    const id = findRef(m[1], "products"); if (!id) { await send(chat, "محصول پیدا نشد"); return; }
    const p = db.prepare("SELECT featured FROM products WHERE id=?").get(id);
    if (!p) { await send(chat, "محصول پیدا نشد"); return; }
    const nx = p.featured ? 0 : 1;
    db.prepare("UPDATE products SET featured=?, updated_at=datetime('now') WHERE id=?").run(nx, id);
    await send(chat, nx ? "⭐ ویژه شد" : "از ویژه حذف شد"); return;
  }
  m = text.match(/^اسلاید خاموش\s+(\S+)\s*$/i) || text.match(/^slide off\s+(\S+)\s*$/i);
  if (m) { const id = findRef(m[1], "hero_slides"); if (!id) { await send(chat, "اسلاید پیدا نشد"); return; } db.prepare("UPDATE hero_slides SET active=0 WHERE id=?").run(id); await send(chat, "⛔ خاموش شد"); return; }
  m = text.match(/^اسلاید روشن\s+(\S+)\s*$/i) || text.match(/^slide on\s+(\S+)\s*$/i);
  if (m) { const id = findRef(m[1], "hero_slides"); if (!id) { await send(chat, "اسلاید پیدا نشد"); return; } db.prepare("UPDATE hero_slides SET active=1 WHERE id=?").run(id); await send(chat, "✅ روشن شد"); return; }
  m = text.match(/^اسلاید تیتر\s+(\S+)\s+([\s\S]+)$/i) || text.match(/^slide title\s+(\S+)\s+([\s\S]+)$/i);
  if (m) { const id = findRef(m[1], "hero_slides"); if (!id) { await send(chat, "اسلاید پیدا نشد"); return; } db.prepare("UPDATE hero_slides SET title1=? WHERE id=?").run(m[2].trim().slice(0,80), id); await send(chat, "✅ تیتر ذخیره شد"); return; }
  m = text.match(/^(?:نوارسایز|stripsize)\s+([\d۰-۹]{1,2})\s*$/i);
  if (m) {
    const n = parseInt(m[1].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))), 10);
    if (!(n >= 8 && n <= 40)) { await send(chat, "سایز باید ۸ تا ۴۰ باشد"); return; }
    set({ promo_strip_font_size: String(n) }); await send(chat, "✅ سایز نوار: " + n); return;
  }
  m = text.match(/^(?:نوارسرعت|stripspeed)\s+([\d۰-۹]{1,3})\s*$/i);
  if (m) {
    const n = parseInt(m[1].replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))), 10);
    if (!(n >= 5 && n <= 120)) { await send(chat, "سرعت باید ۵ تا ۱۲۰ ثانیه (کمتر = سریع‌تر)"); return; }
    set({ promo_strip_speed: String(n) }); await send(chat, "✅ سرعت نوار: " + n + " ثانیه"); return;
  }
  await send(chat, HELP_FA);
}
const HELP_FA = "راهنما:\nوضعیت | سفارش‌ها | طلا [قیمت] | بنر <متن> | فونت‌ها | فونت <بخش> <فونت> [سایز] | سایز <بخش> <عدد> | نوارفونت <فونت> [سایز]\n\n📦 محصولات — لیست\nمحصول <شماره> — جزئیات\nنام/قیمت/موجودی/وزن/عیار/توضیح <شماره> <مقدار>\nنمایش/مخفی/ویژه <شماره>\n\n🖼 اسلایدها — لیست\nاسلاید روشن/خاموش <شماره>\nاسلاید تیتر <شماره> <متن>";
const HELP = HELP_FA;
let offset;
console.log("Bot polling...");
for (;;) {
  try {
    const body = { timeout: 25, allowed_updates: ["message"] };
    if (offset !== undefined) body.offset = offset;
    const res = await fetch("https://api.telegram.org/bot" + TOKEN + "/getUpdates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
    const list = res.result || [];
    for (let i = 0; i < list.length; i++) {
      const u = list[i];
      offset = u.update_id + 1;
      if (u.message && u.message.chat && u.message.text) await handle(u.message.chat.id, u.message.text);
    }
  } catch (e) { console.error("poll", e.message); await new Promise(r => setTimeout(r, 3000)); }
}



