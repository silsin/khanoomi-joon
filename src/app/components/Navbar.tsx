"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { ShoppingCart, Menu, X, LogOut, Package, LogIn, User, ChevronDown, ChevronLeft, Search, Home, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "./CartContext";
import { filterTryonNavLinks, isTryonEnabled } from "@/lib/tryon-settings";
import { buildSocialLinks } from "@/lib/social-platforms";
import SocialIconLink from "./SocialIconLink";

interface AuthUser { id: string; name: string; email: string; role: string; }

interface NavLink { label: string; href: string; children?: NavLink[]; cat?: string; }

/**
 * Keep only real {label, href} entries plus one level of submenus, so a broken
 * admin value can never render an empty item or an empty dropdown.
 * The admin-only `cat` (source category id) is dropped here — the storefront
 * only needs label + href.
 */
function normalizeNavLinks(links: unknown[]): NavLink[] {
  if (!Array.isArray(links)) return [];
  const clean = (l: unknown): NavLink | null => {
    if (!l || typeof l !== "object") return null;
    const label = String((l as { label?: unknown }).label ?? "").trim();
    const href = String((l as { href?: unknown }).href ?? "").trim() || "/products";
    if (!label) return null;
    return { label, href };
  };
  const out: NavLink[] = [];
  for (const l of links) {
    const top = clean(l);
    if (!top) continue;
    const rawKids = (l as { children?: unknown }).children;
    const kids = Array.isArray(rawKids)
      ? (rawKids.map(clean).filter((c): c is NavLink => c !== null))
      : [];
    out.push(kids.length > 0 ? { ...top, children: kids } : top);
  }
  return out;
}

const DEFAULT_CAT_LINKS: NavLink[] = [
  { label: "هدیه",         href: "/products" },
  { label: "کالکشن",       href: "/collections" },
  { label: "تخفیف‌دار",    href: "/products" },
  { label: "✨ پرو مجازی", href: "/tryon" },
  { label: "گردنبند",      href: "/products?category=necklaces" },
  { label: "گوشواره",      href: "/products?category=earrings" },
  { label: "انگشتر",       href: "/products?category=rings" },
  { label: "دستبند",       href: "/products?category=bracelets" },
  { label: "ست و نیم‌ست", href: "/products" },
  { label: "پابند",        href: "/products" },
  { label: "جاسوئیچی",    href: "/products" },
  { label: "بچه‌گانه",     href: "/products" },
  { label: "سکه",          href: "/products" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen]     = useState(false);
  const [openMenu, setOpenMenu]     = useState<number | null>(null);
  const [expandedSub, setExpandedSub] = useState<Record<number, boolean>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal]   = useState("");
  const [userOpen, setUserOpen]     = useState(false);
  const [authUser, setAuthUser]     = useState<AuthUser | null>(null);
  const [authDone, setAuthDone]     = useState(false);
  const [phone, setPhone]           = useState("");
  const [socialLinks, setSocialLinks] = useState<ReturnType<typeof buildSocialLinks>>([]);
  const [catLinks, setCatLinks]     = useState<NavLink[]>(DEFAULT_CAT_LINKS);

  const uT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pathname = usePathname();
  const router   = useRouter();
  const { count } = useCart();

  const checkAuth = useCallback(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setAuthUser(d.success ? d.data : null); setAuthDone(true); })
      .catch(() => { setAuthUser(null); setAuthDone(true); });
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth, pathname]);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" }).then(r => r.json()).then(d => {
      if (!d.success) return;
      setPhone(d.data.site_phone1 ?? "");
      setSocialLinks(buildSocialLinks(d.data));
      const tryonOn = isTryonEnabled(d.data.tryon_enabled);
      let links = DEFAULT_CAT_LINKS;
      if (d.data.nav_links) {
        try { const parsed = normalizeNavLinks(JSON.parse(d.data.nav_links)); if (parsed.length > 0) links = parsed; } catch {}
      }
      setCatLinks(filterTryonNavLinks(links, tryonOn));
    }).catch(() => {});
  }, []);

  const socialIcons = socialLinks;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchVal.trim()) return;
    setSearchOpen(false);
    router.push(`/products?search=${encodeURIComponent(searchVal.trim())}`);
    setSearchVal("");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null); setUserOpen(false);
    router.push("/"); router.refresh();
  }

  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navChildren = (link: NavLink): NavLink[] => link.children ?? [];

  const sameUrl = (href: string) => {
    if (typeof window === "undefined") return false;
    return href === `${pathname}${window.location.search}`;
  };

  const cancelMenuTimer = () => {
    if (openT.current) { clearTimeout(openT.current); openT.current = null; }
  };
  const scheduleMenuClose = () => {
    if (openT.current) clearTimeout(openT.current);
    openT.current = setTimeout(() => setOpenMenu(null), 160);
  };

  // The dropdown is viewport-fixed, so any scroll/resize invalidates its anchor.
  useEffect(() => {
    if (openMenu === null) return;
    const close = () => setOpenMenu(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openMenu]);

  return (
    <header className="dgh">
      <div className="dgh-shell">
        {/* ── Row 1: logo · search · actions ── */}
        <div className="dgh-top">
          <button aria-label="منو" onClick={() => setMenuOpen(true)} className="dgh-burger"><Menu size={20} /></button>

          <Link href="/" className="dgh-logo" aria-label="گالری طلای خانوم جون">
            <span className="dgh-mark"><span>خ</span></span>
            <span className="dgh-word"><i>گالری طلای</i><b>خانوم جون</b></span>
          </Link>

          <form onSubmit={handleSearch} className="dgh-search">
            <Search size={17} />
            <input value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="دنبال چه طرحی هستید؟ انگشتر، گردنبند، سکه..." />
            <button type="submit">جستجو</button>
          </form>

          <div className="dgh-actions">
            <button className="dgh-icon dgh-search-toggle" aria-label="جستجو" onClick={() => { setSearchOpen(o => !o); setSearchVal(""); }}>
              {searchOpen ? <X size={18} /> : <Search size={18} />}
            </button>

            {authDone && (authUser ? (
              <div style={{ position: "relative" }}
                onMouseEnter={() => { uT.current && clearTimeout(uT.current); setUserOpen(true); }}
                onMouseLeave={() => { uT.current = setTimeout(() => setUserOpen(false), 180); }}>
                <button className="dgh-account">
                  <span className="dgh-avatar">{authUser.name.trim().charAt(0) || <User size={14} />}</span>
                  <span className="dgh-account-text">
                    <small>خوش آمدید</small>
                    <b>{authUser.name.split(" ")[0]}</b>
                  </span>
                  <ChevronDown size={14} style={{ transform: userOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </button>
                {userOpen && (
                  <div className="dgh-pop">
                    <div className="dgh-pop-head">
                      <b>{authUser.name}</b>
                      <small>{authUser.email}</small>
                    </div>
                    <Link href="/account" onClick={() => setUserOpen(false)}><User size={15} /> حساب کاربری</Link>
                    <Link href="/account?tab=orders" onClick={() => setUserOpen(false)}><Package size={15} /> سفارش‌های من</Link>
                    {authUser.role === "ADMIN" && <Link href="/admin" onClick={() => setUserOpen(false)} className="gold">پنل مدیریت ←</Link>}
                    <button onClick={handleLogout} className="danger"><LogOut size={15} /> خروج</button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="dgh-account">
                <span className="dgh-avatar"><LogIn size={15} /></span>
                <span className="dgh-account-text">
                  <small>حساب کاربری</small>
                  <b>ورود / عضویت</b>
                </span>
              </Link>
            ))}

            <Link href="/cart" className="dgh-cart">
              <ShoppingCart size={18} />
              <span className="dgh-cart-label">سبد خرید</span>
              <span className="dgh-cart-count">{count > 99 ? "99+" : count.toLocaleString("fa-IR")}</span>
            </Link>
          </div>
        </div>

        {/* Mobile search */}
        {searchOpen && (
          <form onSubmit={handleSearch} className="dgh-search dgh-search-mobile">
            <Search size={17} />
            <input autoFocus value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="جستجو در محصولات..." />
            <button type="submit">جستجو</button>
          </form>
        )}

        {/* ── Row 2: category chips ── */}
        <nav className="dgh-nav cat-nav-row">
          <div className="dgh-nav-track">
            {catLinks.map((link, i) => {
              const kids = navChildren(link);
              const hasKids = kids.length > 0;
              const linkActive = (active(link.href) && link.href !== "/products") || kids.some(k => active(k.href));
              return (
                <div
                  key={i}
                  ref={el => { menuWrapRefs.current[i] = el; }}
                  style={{ position: "relative", flexShrink: 0 }}
                  onMouseEnter={e => {
                    cancelMenuTimer();
                    if (!hasKids) { setOpenMenu(null); return; }
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setMenuPos({ top: Math.round(r.bottom + 10), right: Math.max(8, Math.round(window.innerWidth - r.right - 8)) });
                    setOpenMenu(i);
                  }}
                  onMouseLeave={scheduleMenuClose}
                >
                  <Link
                    href={link.href}
                    aria-haspopup={hasKids ? "menu" : undefined}
                    aria-expanded={hasKids ? openMenu === i : undefined}
                    className={`dgh-chip${linkActive ? " on" : ""}${openMenu === i ? " open" : ""}`}
                    onClick={() => {
                      // Identical URL → Next.js performs no navigation at all, so give
                      // the user visible feedback («we are already there»).
                      if (sameUrl(link.href)) window.scrollTo({ top: 0, behavior: "smooth" });
                      setOpenMenu(null);
                    }}
                    onFocus={() => {
                      if (!hasKids) { setOpenMenu(null); return; }
                      const el = menuWrapRefs.current[i];
                      if (el) {
                        const r = el.getBoundingClientRect();
                        setMenuPos({ top: Math.round(r.bottom + 10), right: Math.max(8, Math.round(window.innerWidth - r.right - 8)) });
                      }
                      setOpenMenu(i);
                    }}
                    onBlur={e => {
                      if (!(e.relatedTarget instanceof HTMLElement) || !e.currentTarget.parentElement?.contains(e.relatedTarget)) {
                        scheduleMenuClose();
                      }
                    }}
                  >
                    {link.label}
                    {hasKids && <ChevronDown size={13} style={{ transform: openMenu === i ? "rotate(180deg)" : "none", transition: "transform .18s ease" }} />}
                  </Link>
                </div>
              );
            })}
          </div>
          {phone && (
            <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className="dgh-phone">
              <small>مشاوره خرید</small>
              <b>{phone}</b>
            </a>
          )}
        </nav>
      </div>

      {/* Hover dropdown is viewport-fixed so the row's horizontal scroll never clips it. */}
      {openMenu !== null && catLinks[openMenu] && navChildren(catLinks[openMenu]).length > 0 && menuPos && (
        <div role="menu" className="dgh-mega" onMouseEnter={cancelMenuTimer} onMouseLeave={scheduleMenuClose}
          style={{ top: menuPos.top, right: menuPos.right }}>
          <p className="dgh-mega-title">{catLinks[openMenu].label}</p>
          <div className="dgh-mega-grid">
            {navChildren(catLinks[openMenu]).map((child, j) => (
              <Link key={`${child.href}-${j}`} href={child.href} role="menuitem"
                className={active(child.href) ? "on" : undefined}
                onClick={() => {
                  if (sameUrl(child.href)) window.scrollTo({ top: 0, behavior: "smooth" });
                  setOpenMenu(null);
                }}>
                <span>{child.label}</span>
                <ChevronLeft size={14} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Mobile off-canvas drawer ── */}
      {menuOpen && (
        <div className="dgh-drawer-wrap">
          <div className="dgh-drawer-backdrop" onClick={() => setMenuOpen(false)} />
          <aside className="dgh-drawer">
            <div className="dgh-drawer-head">
              <Link href="/" className="dgh-logo" onClick={() => setMenuOpen(false)}>
                <span className="dgh-mark"><span>خ</span></span>
                <span className="dgh-word"><i>گالری طلای</i><b>خانوم جون</b></span>
              </Link>
              <button aria-label="بستن" onClick={() => setMenuOpen(false)} className="dgh-icon"><X size={18} /></button>
            </div>

            <div className="dgh-drawer-user">
              {authUser ? (
                <>
                  <Link href="/account" onClick={() => setMenuOpen(false)}><User size={16} /> {authUser.name}</Link>
                  <Link href="/account?tab=orders" onClick={() => setMenuOpen(false)}><Package size={16} /> سفارش‌ها</Link>
                </>
              ) : (
                <Link href="/login" onClick={() => setMenuOpen(false)} className="primary"><LogIn size={16} /> ورود / ثبت‌نام</Link>
              )}
              <Link href="/cart" onClick={() => setMenuOpen(false)}><ShoppingCart size={16} /> سبد ({count.toLocaleString("fa-IR")})</Link>
            </div>

            <ul className="dgh-drawer-list">
              {catLinks.map((link, i) => {
                const kids = navChildren(link);
                const hasKids = kids.length > 0;
                const isExpanded = expandedSub[i] === true;
                return (
                  <li key={i}>
                    <div className="dgh-drawer-row">
                      <Link href={link.href} onClick={() => setMenuOpen(false)} className={active(link.href) && link.href !== "/products" ? "on" : undefined}>
                        {link.label}
                      </Link>
                      {hasKids && (
                        <button
                          type="button"
                          aria-label={isExpanded ? `بستن زیرمنوی ${link.label}` : `باز کردن زیرمنوی ${link.label}`}
                          aria-expanded={isExpanded}
                          aria-controls={`mobile-submenu-${i}`}
                          onClick={() => setExpandedSub(prev => ({ ...prev, [i]: !prev[i] }))}
                        >
                          <ChevronDown size={16} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform .18s ease" }} />
                        </button>
                      )}
                    </div>
                    {hasKids && isExpanded && (
                      <ul id={`mobile-submenu-${i}`} className="dgh-drawer-sub">
                        {kids.map((child, j) => (
                          <li key={`${child.href}-${j}`}>
                            <Link href={child.href} onClick={() => setMenuOpen(false)} className={active(child.href) ? "on" : undefined}>{child.label}</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="dgh-drawer-foot">
              {socialIcons.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {socialIcons.map(sc => (
                    <SocialIconLink key={sc.type} href={sc.href} label={sc.label} type={sc.type} iconUrl={sc.iconUrl} hover={sc.hover} size={16} variant="navbar" />
                  ))}
                </div>
              )}
              {phone && <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className="dgh-phone"><small>مشاوره خرید</small><b>{phone}</b></a>}
              {authUser && (
                <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="dgh-logout"><LogOut size={16} /> خروج</button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── Mobile bottom dock ── */}
      <nav className="dgh-dock" aria-label="ناوبری سریع">
        <Link href="/" className={pathname === "/" ? "on" : ""}><Home size={19} /><span>خانه</span></Link>
        <button onClick={() => setMenuOpen(true)}><LayoutGrid size={19} /><span>دسته‌ها</span></button>
        <button onClick={() => { setSearchOpen(true); setSearchVal(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Search size={19} /><span>جستجو</span></button>
        <Link href="/cart" className={`dgh-dock-cart${pathname === "/cart" ? " on" : ""}`}>
          <ShoppingCart size={19} />
          {count > 0 && <i>{count > 99 ? "99+" : count.toLocaleString("fa-IR")}</i>}
          <span>سبد</span>
        </Link>
        <Link href={authUser ? "/account" : "/login"} className={pathname?.startsWith("/account") || pathname === "/login" ? "on" : ""}><User size={19} /><span>حساب</span></Link>
      </nav>

      <style>{`
        @keyframes ddIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
        @keyframes drawerIn { from{transform:translateX(100%)} to{transform:none} }
        .dgh { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,.96); backdrop-filter: saturate(180%) blur(16px); -webkit-backdrop-filter: saturate(180%) blur(16px); border-bottom: 1px solid var(--dg-line); }
        .dgh::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: linear-gradient(90deg, transparent, var(--dg-gold), transparent); opacity: .6; }
        .dgh-shell { max-width: 1280px; margin: 0 auto; }
        .dgh-top { display: flex; align-items: center; gap: 24px; padding: 14px 20px 8px; }
        .dgh-top > .dgh-search { flex: 1; max-width: 560px; margin: 0 auto; }
        .dgh-actions { margin-right: auto; }
        .dgh-burger { display: none; }
        .dgh-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
        .dgh-top > .dgh-logo { gap: 12px; }
        .dgh-top > .dgh-logo .dgh-mark { border-radius: 50%; width: 48px; height: 48px; }
        .dgh-mark { width: 40px; height: 40px; border-radius: 12px; background: var(--dg-grad-primary); display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 14px rgba(15,92,69,.28); }
        .dgh-mark span { font-size: 22px; font-weight: 900; line-height: 1; background: var(--dg-grad-gold); -webkit-background-clip: text; background-clip: text; color: transparent; padding-bottom: 3px; }
        .dgh-word { display: flex; flex-direction: column; line-height: 1.15; }
        .dgh-word i { color: var(--dg-gold-deep); font-size: 11px; font-style: normal; font-weight: 700; letter-spacing: .5px; }
        .dgh-word b { color: var(--dg-ink); font-size: 21px; font-weight: 900; }
        .dgh-search { flex: 1; display: flex; align-items: center; gap: 10px; background: var(--dg-bg); border: 1px solid var(--dg-line); border-radius: 999px; padding: 5px 5px 5px 5px; padding-right: 14px; color: var(--dg-muted); transition: border-color .2s, box-shadow .2s; }
        .dgh-search:focus-within { border-color: var(--dg-primary-line); box-shadow: 0 0 0 4px var(--dg-primary-soft); background: #fff; }
        .dgh-search input { flex: 1; min-width: 0; border: none; background: transparent; outline: none; font-family: inherit; font-size: 13px; color: var(--dg-ink); padding: 8px 0; }
        .dgh-search button { background: var(--dg-ink); color: #fff; border: none; border-radius: 999px; padding: 9px 18px; font-family: inherit; font-weight: 700; font-size: 13px; cursor: pointer; }
        .dgh-search button:hover { background: var(--dg-primary-deep); }
        .dgh-search-mobile { margin: 0 14px 12px; }
        .dgh-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .dgh-icon { width: 42px; height: 42px; border-radius: 12px; background: var(--dg-bg); border: 1px solid var(--dg-line); color: var(--dg-ink-2); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .dgh-search-toggle { display: none; }
        .dgh-account { display: flex; align-items: center; gap: 10px; background: transparent; border: none; cursor: pointer; text-decoration: none; color: var(--dg-ink); font-family: inherit; padding: 4px 6px; border-radius: 12px; }
        .dgh-account:hover { background: var(--dg-bg); }
        .dgh-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--dg-gold-soft); color: var(--dg-gold-deep); border: 1px solid #eadfc8; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; }
        .dgh-account-text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.35; }
        .dgh-account-text small { color: var(--dg-muted); font-size: 10.5px; }
        .dgh-account-text b { font-size: 12.5px; font-weight: 800; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dgh-cart { display: flex; align-items: center; gap: 8px; background: var(--dg-ink); color: #fff; text-decoration: none; border-radius: 999px; padding: 10px 10px 10px 16px; font-size: 13px; font-weight: 700; transition: background .2s; }
        .dgh-cart:hover { background: var(--dg-primary-deep); }
        .dgh-cart-count { min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: var(--dg-grad-gold); color: #fff; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
        .dgh-pop { position: absolute; top: calc(100% + 10px); left: 0; min-width: 220px; background: #fff; border: 1px solid var(--dg-line); border-radius: 18px; padding: 8px; box-shadow: var(--dg-shadow-lg); z-index: 200; animation: ddIn .16s ease; }
        .dgh-pop-head { padding: 10px 12px 12px; margin-bottom: 4px; border-bottom: 1px solid var(--dg-line); display: flex; flex-direction: column; gap: 2px; }
        .dgh-pop-head b { color: var(--dg-ink); font-size: 13px; }
        .dgh-pop-head small { color: var(--dg-faint); font-size: 11px; }
        .dgh-pop a, .dgh-pop button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border-radius: 10px; color: var(--dg-ink-2); text-decoration: none; font-size: 13px; background: none; border: none; font-family: inherit; cursor: pointer; text-align: right; }
        .dgh-pop a:hover { background: var(--dg-primary-soft); color: var(--dg-primary); }
        .dgh-pop a.gold { color: var(--dg-gold-deep); font-weight: 700; }
        .dgh-pop .danger { color: #dc2626; }
        .dgh-pop .danger:hover { background: #fef2f2; }

        .dgh-nav { position: relative; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 2px 20px 6px; }
        .dgh-nav-track { min-width: 0; display: flex; justify-content: center; gap: 2px; overflow-x: auto; scrollbar-width: none; }
        .dgh-nav-track > div + div::before { content: "◆"; position: absolute; right: -4px; top: 50%; transform: translateY(-50%); font-size: 5px; color: var(--dg-gold); }
        .dgh-nav-track::-webkit-scrollbar { display: none; }
        .dgh-chip { position: relative; display: flex; align-items: center; gap: 4px; padding: 10px 14px; border-radius: 0; color: var(--dg-ink-2); text-decoration: none; font-family: var(--font-nav); font-size: var(--font-size-nav, 13px); font-weight: 600; white-space: nowrap; transition: background .15s, color .15s; }
        .dgh-chip::after { content: ""; position: absolute; right: 50%; left: 50%; bottom: 4px; height: 2px; border-radius: 2px; background: var(--dg-grad-gold); transition: right .25s ease, left .25s ease; }
        .dgh-chip:hover, .dgh-chip.open, .dgh-chip.on { color: var(--dg-primary); }
        .dgh-chip:hover::after, .dgh-chip.open::after, .dgh-chip.on::after { right: 14px; left: 14px; }
        .dgh-chip.on { font-weight: 800; }
        .dgh-phone { display: flex; flex-direction: column; align-items: flex-end; text-decoration: none; line-height: 1.3; flex-shrink: 0; padding-right: 14px; border-right: 1px solid var(--dg-line); }
        .dgh-nav > .dgh-phone { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); }
        .dgh-dock { display: none; }
        .dgh-phone small { color: var(--dg-muted); font-size: 10px; }
        .dgh-phone b { color: var(--dg-primary); font-size: 13px; font-weight: 800; direction: ltr; }

        .dgh-mega { position: fixed; z-index: 500; min-width: 280px; max-width: min(560px, calc(100vw - 24px)); background: #fff; border: 1px solid var(--dg-line); border-radius: 20px; box-shadow: var(--dg-shadow-lg); padding: 16px; animation: ddIn .16s ease; }
        .dgh-mega-title { color: var(--dg-gold-deep); font-size: 11px; font-weight: 800; letter-spacing: 1px; margin-bottom: 10px; padding: 0 6px; }
        .dgh-mega-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 4px; }
        .dgh-mega-grid a { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border-radius: 12px; color: var(--dg-ink-2); text-decoration: none; font-family: var(--font-nav); font-size: var(--font-size-nav, 13px); background: var(--dg-bg); transition: all .15s; }
        .dgh-mega-grid a span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dgh-mega-grid a svg { color: var(--dg-faint); flex-shrink: 0; }
        .dgh-mega-grid a:hover, .dgh-mega-grid a.on { background: var(--dg-primary); color: #fff; }
        .dgh-mega-grid a:hover svg, .dgh-mega-grid a.on svg { color: var(--dg-gold); }

        .dgh-drawer-wrap { position: fixed; inset: 0; z-index: 600; }
        .dgh-drawer-backdrop { position: absolute; inset: 0; background: rgba(10,35,29,.45); backdrop-filter: blur(3px); }
        .dgh-drawer { position: absolute; top: 0; right: 0; bottom: 0; width: min(340px, 88vw); background: #fff; display: flex; flex-direction: column; animation: drawerIn .25s ease; border-top-left-radius: 24px; border-bottom-left-radius: 24px; overflow: hidden; }
        .dgh-drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--dg-line); }
        .dgh-drawer-user { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 14px 18px; }
        .dgh-drawer-user a { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 11px 8px; border-radius: 12px; background: var(--dg-bg); color: var(--dg-ink-2); text-decoration: none; font-size: 12.5px; font-weight: 700; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .dgh-drawer-user a.primary { background: var(--dg-primary); color: #fff; }
        .dgh-drawer-list { list-style: none; flex: 1; overflow-y: auto; padding: 4px 10px; margin: 0; }
        .dgh-drawer-row { display: flex; align-items: center; }
        .dgh-drawer-row a { flex: 1; min-width: 0; padding: 13px 10px; color: var(--dg-ink); text-decoration: none; font-family: var(--font-nav); font-size: 14px; font-weight: 600; border-radius: 10px; }
        .dgh-drawer-row a.on { color: var(--dg-primary); }
        .dgh-drawer-row button { width: 42px; height: 42px; border: none; background: none; color: var(--dg-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .dgh-drawer-sub { list-style: none; margin: 0 0 6px; padding: 4px 10px; background: var(--dg-bg); border-radius: 12px; }
        .dgh-drawer-sub a { display: block; padding: 10px; color: var(--dg-ink-2); text-decoration: none; font-size: 13px; }
        .dgh-drawer-sub a.on { color: var(--dg-primary); font-weight: 700; }
        .dgh-drawer-foot { padding: 14px 18px 18px; border-top: 1px solid var(--dg-line); display: flex; flex-direction: column; gap: 12px; }
        .dgh-drawer-foot .dgh-phone { align-items: flex-start; border: none; padding: 0; }
        .dgh-logout { display: flex; align-items: center; gap: 8px; color: #dc2626; background: none; border: none; font-family: inherit; font-size: 13px; cursor: pointer; padding: 0; }

        @media (max-width: 1100px) {
          .dgh-account-text, .dgh-cart-label { display: none; }
          .dgh-nav > .dgh-phone { display: none; }
        }
        @media (max-width: 900px) {
          .dgh { backdrop-filter: none; -webkit-backdrop-filter: none; background: #fff; }
          .dgh-top { display: flex; gap: 10px; padding: 10px 12px; }
          .dgh-top > .dgh-logo .dgh-mark { width: 38px; height: 38px; }
          .dgh-burger, .dgh-actions .dgh-cart { display: none !important; }
          .dgh-dock { display: grid; grid-template-columns: repeat(5, 1fr); position: fixed; z-index: 400; left: 10px; right: 10px; bottom: 10px; padding: 6px; background: var(--dg-ink); border-radius: 22px; box-shadow: 0 14px 34px rgba(10,35,29,.35); }
          .dgh-dock a, .dgh-dock button { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 2px; border: none; background: none; color: rgba(255,255,255,.62); text-decoration: none; font-family: inherit; font-size: 10.5px; font-weight: 700; border-radius: 16px; cursor: pointer; }
          .dgh-dock a.on { background: rgba(255,255,255,.1); color: var(--dg-gold); }
          .dgh-dock i { position: absolute; top: 3px; left: calc(50% - 20px); min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: var(--dg-grad-gold); color: #fff; font-style: normal; font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
          body { padding-bottom: 84px; }
          .dgh-burger { display: flex; width: 42px; height: 42px; border-radius: 12px; background: var(--dg-bg); border: 1px solid var(--dg-line); color: var(--dg-ink); align-items: center; justify-content: center; cursor: pointer; }
          .dgh-top > .dgh-logo { margin-left: auto; }
          .dgh-top > .dgh-search { display: none; }
          .dgh-search-toggle { display: flex; }
          .dgh-nav { display: none; }
          .dgh-account { display: none; }
          .dgh-cart { padding: 10px 12px; }
        }
        @media (max-width: 380px) {
          .dgh-word b { font-size: 18px; }
          .dgh-mark { width: 34px; height: 34px; }
        }
      `}</style>
    </header>
  );
}
