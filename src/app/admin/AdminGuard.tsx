"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Wraps admin pages — verifies auth client-side as a secondary check.
 * The proxy already protects server-side, this prevents stale-render 404s.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (!d.success || d.data?.role !== "ADMIN") {
          window.location.href = "/admin/login";
        } else {
          setChecked(true);
        }
      })
      .catch(() => { window.location.href = "/admin/login"; });
  }, []);

  if (!checked) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
        <div style={{ color: "#d4af37", fontSize: "14px" }}>در حال بررسی دسترسی...</div>
      </div>
    );
  }

  return <>{children}</>;
}
