"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import AdminGuard from "./AdminGuard";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tag, Settings,
  LogOut, Menu, X, ChevronLeft, Navigation, MessageSquare, BadgePercent, Image, LayoutGrid, Coins, Star,
} from "lucide-react";

const navItems = [
  { label: "داشبورد",        href: "/admin",             icon: LayoutDashboard },
  { label: "اسلایدر",        href: "/admin/slides",      icon: Package },
  { label: "بنرهای تبلیغاتی", href: "/admin/promo-banners", icon: Image },
  { label: "ویترین دسته‌بندی", href: "/admin/category-showcase", icon: LayoutGrid },
  { label: "چیدمان صفحه اصلی", href: "/admin/sections",  icon: LayoutGrid },
  { label: "شگفت انگیزها",   href: "/admin/special-offers", icon: BadgePercent },
  { label: "محصولات",        href: "/admin/products",    icon: Package },
{ label: "سکه و آبشده",    href: "/admin/coin-products", icon: Coins },
  { label: "دیدگاه‌ها",       href: "/admin/reviews",     icon: Star },
  { label: "سفارش‌ها",       href: "/admin/orders",      icon: ShoppingBag },
  { label: "تیکت‌ها",        href: "/admin/tickets",     icon: MessageSquare },
  { label: "کاربران",        href: "/admin/users",       icon: Users },
  { label: "دسته‌بندی‌ها",   href: "/admin/categories",  icon: Tag },
  { label: "منوها و لینک‌ها", href: "/admin/navigation",  icon: Navigation },
  { label: "تنظیمات",        href: "/admin/settings",    icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Login page — render without sidebar
  if (pathname === "/admin/login") return <>{children}</>;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // Hard redirect to clear all client state
    window.location.href = "/admin/login";
  }

  const currentLabel =
    navItems.find(
      n => pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href))
    )?.label || "پنل مدیریت";

  return (
    <AdminGuard>
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0e0e0e", direction: "rtl" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebarOpen ? "240px" : "64px",
        backgroundColor: "#111",
        borderLeft: "1px solid #2a2a2a",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.3s ease",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: "16px", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "64px" }}>
          {sidebarOpen && (
            <Link href="/admin" style={{ textDecoration: "none" }}>
              <div style={{ color: "#d4af37", fontSize: "18px", fontWeight: "900", letterSpacing: "-1px" }}>DG</div>
              <div style={{ color: "#d4af37", fontSize: "9px", letterSpacing: "2px" }}>ADMIN</div>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{ color: "#888", background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0 }}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Nav links — use Next.js Link for client-side navigation */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 16px",
                  color: active ? "#d4af37" : "#888",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: active ? "600" : "400",
                  backgroundColor: active ? "rgba(212,175,55,0.1)" : "transparent",
                  borderRight: `3px solid ${active ? "#d4af37" : "transparent"}`,
                  whiteSpace: "nowrap",
                  transition: "color 0.2s, background-color 0.2s",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#d4af37"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#888"; }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {sidebarOpen && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "16px", borderTop: "1px solid #2a2a2a" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#888",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              padding: "8px",
              width: "100%",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              transition: "color 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#888"}
          >
            <LogOut size={18} />
            {sidebarOpen && "خروج"}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          backgroundColor: "#111",
          borderBottom: "1px solid #2a2a2a",
          padding: "0 24px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
          flexShrink: 0,
        }}>
          <Link
            href="/"
            target="_blank"
            style={{ color: "#d4af37", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
            <ChevronLeft size={12} />
            مشاهده سایت
          </Link>
          <h1 style={{ color: "#fff", fontSize: "16px", fontWeight: "600" }}>
            {currentLabel}
          </h1>
        </header>

        <div style={{ flex: 1, padding: "24px", overflow: "auto" }}>
          {children}
        </div>
      </main>
    </div>
    </AdminGuard>
  );
}
