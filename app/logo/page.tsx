"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ByteLogo, ByteLogoMark } from "@/components/common/byte-logo";

const BYTE_BLUE = "#0047AB";

// ─── Animation Lab ──────────────────────────────────────────────────────────

const TILE = 52;
const ANIM_GAP = TILE / 4;
const ANIM_R = TILE / 5;
const ANIM_STEP = TILE + ANIM_GAP;
const ANIM_MARK_W = 2 * ANIM_STEP + TILE;
const ANIM_MARK_H = 3 * ANIM_STEP + TILE;

// All tile positions: [col, row]
const ALL_TILES: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [0, 2],
  [2, 2],
  [1, 3],
  [2, 3],
];

type Direction = "top" | "left" | "right" | "bottom" | null;

interface Step {
  c: number;
  r: number;
  dir: Direction;
}

// Helper: reading-order sequence (row by row, left to right)
const READING_ORDER: Step[] = [
  { c: 0, r: 0, dir: null },
  { c: 0, r: 1, dir: null },
  { c: 1, r: 1, dir: null },
  { c: 2, r: 1, dir: null },
  { c: 0, r: 2, dir: null },
  { c: 2, r: 2, dir: null },
  { c: 1, r: 3, dir: null },
  { c: 2, r: 3, dir: null },
];

const PRESETS: Record<
  string,
  { label: string; desc: string; sequence: Step[] }
> = {
  // ─── Original 4 (no rotation) ───
  trace: {
    label: "Trace",
    desc: "Draws a connected path through tiles",
    sequence: [
      { c: 0, r: 0, dir: null },
      { c: 0, r: 1, dir: "top" },
      { c: 1, r: 1, dir: "left" },
      { c: 2, r: 1, dir: "left" },
      { c: 0, r: 2, dir: "top" },
      { c: 2, r: 2, dir: "top" },
      { c: 2, r: 3, dir: "top" },
      { c: 1, r: 3, dir: "right" },
    ],
  },
  drop: {
    label: "Drop",
    desc: "Tiles fall into place from above",
    sequence: [
      { c: 0, r: 0, dir: "top" },
      { c: 0, r: 1, dir: "top" },
      { c: 1, r: 1, dir: "top" },
      { c: 2, r: 1, dir: "top" },
      { c: 0, r: 2, dir: "top" },
      { c: 2, r: 2, dir: "top" },
      { c: 1, r: 3, dir: "top" },
      { c: 2, r: 3, dir: "top" },
    ],
  },
  assemble: {
    label: "Assemble",
    desc: "Tiles fly in from scattered positions",
    sequence: READING_ORDER,
  },
  pop: {
    label: "Pop",
    desc: "Rapid scale-pop like bits being set",
    sequence: READING_ORDER,
  },
  // ─── New 5 (with z-axis rotation) ───
  tumble: {
    label: "Tumble",
    desc: "Tiles fall with spinning rotation, like tossed dice",
    sequence: [
      // Column-first order for a cascading tumble
      { c: 0, r: 0, dir: "top" },
      { c: 0, r: 1, dir: "top" },
      { c: 0, r: 2, dir: "top" },
      { c: 1, r: 1, dir: "top" },
      { c: 1, r: 3, dir: "top" },
      { c: 2, r: 1, dir: "top" },
      { c: 2, r: 2, dir: "top" },
      { c: 2, r: 3, dir: "top" },
    ],
  },
  deal: {
    label: "Deal",
    desc: "Tiles dealt outward from center like cards",
    sequence: [
      // Center-outward order
      { c: 1, r: 1, dir: null },
      { c: 0, r: 1, dir: null },
      { c: 2, r: 1, dir: null },
      { c: 0, r: 2, dir: null },
      { c: 2, r: 2, dir: null },
      { c: 1, r: 3, dir: null },
      { c: 0, r: 0, dir: null },
      { c: 2, r: 3, dir: null },
    ],
  },
  domino: {
    label: "Domino",
    desc: "Chain reaction — each tile whip-spins the next",
    sequence: [
      // Trace-like path for chain reaction feel
      { c: 0, r: 0, dir: null },
      { c: 0, r: 1, dir: null },
      { c: 1, r: 1, dir: null },
      { c: 2, r: 1, dir: null },
      { c: 0, r: 2, dir: null },
      { c: 2, r: 2, dir: null },
      { c: 2, r: 3, dir: null },
      { c: 1, r: 3, dir: null },
    ],
  },
  spiral: {
    label: "Spiral",
    desc: "Tiles orbit inward from a ring, spinning as they converge",
    sequence: READING_ORDER,
  },
  typewriter: {
    label: "Typewriter",
    desc: "Tiles stamp down in reading order with a rotational snap",
    sequence: READING_ORDER,
  },
};

// Deterministic scatter offsets per tile index
const SCATTER_OFFSETS = [
  { x: -280, y: -180 },
  { x: 220, y: -260 },
  { x: -200, y: 160 },
  { x: 300, y: -120 },
  { x: -320, y: 80 },
  { x: 260, y: 200 },
  { x: -160, y: 280 },
  { x: 180, y: -200 },
];

function getInitialState(
  step: Step,
  index: number,
  variant: string,
): { opacity: number; scale: number; x: number; y: number; rotate: number } {
  const offset = ANIM_STEP * 2;
  const alt = index % 2 === 0 ? 1 : -1; // alternating direction

  // ─── Original presets (no rotation) ───

  if (variant === "assemble") {
    const scatter = SCATTER_OFFSETS[index];
    return { opacity: 0, scale: 0.3, x: scatter.x, y: scatter.y, rotate: 0 };
  }

  if (variant === "pop") {
    return { opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 };
  }

  if (variant === "trace" || variant === "drop") {
    const dirOffsets: Record<string, { x: number; y: number }> = {
      top: { x: 0, y: -offset },
      bottom: { x: 0, y: offset },
      left: { x: -offset, y: 0 },
      right: { x: offset, y: 0 },
    };
    const off = step.dir ? dirOffsets[step.dir] : { x: 0, y: 0 };
    return { opacity: 0, scale: step.dir ? 0.7 : 0.4, ...off, rotate: 0 };
  }

  // ─── New rotation presets ───

  if (variant === "tumble") {
    // Fall from above with heavy spin — each tile gets more rotation
    const spin = (180 + index * 60) * alt;
    return { opacity: 0, scale: 0.6, x: 0, y: -offset * 1.5, rotate: spin };
  }

  if (variant === "deal") {
    // All originate from logomark center
    const cx = ANIM_MARK_W / 2 - (step.c * ANIM_STEP + TILE / 2);
    const cy = ANIM_MARK_H / 2 - (step.r * ANIM_STEP + TILE / 2);
    return { opacity: 0, scale: 0.3, x: cx, y: cy, rotate: 360 * alt };
  }

  if (variant === "domino") {
    // In-place whip spin — full 360° rotation, no translation
    return { opacity: 0, scale: 0.2, x: 0, y: 0, rotate: 360 * alt };
  }

  if (variant === "spiral") {
    // Start on a ring around center, spinning as they converge
    const angle = (index / 8) * Math.PI * 2 - Math.PI / 2;
    const radius = 220;
    const cx = ANIM_MARK_W / 2 - (step.c * ANIM_STEP + TILE / 2);
    const cy = ANIM_MARK_H / 2 - (step.r * ANIM_STEP + TILE / 2);
    return {
      opacity: 0,
      scale: 0.4,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      rotate: 720 * alt,
    };
  }

  if (variant === "typewriter") {
    // Stamps down with a rotational snap from tilted
    return { opacity: 0, scale: 0.85, x: 0, y: -12, rotate: -90 * alt };
  }

  // fallback
  return { opacity: 0, scale: 0.5, x: 0, y: 0, rotate: 0 };
}

function getTransition(
  index: number,
  stagger: number,
  variant: string,
): object {
  const delay = index * stagger;

  if (variant === "pop") {
    return {
      delay,
      type: "spring",
      stiffness: 600,
      damping: 15,
      mass: 0.4,
    };
  }

  if (variant === "drop") {
    return {
      delay,
      type: "spring",
      stiffness: 300,
      damping: 22,
      mass: 1.0,
    };
  }

  if (variant === "assemble") {
    return {
      delay: delay * 0.6,
      type: "spring",
      stiffness: 120,
      damping: 16,
      mass: 0.8,
    };
  }

  if (variant === "tumble") {
    return {
      delay,
      type: "spring",
      stiffness: 180,
      damping: 14,
      mass: 1.2,
    };
  }

  if (variant === "deal") {
    return {
      delay,
      type: "spring",
      stiffness: 160,
      damping: 18,
      mass: 0.7,
    };
  }

  if (variant === "domino") {
    return {
      delay,
      type: "spring",
      stiffness: 400,
      damping: 18,
      mass: 0.5,
    };
  }

  if (variant === "spiral") {
    return {
      delay: delay * 0.7,
      type: "spring",
      stiffness: 80,
      damping: 14,
      mass: 1.0,
    };
  }

  if (variant === "typewriter") {
    return {
      delay,
      type: "spring",
      stiffness: 500,
      damping: 25,
      mass: 0.4,
    };
  }

  // trace (default)
  return {
    delay,
    type: "spring",
    stiffness: 200,
    damping: 18,
    mass: 0.8,
  };
}

function LogoAnimationLab() {
  const [variant, setVariant] = useState("trace");
  const [speed, setSpeed] = useState(1.0);
  const [animKey, setAnimKey] = useState(0);
  const [dark, setDark] = useState(false);
  const [showGhosts, setShowGhosts] = useState(true);
  const [showWordmark, setShowWordmark] = useState(true);

  const current = PRESETS[variant];
  const staggerBase =
    variant === "pop" || variant === "domino"
      ? 0.07
      : variant === "typewriter"
        ? 0.12
        : variant === "spiral"
          ? 0.14
          : 0.18;
  const stagger = staggerBase / speed;
  const totalDuration = current.sequence.length * stagger;
  const color = dark ? "#FFFFFF" : BYTE_BLUE;
  const wordmarkGap = (TILE / 2) * (ANIM_MARK_H > 0 ? 1 : 1);

  const replay = () => setAnimKey((k) => k + 1);
  const selectVariant = (v: string) => {
    setVariant(v);
    setAnimKey((k) => k + 1);
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Animation Lab</h2>
        <p className="mt-1 text-sm text-gray-500">
          Experiment with logo entrance animations
        </p>
      </div>

      {/* Viewport */}
      <div
        className="relative overflow-hidden rounded-2xl transition-colors duration-300"
        style={{
          backgroundColor: dark ? "#000" : "#fff",
          border: dark ? "none" : "1px solid #e5e7eb",
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{ minHeight: 400, padding: 80 }}
        >
          <div key={animKey} className="flex items-center" style={{ gap: wordmarkGap }}>
            {/* Logomark */}
            <div
              className="relative"
              style={{ width: ANIM_MARK_W, height: ANIM_MARK_H }}
            >
              {/* Ghost grid */}
              {showGhosts &&
                ALL_TILES.map(([c, r]) => (
                  <div
                    key={`ghost-${c}-${r}`}
                    className="absolute"
                    style={{
                      width: TILE,
                      height: TILE,
                      left: c * ANIM_STEP,
                      top: r * ANIM_STEP,
                      borderRadius: ANIM_R,
                      border: `1.5px dashed ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,71,171,0.1)"}`,
                    }}
                  />
                ))}

              {/* Animated tiles */}
              {current.sequence.map((step, i) => {
                const initial = getInitialState(step, i, variant);
                return (
                  <motion.div
                    key={`tile-${step.c}-${step.r}`}
                    className="absolute"
                    style={{
                      width: TILE,
                      height: TILE,
                      left: step.c * ANIM_STEP,
                      top: step.r * ANIM_STEP,
                      borderRadius: ANIM_R,
                      backgroundColor: color,
                    }}
                    initial={initial}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
                    transition={getTransition(i, stagger, variant)}
                  />
                );
              })}
            </div>

            {/* Wordmark */}
            {showWordmark && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: totalDuration + 0.15,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  fontFamily: "'Sansation', 'Inter', system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: ANIM_MARK_H * 0.5,
                  lineHeight: 1,
                  color,
                  letterSpacing: "-0.01em",
                }}
              >
                byte
              </motion.span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-6">
        {/* Preset buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs font-medium uppercase tracking-wider text-gray-400">
            Preset
          </span>
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => selectVariant(key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                variant === key
                  ? "bg-[#0047AB] text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              style={
                variant === key
                  ? { backgroundColor: BYTE_BLUE }
                  : undefined
              }
              title={preset.desc}
            >
              {preset.label}
            </button>
          ))}
          <div className="mx-2 h-6 w-px bg-gray-200" />
          <button
            onClick={replay}
            className="rounded-lg bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Replay
          </button>
        </div>

        {/* Speed + toggles */}
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-3 text-sm text-gray-600">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Speed
            </span>
            <input
              type="range"
              min={0.25}
              max={3}
              step={0.25}
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="h-1.5 w-32 cursor-pointer accent-[#0047AB]"
            />
            <span className="w-10 font-mono text-xs text-gray-500">
              {speed}x
            </span>
          </label>

          <div className="h-6 w-px bg-gray-200" />

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={dark}
              onChange={(e) => setDark(e.target.checked)}
              className="accent-[#0047AB]"
            />
            Dark
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showGhosts}
              onChange={(e) => setShowGhosts(e.target.checked)}
              className="accent-[#0047AB]"
            />
            Ghost grid
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showWordmark}
              onChange={(e) => setShowWordmark(e.target.checked)}
              className="accent-[#0047AB]"
            />
            Wordmark
          </label>
        </div>
      </div>
    </section>
  );
}

function ColorSwatch({
  color,
  label,
  hex,
  border,
}: {
  color: string;
  label: string;
  hex: string;
  border?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div
        className="h-20 w-full rounded-xl"
        style={{
          backgroundColor: color,
          border: border ? "1px solid #e5e7eb" : undefined,
        }}
      />
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="font-mono text-xs text-gray-500">{hex}</p>
    </div>
  );
}

function ConstructionDiagram() {
  const S = 40;
  const GAP = 10;
  const R = 8;
  const STEP = 50;
  const W = 2 * STEP + S; // 140 (3 columns)
  const H = 3 * STEP + S; // 190 (4 rows)
  const PAD = 60;
  const VB_W = W + PAD * 2;
  const VB_H = H + PAD * 2;

  const bits: [number, number][] = [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [0, 2],
    [2, 2],
    [1, 3],
    [2, 3],
  ];

  const dimColor = "#94a3b8";
  const accentColor = "#ef4444";

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ maxWidth: 440 }}
      className="mx-auto"
    >
      {/* Grid squares */}
      {bits.map(([c, r]) => (
        <rect
          key={`${c}-${r}`}
          x={PAD + c * STEP}
          y={PAD + r * STEP}
          width={S}
          height={S}
          rx={R}
          fill={BYTE_BLUE}
          opacity={0.15}
          stroke={BYTE_BLUE}
          strokeWidth={1.5}
        />
      ))}

      {/* Highlight gap between (0,1) and (1,1) */}
      <line
        x1={PAD + S}
        y1={PAD + 1 * STEP + S / 2}
        x2={PAD + 1 * STEP}
        y2={PAD + 1 * STEP + S / 2}
        stroke={accentColor}
        strokeWidth={1.5}
      />
      <text
        x={PAD + S + GAP / 2}
        y={PAD + 1 * STEP + S / 2 - 6}
        textAnchor="middle"
        fontSize={8}
        fill={accentColor}
        fontFamily="monospace"
      >
        s/4
      </text>

      {/* Corner radius callout on (0,0) */}
      <circle cx={PAD + R} cy={PAD + R} r={2} fill={accentColor} />
      <line
        x1={PAD + R}
        y1={PAD + R}
        x2={PAD + R + 25}
        y2={PAD + R - 14}
        stroke={accentColor}
        strokeWidth={1}
      />
      <text
        x={PAD + R + 27}
        y={PAD + R - 11}
        fontSize={8}
        fill={accentColor}
        fontFamily="monospace"
      >
        r = s/5
      </text>

      {/* Overall height dimension */}
      <line
        x1={PAD - 20}
        y1={PAD}
        x2={PAD - 20}
        y2={PAD + H}
        stroke={dimColor}
        strokeWidth={1}
      />
      <line
        x1={PAD - 25}
        y1={PAD}
        x2={PAD - 15}
        y2={PAD}
        stroke={dimColor}
        strokeWidth={1}
      />
      <line
        x1={PAD - 25}
        y1={PAD + H}
        x2={PAD - 15}
        y2={PAD + H}
        stroke={dimColor}
        strokeWidth={1}
      />
      <text
        x={PAD - 22}
        y={PAD + H / 2}
        textAnchor="middle"
        fontSize={9}
        fill={dimColor}
        fontFamily="monospace"
        transform={`rotate(-90, ${PAD - 22}, ${PAD + H / 2})`}
      >
        4s + 3(s/4)
      </text>

      {/* Overall width dimension */}
      <line
        x1={PAD}
        y1={PAD + H + 20}
        x2={PAD + W}
        y2={PAD + H + 20}
        stroke={dimColor}
        strokeWidth={1}
      />
      <line
        x1={PAD}
        y1={PAD + H + 15}
        x2={PAD}
        y2={PAD + H + 25}
        stroke={dimColor}
        strokeWidth={1}
      />
      <line
        x1={PAD + W}
        y1={PAD + H + 15}
        x2={PAD + W}
        y2={PAD + H + 25}
        stroke={dimColor}
        strokeWidth={1}
      />
      <text
        x={PAD + W / 2}
        y={PAD + H + 35}
        textAnchor="middle"
        fontSize={9}
        fill={dimColor}
        fontFamily="monospace"
      >
        3s + 2(s/4)
      </text>
    </svg>
  );
}

export default function LogoPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Load Sansation Bold */}
      <link
        href="https://fonts.cdnfonts.com/css/sansation"
        rel="stylesheet"
      />

      <div className="mx-auto max-w-5xl space-y-20 px-8 py-16">
        {/* Header */}
        <header className="space-y-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Byte Logo</h1>
          <p className="text-lg text-gray-500">Brand identity system</p>
        </header>

        {/* Animation Lab */}
        <LogoAnimationLab />

        {/* Primary Logo (Full Color) */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Primary Logo</h2>
            <p className="mt-1 text-sm text-gray-500">
              Full color &mdash; Byte Blue (#0047AB)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-16 rounded-2xl border border-gray-200 bg-white p-12">
            <div className="space-y-3 text-center">
              <ByteLogoMark variant="color" size={120} />
              <p className="text-xs font-medium text-gray-400">Logomark</p>
            </div>
            <div className="space-y-3 text-center">
              <div className="flex h-[120px] items-center">
                <span
                  style={{
                    fontFamily: "'Sansation', sans-serif",
                    fontWeight: 700,
                    fontSize: 60,
                    lineHeight: 1,
                    color: BYTE_BLUE,
                  }}
                >
                  byte
                </span>
              </div>
              <p className="text-xs font-medium text-gray-400">Wordmark</p>
            </div>
            <div className="space-y-3 text-center">
              <ByteLogo variant="color" height={120} />
              <p className="text-xs font-medium text-gray-400">
                Full logo mark
              </p>
            </div>
          </div>
        </section>

        {/* Black Logo */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Black Logo</h2>
            <p className="mt-1 text-sm text-gray-500">
              Single-color for print and limited color applications
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-16 rounded-2xl border border-gray-200 bg-white p-12">
            <div className="space-y-3 text-center">
              <ByteLogoMark variant="black" size={120} />
              <p className="text-xs font-medium text-gray-400">Logomark</p>
            </div>
            <div className="space-y-3 text-center">
              <div className="flex h-[120px] items-center">
                <span
                  style={{
                    fontFamily: "'Sansation', sans-serif",
                    fontWeight: 700,
                    fontSize: 60,
                    lineHeight: 1,
                    color: "#000000",
                  }}
                >
                  byte
                </span>
              </div>
              <p className="text-xs font-medium text-gray-400">Wordmark</p>
            </div>
            <div className="space-y-3 text-center">
              <ByteLogo variant="black" height={120} />
              <p className="text-xs font-medium text-gray-400">
                Full logo mark
              </p>
            </div>
          </div>
        </section>

        {/* Reverse Logo */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Reverse Logo</h2>
            <p className="mt-1 text-sm text-gray-500">
              White on dark backgrounds (min 4.5:1 contrast ratio)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-16 rounded-2xl bg-black p-12">
            <div className="space-y-3 text-center">
              <ByteLogoMark variant="white" size={120} />
              <p className="text-xs font-medium text-gray-500">Logomark</p>
            </div>
            <div className="space-y-3 text-center">
              <div className="flex h-[120px] items-center">
                <span
                  style={{
                    fontFamily: "'Sansation', sans-serif",
                    fontWeight: 700,
                    fontSize: 60,
                    lineHeight: 1,
                    color: "#FFFFFF",
                  }}
                >
                  byte
                </span>
              </div>
              <p className="text-xs font-medium text-gray-500">Wordmark</p>
            </div>
            <div className="space-y-3 text-center">
              <ByteLogo variant="white" height={120} />
              <p className="text-xs font-medium text-gray-400">
                Full logo mark
              </p>
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Color Palette</h2>
            <p className="mt-1 text-sm text-gray-500">
              Primary brand color with opacity variants
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            <ColorSwatch
              color={BYTE_BLUE}
              label="Byte Blue"
              hex="#0047AB"
            />
            <ColorSwatch
              color="rgba(0,71,171,0.75)"
              label="75%"
              hex="#0047ABBF"
            />
            <ColorSwatch
              color="rgba(0,71,171,0.5)"
              label="50%"
              hex="#0047AB80"
            />
            <ColorSwatch
              color="rgba(0,71,171,0.25)"
              label="25%"
              hex="#0047AB40"
            />
            <ColorSwatch
              color="rgba(0,71,171,0.1)"
              label="10%"
              hex="#0047AB1A"
            />
            <ColorSwatch
              color="rgba(0,71,171,0.05)"
              label="5%"
              hex="#0047AB0D"
            />
          </div>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            <ColorSwatch
              color="#FFFFFF"
              label="White"
              hex="#FFFFFF"
              border
            />
            <ColorSwatch color="#000000" label="Black" hex="#000000" />
          </div>
        </section>

        {/* Sizing */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Sizing</h2>
            <p className="mt-1 text-sm text-gray-500">
              Logo scales proportionally at any size
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-12 rounded-2xl border border-gray-200 p-12">
            {[120, 80, 60, 40, 24].map((size) => (
              <div key={size} className="space-y-3 text-center">
                <ByteLogo variant="color" height={size} />
                <p className="text-xs text-gray-400">{size}px</p>
              </div>
            ))}
          </div>
        </section>

        {/* Construction & Spacing */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Construction & Spacing</h2>
            <p className="mt-1 text-sm text-gray-500">
              Modular grid system with proportional measurements
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 p-12">
            <ConstructionDiagram />
            <div className="mx-auto mt-8 max-w-md space-y-2 text-sm text-gray-600">
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <span>Square side length</span>
                <span className="font-mono font-medium text-gray-900">s</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <span>Gap between bits</span>
                <span className="font-mono font-medium text-gray-900">
                  s / 4
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <span>Corner radius</span>
                <span className="font-mono font-medium text-gray-900">
                  s / 5
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <span>Wordmark height</span>
                <span className="font-mono font-medium text-gray-900">
                  1/2 logo height
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <span>Mark-to-wordmark gap</span>
                <span className="font-mono font-medium text-gray-900">
                  s / 2
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Clear space (minimum)</span>
                <span className="font-mono font-medium text-gray-900">
                  s / 2
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Typography</h2>
            <p className="mt-1 text-sm text-gray-500">
              Sansation Bold &mdash; wordmark use only
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 p-12">
            <p
              className="text-6xl"
              style={{
                fontFamily: "'Sansation', sans-serif",
                fontWeight: 700,
              }}
            >
              Sansation Bold
            </p>
            <div className="mt-8 space-y-2 text-gray-500">
              <p
                style={{
                  fontFamily: "'Sansation', sans-serif",
                  fontWeight: 700,
                }}
              >
                abcdefghijklmnopqrstuvwxyz
              </p>
              <p
                style={{
                  fontFamily: "'Sansation', sans-serif",
                  fontWeight: 700,
                }}
              >
                ABCDEFGHIJKLMNOPQRSTUVWXYZ
              </p>
              <p
                style={{
                  fontFamily: "'Sansation', sans-serif",
                  fontWeight: 700,
                }}
              >
                0123456789
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-8 text-center text-sm text-gray-400">
          Byte Brand Guidelines
        </footer>
      </div>
    </div>
  );
}
