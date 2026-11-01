"use client";
import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react";
import { Heart, Search, X, ShoppingCart, Check, SlidersHorizontal, ChevronLeft, ChevronRight, Coins, FolderTree, LayoutGrid, List } from "lucide-react";
import PageLayout from "../components/PageLayout";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCart } from "../components/CartContext";
import ProductVideoPreview from "../components/ProductVideoPreview";
import { calcFinalPrice } from "@/lib/pricing";
import { firstMedia } from "@/lib/media";

interface Category { id: string; name: string; slug: string; parent_id?: string | null; parent_name?: string | null; child_count?: number; product_count?: number; }
interface Product {
  id: string; name: string; slug: string; price: number; weight: number;
  karat: number; stock: number; images: string; videos: string; featured: number;
  category_name: string;
  ajrat_override: number; ajrat_percent: number | null; ajrat_fixed: number | null;
}
interface Settings { gold_markup_percent: string; gold_fixed_fee: string; }

const sortOptions = [
  { value: "newest",     label: "جدیدترین" },
  { value: "price_asc",  label: "ارزان‌ترین" },
  { value: "price_desc", label: "گران‌ترین" },
];

const goldImages = [
  "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80",
  "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80",
  "https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=400&q=80",
  "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=400&q=80",
  "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80",
  "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80",
];

function getImg(images: string, i: number) {
  try { const a = JSON.parse(images); if (a[0]) return a[0]; } catch {}
  return goldImages[i % goldImages.length];
}

/** Row style inside the category dropdown (active state gets the gold accent). */
function catOptionStyle(active: boolean, hasKids = false): React.CSSProperties {
  return {
    width: "100%", display: "flex", alignItems: "center", gap: 8,
    textAlign: "right", padding: "9px 12px", border: "none", cursor: "pointer",
    fontSize: 13, fontFamily: "inherit", background: "none",
    color: active ? "var(--dg-primary)" : "var(--dg-ink-2)", fontWeight: active ? 700 : hasKids ? 600 : 400,
    backgroundColor: active ? "var(--dg-primary-soft)" : "transparent",
    borderRadius: 12, marginBottom: 2,
  };
}

interface CategoryTreeProps {
  nodes: Category[];
  childMap: Map<string, Category[]>;
  counts: Map<string, number>;
  expanded: Set<string>;
  selected: string;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

/**
 * «منو و زیرمنو» tree — parents with a chevron, children indented under a
 * guide line. Recurses so any nesting depth renders correctly.
 */
function CategoryTree({ nodes, childMap, counts, expanded, selected, onSelect, onToggle }: CategoryTreeProps) {
  return (
    <>
      {nodes.map(cat => {
        const kids = childMap.get(cat.id) ?? [];
        const isOpen = expanded.has(cat.id);
        const isActive = selected === cat.id || selected === cat.slug;
        const count = counts.get(cat.id) ?? 0;
        return (
          <div key={cat.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {kids.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onToggle(cat.id)}
                  aria-label={isOpen ? `بستن ${cat.name}` : `باز کردن ${cat.name}`}
                  aria-expanded={isOpen}
                  className="cat-twisty"
                  style={{
                    width: 22, height: 22, flexShrink: 0, display: "inline-flex",
                    alignItems: "center", justifyContent: "center", border: "none",
                    background: "none", cursor: "pointer", color: "var(--dg-faint)", borderRadius: 10,
                  }}
                >
                  <ChevronRight
                    size={14}
                    style={{ transform: isOpen ? "rotate(-90deg)" : "none", transition: "transform .15s" }}
                  />
                </button>
              ) : (
                <span style={{ width: 22, flexShrink: 0 }} />
              )}

              <button
                type="button"
                onClick={() => onSelect(cat.id)}
                className="cat-option"
                style={catOptionStyle(isActive, kids.length > 0)}
              >
                {kids.length > 0 && <FolderTree size={13} color={isActive ? "var(--dg-primary)" : "var(--dg-faint)"} style={{ flexShrink: 0 }} />}
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cat.name}
                </span>
                {count > 0 && (
                  <span style={{ fontSize: 10, color: "var(--dg-faint)", flexShrink: 0 }}>
                    {count.toLocaleString("fa-IR")}
                  </span>
                )}
                {isActive && <Check size={14} style={{ flexShrink: 0 }} />}
              </button>
            </div>

            {kids.length > 0 && isOpen && (
              <div
                className="cat-branch"
                style={{
                  marginRight: 21, paddingRight: 6,
                  borderRight: "1px dashed #e2e2e2",
                }}
              >
                <CategoryTree
                  nodes={kids}
                  childMap={childMap}
                  counts={counts}
                  expanded={expanded}
                  selected={selected}
                  onSelect={onSelect}
                  onToggle={onToggle}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function ProductsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts]     = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings]     = useState<Settings>({ gold_markup_percent: "5", gold_fixed_fee: "0" });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState(searchParams.get("search") || "");
  const [selectedCat, setSelectedCat] = useState(searchParams.get("category") || "");
  const lowWage = searchParams.get("lowWage") === "true";
  const coin = searchParams.get("coin") === "true";
  const express = searchParams.get("express") === "true";
  const featured = searchParams.get("featured") === "true";
  const discount = searchParams.get("discount") === "true";
  const [sort, setSort]             = useState("newest");
  const [liked, setLiked]           = useState<Set<string>>(new Set());
  const [addedId, setAddedId]       = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [view, setView]             = useState<"grid" | "list">("grid");
  const [drawerQuery, setDrawerQuery] = useState("");
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage]             = useState(1);
  const { add, items } = useCart();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "16", page: String(page) });
    if (search) params.set("search", search);
    if (selectedCat) params.set("category", selectedCat);
    if (lowWage) params.set("lowWage", "true");
    if (coin) params.set("coin", "true");
    if (express) params.set("express", "true");
    if (featured) params.set("featured", "true");
    if (discount) params.set("discount", "true");
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    if (data.success) {
      let rows: Product[] = data.data.products;
      if (sort === "price_asc")  rows = [...rows].sort((a, b) => a.price - b.price);
      if (sort === "price_desc") rows = [...rows].sort((a, b) => b.price - a.price);
      setProducts(rows);
      setPagination(data.data.pagination);
    }
    setLoading(false);
  }, [search, selectedCat, sort, page, lowWage, coin, express, featured, discount]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  /**
   * The top menu / footer link to `/products?category=…` and `/products?search=…`.
   * On a same-route navigation Next.js keeps this component mounted, so the
   * useState initialisers above never re-run — read the URL whenever it changes.
   * The ref guard makes sure we only react to a real URL change, so a category
   * picked from the tab row (which updates state only) is never overwritten.
   */
  const urlFilterKey = useRef<string | null>(null);
  useEffect(() => {
    const key = ["search", "category", "lowWage", "coin", "express", "featured", "discount"]
      .map(k => searchParams.get(k) ?? "")
      .join("\u0000");
    if (urlFilterKey.current === key) return;
    urlFilterKey.current = key;
    setSearch(searchParams.get("search") || "");
    setSelectedCat(searchParams.get("category") || "");
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(d => { if (d.success) setCategories(d.data); });
    fetch("/api/admin/settings").then(r => r.json()).then(d => { if (d.success) setSettings(d.data); });
  }, []);

  // Close the tree on Escape (drawer is dismissible with the X / backdrop too)
  useEffect(() => {
    if (!showFilter) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowFilter(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showFilter]);

  /** Type-ahead over the catalog — keeps 100+ categories navigable. */
  function matchCats(list: Category[], q: string): Category[] {
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(c =>
      c.name.toLowerCase().includes(needle) || (c.slug || "").toLowerCase().includes(needle)
    );
  }
  const drawerCats = matchCats(categories, drawerQuery);

  /** Children keyed by parent id — the source for the tree. */
  const childMap = useMemo(() => {
    const m = new Map<string, Category[]>();
    for (const c of categories) {
      if (!c.parent_id) continue;
      const arr = m.get(c.parent_id);
      if (arr) arr.push(c);
      else m.set(c.parent_id, [c]);
    }
    return m;
  }, [categories]);

  /** Top-level rows; an orphan (missing parent) is promoted to the root. */
  const rootCats = useMemo(() => {
    const ids = new Set(categories.map(c => c.id));
    return categories.filter(c => !c.parent_id || !ids.has(c.parent_id));
  }, [categories]);

  /** Product count per category, rolled up over its sub-categories. */
  const catCounts = useMemo(() => {
    const own = new Map<string, number>();
    for (const c of categories) own.set(c.id, c.product_count ?? 0);
    const rolled = new Map(own);
    // Deepest first so a parent sums the already-rolled children.
    const depth = (id: string, guard = 0): number => {
      if (guard > 20) return 0;
      const c = categories.find(x => x.id === id);
      if (!c?.parent_id) return 0;
      return 1 + depth(c.parent_id, guard + 1);
    };
    const sorted = [...categories].sort((a, b) => depth(b.id) - depth(a.id));
    for (const c of sorted) {
      if (!c.parent_id) continue;
      rolled.set(c.parent_id, (rolled.get(c.parent_id) ?? 0) + (own.get(c.id) ?? 0));
    }
    return rolled;
  }, [categories]);

  // Open every ancestor of the active category so it stays visible.
  useEffect(() => {
    if (!selectedCat || categories.length === 0) return;
    const byId = new Map(categories.map(c => [c.id, c]));
    const active = byId.get(selectedCat) ?? categories.find(c => c.slug === selectedCat);
    if (!active?.parent_id) return;
    const next = new Set(expanded);
    let cursor: Category | undefined = active;
    let guard = 0;
    while (cursor?.parent_id && guard++ < 20) {
      next.add(cursor.parent_id);
      cursor = byId.get(cursor.parent_id);
    }
    setExpanded(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCat, categories]);

  const toggleCat = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pickCat = (id: string, close?: () => void) => {
    setSelectedCat(id);
    setPage(1);
    close?.();
  };

  function toggleLike(id: string) {
    setLiked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function handleAdd(p: Product, img: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (p.stock === 0) return;
    const { finalPrice } = calcFinalPrice(p, settings);
    add({ productId: p.id, name: p.name, price: finalPrice, weight: p.weight, karat: p.karat, image: img, stock: p.stock });
    setAddedId(p.id);
    setTimeout(() => setAddedId(cur => cur === p.id ? null : cur), 1800);
  }

  const activeCatName = coin
    ? "سکه و آبشده"
    : lowWage
    ? "محصولات کم اُجرت"
    : express
    ? "ارسال فوری"
    : featured
    ? "پیشنهادهای ویژه"
    : discount
    ? "تخفیف‌دار"
    : selectedCat
      ? categories.find(c => c.id === selectedCat || c.slug === selectedCat)?.name || "محصولات"
      : "همه محصولات";

  const catList = (close?: () => void) => (
    <>
      {categories.length > 6 && (
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--dg-faint)" }} />
          <input
            value={drawerQuery}
            onChange={e => setDrawerQuery(e.target.value)}
            placeholder="جستجوی دسته‌بندی…"
            style={{
              width: "100%", boxSizing: "border-box", border: "1px solid var(--dg-line)", borderRadius: 12,
              padding: "9px 28px 9px 10px", fontSize: 12.5, outline: "none", fontFamily: "inherit",
              color: "var(--dg-ink-2)", background: "var(--dg-bg-2)",
            }}
          />
        </div>
      )}
      <button onClick={() => pickCat("", close)} style={catOptionStyle(selectedCat === "")}>
        <FolderTree size={13} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>همه محصولات</span>
        {selectedCat === "" && <Check size={14} />}
      </button>
      {drawerQuery.trim() ? (
        drawerCats.map(c => {
          const isActive = selectedCat === c.id || selectedCat === c.slug;
          return (
            <button key={c.id} onClick={() => pickCat(c.id, close)} style={catOptionStyle(isActive)}>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.name}
                {c.parent_name && <span style={{ color: "var(--dg-faint)", fontSize: 11 }}> · {c.parent_name}</span>}
              </span>
              {isActive && <Check size={14} />}
            </button>
          );
        })
      ) : (
        <CategoryTree
          nodes={rootCats}
          childMap={childMap}
          counts={catCounts}
          expanded={expanded}
          selected={selectedCat}
          onSelect={id => pickCat(id, close)}
          onToggle={toggleCat}
        />
      )}
      {drawerCats.length === 0 && !drawerQuery.trim() && (
        <p style={{ color: "var(--dg-faint)", fontSize: 12, textAlign: "center", padding: "16px 0" }}>دسته‌بندی یافت نشد</p>
      )}
    </>
  );

  return (
    <PageLayout>
      <div className="pl-shell">
        {/* ── Sidebar (desktop) ── */}
        <aside className="pl-side">
          <div className="pl-side-card">
            <div className="pl-side-title">جستجو</div>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--dg-faint)" }} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="نام محصول…" className="pl-input" />
              {search && <button onClick={() => { setSearch(""); setPage(1); }} className="pl-clear"><X size={12} /></button>}
            </div>
          </div>
          <div className="pl-side-card">
            <div className="pl-side-title">مرتب‌سازی</div>
            <div className="pl-seg">
              {sortOptions.map(o => (
                <button key={o.value} onClick={() => { setSort(o.value); setPage(1); }} className={sort === o.value ? "on" : ""}>{o.label}</button>
              ))}
            </div>
          </div>
          <div className="pl-side-card pl-side-cats">
            <div className="pl-side-title">دسته‌بندی‌ها <span>{categories.length.toLocaleString("fa-IR")}</span></div>
            {catList()}
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className="pl-main">
          <div className="pl-head">
            <div>
              <div className="pl-crumb">
                <Link href="/">خانه</Link>
                <span>◆</span>
                <b>{activeCatName}</b>
              </div>
              <h1>{coin && <Coins size={22} style={{ color: "var(--dg-gold)" }} />}{activeCatName}</h1>
              {coin && <p className="pl-sub">خرید سکه و طلای آبشده بر اساس قیمت لحظه‌ای طلا</p>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative", zIndex: 1 }}>
              <div className="pl-view">
                <button onClick={() => setView("grid")} className={view === "grid" ? "on" : ""} aria-label="نمای شبکه‌ای"><LayoutGrid size={16} /></button>
                <button onClick={() => setView("list")} className={view === "list" ? "on" : ""} aria-label="نمای فهرستی"><List size={16} /></button>
              </div>
              <div className="pl-count"><b>{pagination.total.toLocaleString("fa-IR")}</b> محصول</div>
            </div>
          </div>

          {/* Mobile controls */}
          <div className="pl-mobile-bar">
            <button onClick={() => setShowFilter(true)} className="pl-mbtn"><SlidersHorizontal size={14} /> فیلتر</button>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--dg-faint)" }} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="جستجو..." className="pl-input" />
            </div>
            <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} className="pl-mbtn">
              {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

        {/* ── Product grid ── */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }} className="prod-grid prod-skeleton">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ backgroundColor: "var(--dg-surface)", borderRadius: "var(--dg-radius)", height: "340px", border: "1px solid var(--dg-line)", animation: "shimmer 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
            <p style={{ color: "var(--dg-muted)", fontSize: "16px" }}>محصولی یافت نشد</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }} className={`prod-grid${view === "list" ? " prod-list" : ""}`}>
            {products.map((p, i) => {
              const img = getImg(p.images, i);
              const vid = firstMedia(p.videos);
              const { finalPrice } = calcFinalPrice(p, settings);
              const isLiked = liked.has(p.id);
              const inCart  = items.some(it => it.productId === p.id);
              const isAdded = addedId === p.id;
              const oos     = p.stock === 0;
              const code    = `#${p.id.slice(0, 4).toUpperCase()}`;
              // Fake discount for display (could be real if product has markup override)
              const hasDiscount = p.ajrat_override === 1 && p.ajrat_percent !== null && p.ajrat_percent < 5;
              const discountPct = hasDiscount ? Math.round(5 - (p.ajrat_percent ?? 0)) * 2 : 0;

              return (
                <div key={p.id} className="dg-card">
                  <Link href={`/products/${p.slug}`} className="dg-card-media prod-card-media" style={{ textDecoration: "none" }}>
                    <img src={img} alt={p.name} style={{ filter: oos ? "grayscale(1) opacity(0.4)" : "none" }} />
                    {vid && <ProductVideoPreview src={vid} fit="contain" />}
                    {(discountPct > 0 || p.featured === 1) && (
                      <span className="dg-card-badge" style={{ background: "#e11d48", direction: "ltr" }}>
                        {p.featured === 1 ? "10%" : `${discountPct}%`} OFF
                      </span>
                    )}
                    {oos && <span className="dg-card-badge muted" style={{ top: (discountPct > 0 || p.featured === 1) ? "36px" : "8px" }}>ناموجود</span>}
                  </Link>
                  <button onClick={e => { e.preventDefault(); e.stopPropagation(); toggleLike(p.id); }} aria-label="علاقه‌مندی"
                    className={`dg-card-wish${isLiked ? " on" : ""}`}>
                    <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
                  </button>

                  <div className="dg-card-body">
                    <div className="dg-card-meta">
                      <span>{p.weight} gr · {p.karat}K</span>
                      <span>{code}</span>
                    </div>
                    <Link href={`/products/${p.slug}`} className="dg-card-name product-name">{p.name}</Link>
                    <div className="dg-card-foot">
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        {p.price > 0 && finalPrice !== p.price && (
                          <span style={{ color: "var(--dg-faint)", fontSize: "11px", textDecoration: "line-through" }}>{p.price.toLocaleString("fa-IR")}</span>
                        )}
                        <div className="dg-card-price">
                          {finalPrice > 0
                            ? <><b className="price-value">{finalPrice.toLocaleString("fa-IR")}</b><small>تومان</small></>
                            : <small>تماس بگیرید</small>}
                        </div>
                      </div>
                      <button onClick={e => handleAdd(p, img, e)} disabled={oos} aria-label="افزودن به سبد"
                        title={inCart ? "در سبد خرید" : "افزودن به سبد"}
                        className={`dg-card-cart${isAdded ? " added" : ""}`}>
                        {isAdded ? <Check size={16} /> : <ShoppingCart size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginTop: "36px" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--dg-line)", backgroundColor: "var(--dg-bg)", color: page === 1 ? "var(--dg-line-strong)" : "var(--dg-ink-2)", cursor: page === 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(pagination.pages, 7) }).map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${page === i + 1 ? "var(--dg-primary)" : "var(--dg-line)"}`, backgroundColor: page === i + 1 ? "var(--dg-primary)" : "#fff", color: page === i + 1 ? "#fff" : "var(--dg-ink-2)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
              style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--dg-line)", backgroundColor: "var(--dg-bg)", color: page === pagination.pages ? "var(--dg-line-strong)" : "var(--dg-ink-2)", cursor: page === pagination.pages ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(180deg)" }}>
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Filter drawer */}
      {showFilter && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(10,35,29,0.45)", backdropFilter: "blur(3px)" }} onClick={() => setShowFilter(false)} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 300, backgroundColor: "#fff", padding: 22, overflowY: "auto", borderTopLeftRadius: 24, borderBottomLeftRadius: 24, boxShadow: "var(--dg-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: "var(--dg-ink)", fontSize: 16, fontWeight: 700 }}>فیلتر محصولات</h3>
              <button onClick={() => setShowFilter(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dg-muted)" }}><X size={18} /></button>
            </div>
            <div style={{ maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
              {catList(() => setShowFilter(false))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0%,100%{opacity:0.5} 50%{opacity:0.8} }
        .pl-shell { max-width: 1280px; margin: 0 auto; padding: 24px 16px 40px; display: grid; grid-template-columns: 280px minmax(0,1fr); gap: 24px; align-items: start; }
        .pl-side { position: sticky; top: 150px; display: flex; flex-direction: column; gap: 12px; max-height: calc(100vh - 170px); }
        .pl-side-card { background: #fff; border: 1px solid var(--dg-line); border-radius: 20px; padding: 16px; box-shadow: var(--dg-shadow-sm); }
        .pl-side-cats { overflow-y: auto; min-height: 0; flex: 1; }
        .pl-side-title { font-size: 13px; font-weight: 800; color: var(--dg-ink); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
        .pl-side-title span { font-size: 11px; font-weight: 700; color: var(--dg-gold-deep); background: var(--dg-gold-soft); padding: 2px 8px; border-radius: 999px; }
        .pl-input { width: 100%; box-sizing: border-box; border: 1px solid var(--dg-line); border-radius: 12px; padding: 10px 34px 10px 12px; font-size: 13px; outline: none; color: var(--dg-ink-2); background: var(--dg-bg); font-family: inherit; }
        .pl-input:focus { border-color: var(--dg-primary); background: #fff; }
        .pl-clear { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--dg-faint); cursor: pointer; }
        .pl-seg { display: grid; grid-template-columns: repeat(3,1fr); gap: 4px; background: var(--dg-bg-2); padding: 4px; border-radius: 12px; }
        .pl-seg button { border: none; background: transparent; padding: 8px 4px; border-radius: 9px; font-size: 12px; font-family: inherit; color: var(--dg-ink-2); cursor: pointer; font-weight: 600; }
        .pl-seg button.on { background: #fff; color: var(--dg-primary); box-shadow: var(--dg-shadow-sm); font-weight: 800; }
        .pl-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 22px 26px; margin-bottom: 18px; border-radius: 24px; background: radial-gradient(120% 160% at 100% 0%, #17765a 0%, var(--dg-primary) 45%, var(--dg-primary-deep) 100%); position: relative; overflow: hidden; }
        .pl-head::after { content: ""; position: absolute; left: -40px; top: -60px; width: 200px; height: 200px; border-radius: 50%; border: 2px solid rgba(198,161,91,.35); }
        .pl-head h1 { color: #fff; font-size: 26px; font-weight: 900; margin: 6px 0 0; display: flex; align-items: center; gap: 10px; }
        .pl-sub { color: rgba(255,255,255,.7); font-size: 12px; margin: 6px 0 0; }
        .pl-crumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(255,255,255,.6); }
        .pl-crumb a { color: rgba(255,255,255,.6); text-decoration: none; }
        .pl-crumb span { color: var(--dg-gold); font-size: 8px; }
        .pl-crumb b { color: #fff; font-weight: 600; }
        .pl-count { position: relative; z-index: 1; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); color: rgba(255,255,255,.8); border-radius: 14px; padding: 8px 14px; font-size: 12px; white-space: nowrap; }
        .pl-count b { color: var(--dg-gold); font-size: 18px; font-weight: 900; margin-left: 4px; }
        .pl-mobile-bar { display: none; gap: 8px; margin-bottom: 14px; }
        .pl-mbtn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--dg-line); background: #fff; border-radius: 12px; padding: 9px 12px; font-size: 12.5px; font-family: inherit; color: var(--dg-ink-2); cursor: pointer; }
        .pl-view { display: flex; gap: 3px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); border-radius: 14px; padding: 3px; }
        .pl-view button { width: 34px; height: 34px; border: none; border-radius: 11px; background: transparent; color: rgba(255,255,255,.7); cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .pl-view button.on { background: #fff; color: var(--dg-primary); }
        .prod-grid { row-gap: 28px !important; }
        .prod-grid.prod-list { grid-template-columns: 1fr !important; row-gap: 12px !important; }
        .prod-list .dg-card { display: grid; grid-template-columns: 150px minmax(0,1fr); gap: 18px; align-items: center; background: #fff; border: 1px solid var(--dg-line); border-radius: 26px; padding: 10px 10px 10px 18px; text-align: right; }
        .prod-list .dg-card-media { aspect-ratio: 1; border-radius: 999px 999px 18px 18px; }
        .prod-list .dg-card:hover .dg-card-media { transform: none; }
        .prod-list .dg-card-wish { top: 14px; left: 14px; }
        .prod-list .dg-card-body { align-items: stretch; padding: 0; }
        .prod-list .dg-card-meta { justify-content: flex-end; padding-left: 44px; }
        .prod-list .dg-card-name { text-align: right; font-size: 15px; min-height: 0; }
        .prod-list .dg-card-foot { max-width: 320px; }
        @media(max-width:1100px){.prod-grid:not(.prod-list){grid-template-columns:repeat(2,1fr)!important}}
        @media(max-width:900px){
          .pl-shell{grid-template-columns:1fr;padding:14px 12px 32px;}
          .pl-side{display:none;}
          .pl-mobile-bar{display:flex;}
          .pl-head{padding:18px;border-radius:20px;}
          .pl-head h1{font-size:20px;}
          .prod-grid:not(.prod-list){grid-template-columns:repeat(3,1fr)!important}
        }
        @media(max-width:640px){ .prod-grid:not(.prod-list),.prod-skeleton{grid-template-columns:repeat(2,1fr)!important;column-gap:10px !important;} .prod-list .dg-card{grid-template-columns:110px minmax(0,1fr);gap:12px;padding:8px 8px 8px 12px;} .pl-view{display:none;} }
      `}</style>
    </PageLayout>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dg-primary)" }}>در حال بارگذاری...</div>}>
      <ProductsInner />
    </Suspense>
  );
}
