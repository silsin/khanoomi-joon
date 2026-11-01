import { Download } from "lucide-react";
import type { SocialLinkType } from "@/lib/social-links";
import InstagramIcon from "./InstagramIcon";
import BaleIcon from "./BaleIcon";

interface SocialIconProps {
  type: SocialLinkType;
  size?: number;
  imageUrl?: string;
}

function TelegramIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ pointerEvents: "none", display: "block" }}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.014 9.496c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.877.725z" />
    </svg>
  );
}

function WhatsAppIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ pointerEvents: "none", display: "block" }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51A11.945 11.945 0 0 0 12 0C5.373 0 0 5.373 0 12c0 2.122.555 4.112 1.525 5.84L0 24l6.335-1.652A11.955 11.955 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.016-1.375l-.36-.213-3.727.977 1.002-3.641-.234-.373A9.818 9.818 0 0 1 2.182 12C2.182 6.575 6.575 2.182 12 2.182S21.818 6.575 21.818 12 17.425 21.818 12 21.818z" />
    </svg>
  );
}

function DefaultIcon({ type, size }: { type: SocialLinkType; size: number }) {
  switch (type) {
    case "instagram":
      return <InstagramIcon size={size} />;
    case "telegram":
      return <TelegramIcon size={size} />;
    case "bale":
      return <BaleIcon size={size} />;
    case "whatsapp":
      return <WhatsAppIcon size={size} />;
    case "install":
      return <Download size={size} style={{ pointerEvents: "none", display: "block" }} />;
    default:
      return null;
  }
}

/** Renders a custom uploaded icon or the built-in default for each platform. */
export default function SocialIcon({ type, size = 18, imageUrl }: SocialIconProps) {
  const url = imageUrl?.trim();
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          pointerEvents: "none",
          display: "block",
        }}
      />
    );
  }
  return <DefaultIcon type={type} size={size} />;
}
