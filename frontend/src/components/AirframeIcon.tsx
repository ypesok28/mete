"use client";

// Top-down airframe glyphs, drawn at sizes proportional to tier so silhouette AREA itself
// encodes "small vs big" (structural meaning: 5 small → 1 big reads before the text). Refined
// for the premium pass: clean filled forms with a faint inner detail and soft rim, colored by
// the live accent via currentColor.
//
//   SCOUT-S  — micro recon quad (four rotor discs + body)
//   ISR-M    — slim swept fixed-wing
//   STRIKE-L — larger blended-delta loitering shape
//
// `solid` (default) = filled glyph for the stage; pass solid={false} for a lighter outline
// treatment used in the dense per-target assignment grid.

interface AirframeIconProps {
  tierId: string;
  size: number; // px bounding box; caller passes the per-tier proportional size
  solid?: boolean;
  className?: string;
}

// per-tier relative sizing — STRIKE clearly ~2× SCOUT so area carries the tier read.
export const TIER_SIZE: Record<string, number> = {
  SCOUT_S: 46,
  ISR_M: 66,
  STRIKE_L: 96,
};

export function AirframeIcon({ tierId, size, solid = true, className }: AirframeIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 100 100",
    role: "img" as const,
    "aria-label": tierId,
    className,
  };
  const fill = solid ? "currentColor" : "none";
  const stroke = "currentColor";
  const sw = solid ? 0 : 4;

  if (tierId === "SCOUT_S") {
    return (
      <svg {...common}>
        <g
          stroke="currentColor"
          strokeWidth={solid ? 5 : 4.5}
          strokeLinecap="round"
          fill="none"
        >
          <line x1="50" y1="50" x2="25" y2="25" />
          <line x1="50" y1="50" x2="75" y2="25" />
          <line x1="50" y1="50" x2="25" y2="75" />
          <line x1="50" y1="50" x2="75" y2="75" />
        </g>
        <g>
          {/* rotor discs — soft halos */}
          <circle cx="23" cy="23" r="12" fill="currentColor" opacity={solid ? 0.32 : 0.22} />
          <circle cx="77" cy="23" r="12" fill="currentColor" opacity={solid ? 0.32 : 0.22} />
          <circle cx="23" cy="77" r="12" fill="currentColor" opacity={solid ? 0.32 : 0.22} />
          <circle cx="77" cy="77" r="12" fill="currentColor" opacity={solid ? 0.32 : 0.22} />
          <circle cx="23" cy="23" r="12" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
          <circle cx="77" cy="23" r="12" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
          <circle cx="23" cy="77" r="12" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
          <circle cx="77" cy="77" r="12" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
          {/* central body */}
          <rect x="41" y="41" width="18" height="18" rx="4" fill="currentColor" />
        </g>
      </svg>
    );
  }

  if (tierId === "ISR_M") {
    return (
      <svg {...common}>
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
          {/* swept high-aspect wing */}
          <path d="M50 42 L95 60 Q97 62 95 65 L50 54 L5 65 Q3 62 5 60 Z" fill="currentColor" />
          {/* fuselage */}
          <path d="M50 6 Q54 8 54 18 L53 84 Q53 88 50 88 Q47 88 47 84 L46 18 Q46 8 50 6 Z" fill="currentColor" />
          {/* tailplane */}
          <path d="M50 76 L68 88 Q70 90 68 92 L50 86 L32 92 Q30 90 32 88 Z" fill="currentColor" />
        </g>
      </svg>
    );
  }

  if (tierId === "STRIKE_L") {
    return (
      <svg {...common}>
        {/* broad blended delta, pointed nose, twin trailing edge */}
        <path
          d="M50 5
             C 53 5 55 9 56 18
             L 60 38
             L 95 84
             C 96 86 94 88 92 87
             L 70 80
             L 60 92
             C 59 94 56 94 55 91
             L 50 74
             L 45 91
             C 44 94 41 94 40 92
             L 30 80
             L 8 87
             C 6 88 4 86 5 84
             L 40 38
             L 44 18
             C 45 9 47 5 50 5 Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="26" y="26" width="48" height="48" rx="8" fill="currentColor" />
    </svg>
  );
}
