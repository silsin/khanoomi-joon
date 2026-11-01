"use client";
import { useEffect, useState } from "react";
import HeroBento        from "./HeroBento";
import TrustBar         from "./TrustBar";
import PromoBanners     from "./PromoBanners";
import CategoryIcons    from "./CategoryIcons";
import SpecialOffers    from "./SpecialOffers";
import ExpressShipping  from "./ExpressShipping";
import LowWageProducts  from "./LowWageProducts";
import CoinProducts     from "./CoinProducts";
import FavoriteProducts from "./FavoriteProducts";
import NewProducts      from "./NewProducts";
import CategoryShowcase from "./CategoryShowcase";
import BudgetBanners    from "./BudgetBanners";
import CollectionsGrid  from "./CollectionsGrid";
import InfoBlocks       from "./InfoBlocks";
import {
  HOME_SECTIONS_SETTING_KEY,
  DEFAULT_HOME_SECTION_ORDER,
  parseHomeSectionOrder,
} from "@/lib/home-sections";

const COMPONENTS: Record<string, React.ComponentType> = {
  hero:           HeroBento,
  trust:          TrustBar,
  promo_banners:  PromoBanners,
  categories:     CategoryIcons,
  special_offers: SpecialOffers,
  express:        ExpressShipping,
  low_wage:       LowWageProducts,
  coin:           CoinProducts,
  favorites:      FavoriteProducts,
  new_arrival:    NewProducts,
  showcase:       CategoryShowcase,
  budget:         BudgetBanners,
  collections:    CollectionsGrid,
  info:           InfoBlocks,
};

/**
 * Renders the movable homepage sections in the order configured by the admin
 * (settings key `home_sections_order`). Renders nothing until the order is
 * loaded to avoid a visible re-order flash.
 */
export default function HomeSections() {
  const [order, setOrder] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(d => {
      setOrder(parseHomeSectionOrder(d.success ? d.data?.[HOME_SECTIONS_SETTING_KEY] : null));
    }).catch(() => setOrder([...DEFAULT_HOME_SECTION_ORDER]));
  }, []);

  // Nothing renders until the order is known — the splash screen waits on this
  // marker so the homepage is never seen assembling itself.
  if (!order) return <span data-dg-pending aria-hidden="true" />;

  return (
    <>
      {order.map(key => {
        const C = COMPONENTS[key];
        return C ? <C key={key} /> : null;
      })}
    </>
  );
}
