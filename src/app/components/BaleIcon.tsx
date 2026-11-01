interface BaleIconProps {
  size?: number;
}

/** Official-style Bale messenger icon (green bubble + white checkmark). */
export default function BaleIcon({ size = 18 }: BaleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ pointerEvents: "none", display: "block" }}>
      <path
        fill="#0BCF80"
        d="M12 2.75c-4.83 0-8.75 3.76-8.75 8.4 0 2.45 1.06 4.64 2.74 6.15l-1.32 3.96c-.24.73.58 1.41 1.28 1.1l2.71-1.63a8.4 8.4 0 0 0 3.34.68c4.83 0 8.75-3.76 8.75-8.4S16.83 2.75 12 2.75z"
      />
      <path fill="#0BCF80" d="M5.45 3.95 3.35 1.85 2.75 5.05z" />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.1 12.05 10.75 14.7 16.15 8.85"
      />
    </svg>
  );
}
