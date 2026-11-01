"use client";
import { useState, useEffect } from "react";
import { parsePriceBarStyle, DEFAULT_PRICE_BAR_STYLE } from "@/lib/price-bar-settings";
import PriceBarContent from "./PriceBarContent";

interface GoldPrice { price: number; }

export default function AnnouncementBar() {
  const [gold, setGold] = useState<GoldPrice | null>(null);
  const [style, setStyle] = useState(DEFAULT_PRICE_BAR_STYLE);

  useEffect(() => {
    const fetchGold = () => {
      fetch("/api/admin/gold-price", { cache: "no-store" })
        .then(r => r.json()).then(d => { if (d.success) setGold(d.data); }).catch(() => {});
    };
    fetchGold();
    const iv = setInterval(fetchGold, 60_000);

    fetch("/api/admin/settings", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d.success) setStyle(parsePriceBarStyle(d.data)); })
      .catch(() => {});

    return () => clearInterval(iv);
  }, []);

  const amount = gold ? gold.price.toLocaleString("fa-IR") : "...";

  return (
    <div style={{
      background: "var(--dg-ink)",
      minHeight: "34px",
      display: "flex",
      alignItems: "center",
      position: "relative",
      overflow: "hidden",
      padding: "6px 16px",
    }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(15,92,69,0.08) 50%, transparent 100%)", pointerEvents: "none" }} />
      <PriceBarContent style={style} amount={amount} />
    </div>
  );
}
