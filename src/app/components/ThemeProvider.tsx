"use client";
import { useEffect, ReactNode } from "react";
import { applyTheme, parseThemeSettings } from "@/lib/theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => {
        if (d.success) applyTheme(parseThemeSettings(d.data));
      })
      .catch(() => applyTheme({}));
  }, []);

  return <>{children}</>;
}
