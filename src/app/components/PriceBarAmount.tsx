import type { PriceBarStyle } from "@/lib/price-bar-settings";

/** Renders ": amount currency" with number before تومان, without breaking Persian letters. */
export default function PriceBarAmount({
  amount,
  style,
  fontSize = "13px",
}: {
  amount: string;
  style: PriceBarStyle;
  fontSize?: string;
}) {
  return (
    <span
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
      <span style={{ color: style.currencyColor }}>{style.currencyText}</span>
    </span>
  );
}
