import type { SocialLinkType } from "@/lib/social-links";
import SocialIcon from "./SocialIcon";

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

interface SocialIconLinkProps {
  href: string;
  label: string;
  type: SocialLinkType;
  iconUrl?: string;
  hover: string;
  size?: number;
  variant?: "navbar" | "footer";
}

export default function SocialIconLink({
  href,
  label,
  type,
  iconUrl,
  hover,
  size = 18,
  variant = "navbar",
}: SocialIconLinkProps) {
  const footer = variant === "footer";

  return (
    <a
      href={href}
      aria-label={label}
      target={isExternalHref(href) ? "_blank" : undefined}
      rel={isExternalHref(href) ? "noopener noreferrer" : undefined}
      className={footer ? undefined : "nav-social-icon"}
      style={{
        color: footer ? "rgba(255,255,255,0.78)" : "var(--dg-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: footer ? "38px" : "34px",
        height: footer ? "38px" : "34px",
        backgroundColor: footer ? "rgba(255,255,255,0.08)" : "var(--dg-bg-2)",
        border: footer ? "1px solid rgba(255,255,255,0.14)" : "1px solid var(--dg-line)",
        borderRadius: "50%",
        transition: "all 0.2s",
        cursor: "pointer",
        position: "relative",
        zIndex: 1,
        flexShrink: 0,
        textDecoration: "none",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        if (footer) {
          el.style.backgroundColor = "#fff";
          el.style.borderColor = "#fff";
        }
        el.style.color = hover;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        if (footer) {
          el.style.backgroundColor = "rgba(255,255,255,0.08)";
          el.style.borderColor = "rgba(255,255,255,0.14)";
          el.style.color = "rgba(255,255,255,0.78)";
        } else {
          el.style.color = "var(--dg-muted)";
        }
      }}
    >
      <span style={{ display: "flex", pointerEvents: "none" }}>
        <SocialIcon type={type} size={size} imageUrl={iconUrl} />
      </span>
    </a>
  );
}
