"use client";
import { useRef, useState } from "react";
import { Play } from "lucide-react";

interface Props {
  src: string;
  /** object-fit for the video; use "contain" on white-background cards. */
  fit?: "cover" | "contain";
  /** Extra styles for the absolutely-positioned wrapper. */
  style?: React.CSSProperties;
}

/**
 * Product list-card video preview. Renders over the card's image (absolute,
 * inset 0 — the parent media container must be `position: relative`), shows
 * the video's first frame, and plays it muted/looping while hovered. No
 * controls are rendered and no clicks are swallowed, so the card link still
 * navigates to the product page where the video can be watched with sound.
 */
export default function ProductVideoPreview({ src, fit = "cover", style }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div
      style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}
      onMouseEnter={() => { ref.current?.play().then(() => setPlaying(true)).catch(() => {}); }}
      onMouseLeave={() => { const v = ref.current; if (v) { v.pause(); v.currentTime = 0; } setPlaying(false); }}
    >
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        style={{ width: "100%", height: "100%", objectFit: fit, display: "block" }}
      />
      {!playing && (
        <span style={{
          position: "absolute", bottom: 8, left: 8, display: "inline-flex", alignItems: "center", gap: 4,
          backgroundColor: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, fontWeight: 700,
          padding: "3px 8px", borderRadius: 16, pointerEvents: "none",
        }}>
          <Play size={10} fill="#fff" /> ویدیو
        </span>
      )}
    </div>
  );
}
