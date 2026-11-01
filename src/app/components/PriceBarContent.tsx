import {
  priceBarJustifyContent,
  type PriceBarPartId,
  type PriceBarStyle,
} from "@/lib/price-bar-settings";
import { getFontFamily } from "@/lib/typography";

function renderPart(
  part: PriceBarPartId,
  style: PriceBarStyle,
  amount: string,
  fontSize: string,
) {
  switch (part) {
    case "label":
      return (
        <span key="label" style={{ color: style.labelColor }}>
          {style.labelText}
        </span>
      );
    case "gold":
      return (
        <span key="gold" style={{ color: style.goldColor, fontWeight: 800, fontSize }}>
          {style.goldText}
        </span>
      );
    case "amount":
      return (
        <span
          key="amount"
          dir="ltr"
          style={{
            display: "inline-flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "4px",
            direction: "ltr",
            unicodeBidi: "isolate",
            fontWeight: 800,
            fontSize,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: style.labelColor }}>:</span>
          <span style={{ color: style.amountColor }}>{amount}</span>
        </span>
      );
    case "currency":
      return (
        <span key="currency" style={{ color: style.currencyColor, fontWeight: 800, fontSize }}>
          {style.currencyText}
        </span>
      );
    default:
      return null;
  }
}

export default function PriceBarContent({
  style,
  amount,
  fontSize,
  showDecorations = true,
}: {
  style: PriceBarStyle;
  amount: string;
  fontSize?: string;
  showDecorations?: boolean;
}) {
  const resolvedSize = fontSize ?? `${style.fontSize ?? 12}px`;
  const resolvedFamily = getFontFamily(style.fontId ?? "Vazirmatn");
  // Decorations (✦ + hearts) scale with the chosen font size
  const basePx = parseInt(resolvedSize, 10) || 12;
  const decoFontSize = `${Math.max(10, Math.round(basePx * 0.9))}px`;
  const iconPx = Math.max(12, Math.round(basePx * 1.1));
  return (
    <div
      className="pb-content"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: priceBarJustifyContent(style.align),
        direction: "rtl",
        width: "100%",
        gap: "10px",
        zIndex: 1,
        fontFamily: resolvedFamily,
        fontSize: resolvedSize,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "center", minWidth: 0 }}>
        {showDecorations && (
          <>
            <span className="pb-deco" style={{ color: "var(--dg-primary)", fontSize: decoFontSize, opacity: 0.9, fontFamily: resolvedFamily }}>✦</span>
            <svg className="pb-deco" width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="#0f5c45" opacity={0.85} aria-hidden style={{ flexShrink: 0 }}>
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
          </>
        )}

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            flexDirection: "row",
            direction: "rtl",
            gap: "4px",
            fontSize: resolvedSize,
            fontWeight: "500",
            letterSpacing: "0.3px",
            flexWrap: "wrap",
          }}
        >
          {style.partOrder.map(part => renderPart(part, style, amount, resolvedSize))}
        </span>

        {showDecorations && (
          <>
            <svg className="pb-deco" width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="#0f5c45" opacity={0.85} aria-hidden style={{ flexShrink: 0 }}>
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
            <span className="pb-deco" style={{ color: "var(--dg-primary)", fontSize: decoFontSize, opacity: 0.9, fontFamily: resolvedFamily }}>✦</span>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 600px) {
          .pb-content { justify-content: center !important; }
          .pb-content > div { gap: 6px !important; }
          .pb-deco { display: none !important; }
        }
      `}</style>
    </div>
  );
}
