# Delly Gold — فروشگاه طلا و جواهرات

فروشگاه آنلاین طلا با Next.js 16، پنل مدیریت، بکند کامل، و پایگاه داده SQLite.

---

## 🐳 اجرا با Docker (توصیه شده)

### پیش‌نیاز
- Docker + Docker Compose

### اجرای سریع — یک دستور

**اگر Docker Compose v2 دارید (جدید):**
```bash
docker compose up -d
```

**اگر Docker Compose v1 دارید (قدیمی‌تر):**
```bash
docker-compose up -d
```

**یا از Makefile استفاده کنید (هر دو نسخه را پشتیبانی می‌کند):**
```bash
make up
```

این دستور:
1. ایمیج را می‌سازد
2. پایگاه داده را می‌سازد و seed می‌کند
3. سرور را روی پورت 3000 اجرا می‌کند

### دستورات مفید
```bash
make up       # build + start در پس‌زمینه
make down     # متوقف کردن
make logs     # مشاهده لاگ‌ها
make restart  # ری‌استارت
make rebuild  # rebuild کامل (بعد از تغییر کد)
make shell    # ورود به shell کانتینر
make status   # وضعیت کانتینر
```

### تنظیمات محیط (اختیاری)
```bash
cp .env.production.example .env
# ویرایش .env و تنظیم JWT_SECRET
make up
```

---

## 💻 اجرای محلی (بدون Docker)

### ۱. نصب وابستگی‌ها
```bash
npm install
```

### ۲. ساخت پایگاه داده + seed
```bash
npm run db:setup
```

### ۳. اجرا
```bash
npm run dev
```

---

## آدرس‌ها

| صفحه | آدرس |
|------|------|
| صفحه اصلی | http://localhost:3000 |
| محصولات | http://localhost:3000/products |
| کالکشن‌ها | http://localhost:3000/collections |
| ویترین‌ها | http://localhost:3000/showcase |
| درباره ما | http://localhost:3000/about |
| تماس با ما | http://localhost:3000/contact |
| پنل مدیریت | http://localhost:3000/admin |

### ورود پنل مدیریت
- **ایمیل:** `admin@dellygold.com`
- **رمز:** `Admin@1234`

---

## API Routes

| Method | Route | توضیح |
|--------|-------|-------|
| POST | `/api/auth/login` | ورود |
| POST | `/api/auth/register` | ثبت‌نام |
| POST | `/api/auth/logout` | خروج |
| GET | `/api/auth/me` | اطلاعات کاربر جاری |
| GET | `/api/products` | لیست محصولات |
| GET | `/api/products/:id` | جزئیات محصول |
| POST | `/api/products` | ایجاد محصول (ادمین) |
| PUT | `/api/products/:id` | ویرایش محصول (ادمین) |
| DELETE | `/api/products/:id` | حذف محصول (ادمین) |
| GET | `/api/categories` | لیست دسته‌بندی‌ها |
| POST | `/api/categories` | ایجاد دسته‌بندی (ادمین) |
| GET | `/api/orders` | سفارش‌ها |
| POST | `/api/orders` | ثبت سفارش (کاربر) |
| PATCH | `/api/orders/:id` | تغییر وضعیت (ادمین) |
| GET | `/api/admin/stats` | آمار داشبورد (ادمین) |
| GET | `/api/admin/users` | لیست کاربران (ادمین) |

---

## ساختار Docker

```
Dockerfile          ← Multi-stage build (deps → builder → runner)
docker-compose.yml  ← Single command orchestration
docker-entrypoint.sh← DB setup + start server
.dockerignore       ← Excludes node_modules, .next, .env, *.db
.env.production.example ← Template for production secrets
```

**Data dir (bind mount):** host `./data` → `/app/data` (automatic — no config needed)  
`make up` / `scripts/docker-up.sh` run `scripts/ensure-data.sh`, which:
1. Creates `./data/uploads` on the host
2. If that folder has no DB yet, copies from the old Docker volume `*delly-gold-db*` once

---

## ساختار پروژه

```
src/
├── app/
│   ├── (pages)/          ← /, /products, /collections, /showcase, /about, /contact
│   ├── api/              ← REST API routes
│   ├── admin/            ← پنل مدیریت
│   └── components/       ← کامپوننت‌های مشترک
├── lib/
│   ├── db.ts             ← لایه دیتابیس (Node SQLite)
│   ├── auth.ts           ← احراز هویت
│   ├── jwt.ts            ← JWT helpers
│   ├── password.ts       ← bcrypt helpers
│   └── response.ts       ← پاسخ‌های استاندارد API
└── proxy.ts              ← محافظت از مسیرها

scripts/
└── setup-db.mjs          ← migration + seed (idempotent)

prisma/
└── schema.prisma         ← DB schema reference
```

---

## امنیت

- رمزهای عبور با bcrypt 12 rounds
- JWT در کوکی httpOnly + SameSite=Strict
- بررسی نقش ADMIN روی همه API های حساس
- جلوگیری از timing attack در login
- اعتبارسنجی ورودی در همه route ها
- Container به عنوان user غیر root اجرا می‌شود


فروشگاه آنلاین طلا با Next.js 16، پنل مدیریت، بکند کامل، و پایگاه داده SQLite.

---

## راه‌اندازی سریع

### ۱. نصب وابستگی‌ها
```bash
npm install
```

### ۲. ساخت پایگاه داده + seed
```bash
npm run db:setup
```

### ۳. اجرا
```bash
npm run dev
```

---

## آدرس‌ها

| صفحه | آدرس |
|------|------|
| صفحه اصلی | http://localhost:3000 |
| پنل مدیریت | http://localhost:3000/admin |

### ورود پنل مدیریت
- **ایمیل:** `admin@dellygold.com`
- **رمز:** `Admin@1234`

---

## API Routes

| Method | Route | توضیح |
|--------|-------|-------|
| POST | `/api/auth/login` | ورود |
| POST | `/api/auth/register` | ثبت‌نام |
| POST | `/api/auth/logout` | خروج |
| GET | `/api/auth/me` | اطلاعات کاربر جاری |
| GET | `/api/products` | لیست محصولات |
| GET | `/api/products/:id` | جزئیات محصول |
| POST | `/api/products` | ایجاد محصول (ادمین) |
| PUT | `/api/products/:id` | ویرایش محصول (ادمین) |
| DELETE | `/api/products/:id` | حذف محصول (ادمین) |
| GET | `/api/categories` | لیست دسته‌بندی‌ها |
| POST | `/api/categories` | ایجاد دسته‌بندی (ادمین) |
| GET | `/api/orders` | سفارش‌ها |
| POST | `/api/orders` | ثبت سفارش (کاربر) |
| PATCH | `/api/orders/:id` | تغییر وضعیت (ادمین) |
| GET | `/api/admin/stats` | آمار داشبورد (ادمین) |
| GET | `/api/admin/users` | لیست کاربران (ادمین) |

---

## ساختار پروژه

```
src/
├── app/
│   ├── api/              ← REST API routes
│   │   ├── auth/         ← login, register, logout, me
│   │   ├── products/     ← CRUD
│   │   ├── categories/   ← CRUD
│   │   ├── orders/       ← create & manage
│   │   └── admin/        ← stats, users
│   ├── admin/            ← پنل مدیریت
│   │   ├── login/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── users/
│   │   └── categories/
│   └── components/       ← کامپوننت‌های فرانت
├── lib/
│   ├── db.ts             ← لایه دیتابیس (Node SQLite)
│   ├── auth.ts           ← احراز هویت
│   ├── jwt.ts            ← JWT helpers
│   ├── password.ts       ← bcrypt helpers
│   └── response.ts       ← پاسخ‌های استاندارد API
└── proxy.ts              ← محافظت از مسیرها (Next.js middleware)

prisma/
└── dev.db                ← SQLite database

scripts/
└── setup-db.mjs          ← migration + seed
```

---

## امنیت

- رمزهای عبور با bcrypt (12 rounds) هش می‌شوند
- احراز هویت با JWT در کوکی httpOnly (SameSite=Strict)
- مسیرهای `/admin` با proxy محافظت می‌شوند
- بررسی نقش ADMIN برای تمام عملیات حساس
- جلوگیری از timing attack در ورود
- اعتبارسنجی ورودی در تمام API‌ها
