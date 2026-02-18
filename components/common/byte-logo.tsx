"use client";

const BYTE_BLUE = "#0047AB";

/**
 * Logomark grid pattern (3 cols x 4 rows = 8 bits = 1 byte):
 *   ■  .  .
 *   ■  ■  ■
 *   ■  .  ■
 *   .  ■  ■
 *
 * Construction rules:
 *   - Gap between bits: 1/4 of side length
 *   - Corner radius: 1/5 of side length
 *   - Wordmark height: 1/2 of logomark height
 *   - Gap between mark and wordmark: 1/2 of one square width
 */
const BITS: [col: number, row: number][] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [0, 2],
  [2, 2],
  [1, 3],
  [2, 3],
];

// SVG base units
const S = 40; // square side length
const GAP = S / 4; // 10
const R = S / 5; // 8
const STEP = S + GAP; // 50
const MARK_W = 2 * STEP + S; // 140 (3 columns)
const MARK_H = 3 * STEP + S; // 190 (4 rows)

const FILL = {
  color: BYTE_BLUE,
  black: "#000000",
  white: "#FFFFFF",
} as const;

type Variant = "color" | "black" | "white";

interface ByteLogoMarkProps {
  variant?: Variant;
  size?: number;
  className?: string;
}

export function ByteLogoMark({
  variant = "color",
  size = 40,
  className,
}: ByteLogoMarkProps) {
  const scale = size / MARK_H;
  return (
    <svg
      width={MARK_W * scale}
      height={size}
      viewBox={`0 0 ${MARK_W} ${MARK_H}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Byte logomark"
      role="img"
    >
      {BITS.map(([c, r]) => (
        <rect
          key={`${c}-${r}`}
          x={c * STEP}
          y={r * STEP}
          width={S}
          height={S}
          rx={R}
          fill={FILL[variant]}
        />
      ))}
    </svg>
  );
}

interface ByteLogoProps {
  variant?: Variant;
  height?: number;
  showWordmark?: boolean;
  className?: string;
}

export function ByteLogo({
  variant = "color",
  height = 40,
  showWordmark = true,
  className,
}: ByteLogoProps) {
  if (!showWordmark) {
    return (
      <ByteLogoMark variant={variant} size={height} className={className} />
    );
  }

  // Wordmark height = 1/2 of logomark height
  const wordmarkFontSize = height * 0.5;
  // Gap between mark and wordmark = 1/2 of one square width, proportional to height
  const gap = (height * S) / (2 * MARK_H);

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: `${gap}px`,
        height: `${height}px`,
      }}
    >
      <ByteLogoMark variant={variant} size={height} />
      <span
        style={{
          fontFamily: "'Sansation', 'Inter', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: `${wordmarkFontSize}px`,
          lineHeight: 1,
          color: FILL[variant],
          letterSpacing: "-0.01em",
        }}
      >
        byte
      </span>
    </div>
  );
}
