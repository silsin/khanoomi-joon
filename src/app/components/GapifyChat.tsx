"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

const GAPIFY_BASE_URL = "https://app.gapify.ai";

type GapifyApi = {
  toggle?: (state?: "open" | "close") => void;
  setUser?: (
    identifier: string,
    user: {
      email?: string;
      name?: string;
      avatar_url?: string;
      phone_number?: string;
    },
  ) => void;
  reset?: () => void;
};

type GapifyWindow = Window & {
  gapifySettings?: Record<string, unknown>;
  gapifySDK?: {
    run: (config: { websiteToken: string; baseUrl: string }) => void;
  };
  $gapify?: GapifyApi;
};

function isValidGapifyToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{8,}$/.test(token);
}

function resolveGapifyToken(data: Record<string, string | undefined>) {
  const dbToken = data.gapify_website_token?.trim() || "";
  const envToken = process.env.NEXT_PUBLIC_GAPIFY_WEBSITE_TOKEN?.trim() || "";
  const token = isValidGapifyToken(dbToken)
    ? dbToken
    : isValidGapifyToken(envToken)
      ? envToken
      : "";
  return token || null;
}

/**
 * Loads Gapify live chat on public storefront pages.
 * Keys: Admin → Settings → چت آنلاین (DB), or NEXT_PUBLIC_GAPIFY_WEBSITE_TOKEN env fallback.
 * Shows a fixed «چت آنلاین» button; Gapify's default bubble is hidden for a cleaner UI.
 */
export default function GapifyChat() {
  const pathname = usePathname();
  const [websiteToken, setWebsiteToken] = useState<string | null>(null);
  const [gapifyReady, setGapifyReady] = useState(false);

  const isAdmin = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    if (isAdmin) return;

    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => {
        if (!d.success) return;
        const token = resolveGapifyToken(d.data);
        if (token) setWebsiteToken(token);
      })
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!websiteToken || isAdmin) return;
    if (document.getElementById("gapify-sdk-script")) {
      setGapifyReady(true);
      return;
    }

    const win = window as GapifyWindow;
    win.gapifySettings = {
      hideMessageBubble: true,
      position: "left",
      locale: "fa",
      useBrowserLanguage: false,
      darkMode: "auto",
    };

    const onReady = () => setGapifyReady(true);
    window.addEventListener("gapify:ready", onReady);

    const script = document.createElement("script");
    script.id = "gapify-sdk-script";
    script.async = true;
    script.src = `${GAPIFY_BASE_URL}/packs/js/sdk.js`;
    script.onload = () => {
      win.gapifySDK?.run({
        websiteToken,
        baseUrl: GAPIFY_BASE_URL,
      });
    };

    const firstScript = document.getElementsByTagName("script")[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);

    return () => {
      window.removeEventListener("gapify:ready", onReady);
    };
  }, [websiteToken, isAdmin]);

  const openChat = useCallback(() => {
    const api = (window as GapifyWindow).$gapify;
    if (api?.toggle) {
      api.toggle("open");
    }
  }, []);

  if (!websiteToken || isAdmin) return null;

  return (
    <>
    <button
      type="button"
      onClick={openChat}
      disabled={!gapifyReady}
      aria-label="چت آنلاین"
      title={gapifyReady ? "چت آنلاین" : "در حال بارگذاری چت..."}
      className="gapify-chat-btn"
      style={{
        position: "fixed",
        bottom: "24px",
        left: "24px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: gapifyReady ? "var(--dg-primary)" : "var(--dg-muted)",
        color: "#fff",
        border: "none",
        borderRadius: "999px",
        padding: "12px 20px",
        fontSize: "14px",
        fontWeight: "700",
        cursor: gapifyReady ? "pointer" : "wait",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        fontFamily: "inherit",
        transition: "background-color 0.2s, transform 0.2s",
      }}
      onMouseEnter={e => {
        if (gapifyReady) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      <MessageCircle size={20} />
      <span className="gapify-chat-label">چت آنلاین</span>
    </button>
    <style>{`
      @media (max-width: 600px) {
        .gapify-chat-btn { bottom: 96px !important; left: 12px !important; padding: 12px !important; }
        .gapify-chat-label { display: none !important; }
      }
    `}</style>
    </>
  );
}
