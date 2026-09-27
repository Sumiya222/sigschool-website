import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { BRAND } from "@/lib/brand";

/* ------------------------------------------------------------------ *
 * LOGO-FIRST "SOLAR SYSTEM" HERO
 * A central brand mark (clickable link home) sits alone, with three
 * concentric, tilted elliptical orbit rings. One service satellite per
 * ring rides exactly on its orbit line via SVG <animateMotion> along an
 * <mpath>. Satellites are phased 120° apart on a shared 30s loop, each
 * trailing a faint drifting mote. Palette locked to the site system.
 * ------------------------------------------------------------------ */

const VIEW = 640;
const C = VIEW / 2; // center
const TILT = -16; // degrees — the "solar system" tilt
const LOOP = "30s";

type Orbit = {
  key: string;
  label: string;
  rx: number;
  color: string; // CSS var / hex used for stroke, dot, glow
  ringOpacity: number;
  chipWidth: number;
  begin: string; // negative offset → phase, all negative to avoid first-loop gaps
  moteBegin: string; // slightly less-advanced → trails behind the satellite
};

// Inner → outer. Phases 0° / 240° / 120° (all 120° apart), decreasing ring opacity.
const ORBITS: Orbit[] = [
  {
    key: "lower-school",
    label: BRAND.divisions[0].label,
    rx: 158,
    color: "#67e8f9",
    ringOpacity: 0.5,
    chipWidth: 108,
    begin: "-30s",
    moteBegin: "-29.4s",
  },
  {
    key: "middle-school",
    label: BRAND.divisions[1].label,
    rx: 224,
    color: "#818cf8",
    ringOpacity: 0.32,
    chipWidth: 118,
    begin: "-20s",
    moteBegin: "-19.4s",
  },
  {
    key: "upper-school",
    label: BRAND.divisions[2].label,
    rx: 288,
    color: "#f5c56b",
    ringOpacity: 0.18,
    chipWidth: 108,
    begin: "-10s",
    moteBegin: "-9.4s",
  },
];

const RY_FACTOR = 0.44; // foreshorten the circle into an ellipse before tilting

// Build a closed tilted-ellipse path so a satellite can ride it precisely.
function ellipsePath(rx: number, ry: number, rotDeg: number, steps = 160): string {
  const phi = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (2 * Math.PI * i) / steps;
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    const x = C + ex * cos - ey * sin;
    const y = C + ex * sin + ey * cos;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d + "Z";
}

// Static resting point for reduced-motion: point at parametric angle `frac` of loop.
function pointAt(rx: number, ry: number, rotDeg: number, frac: number) {
  const phi = (rotDeg * Math.PI) / 180;
  const t = 2 * Math.PI * frac;
  const ex = rx * Math.cos(t);
  const ey = ry * Math.sin(t);
  return {
    x: C + ex * Math.cos(phi) - ey * Math.sin(phi),
    y: C + ex * Math.sin(phi) + ey * Math.cos(phi),
  };
}

function Chip({ orbit }: { orbit: Orbit }) {
  const w = orbit.chipWidth;
  return (
    <g>
      {/* dot rides exactly on the orbit line (group origin) */}
      <circle r={11} fill={orbit.color} opacity={0.16} />
      <circle r={4.5} fill={orbit.color} />
      <circle
        r={4.5}
        fill="none"
        stroke={orbit.color}
        strokeOpacity={0.6}
        strokeWidth={6}
        opacity={0.25}
      />
      {/* label floats just above the dot */}
      <g transform="translate(0,-30)">
        <rect
          x={-w / 2}
          y={-13}
          width={w}
          height={24}
          rx={12}
          fill="rgba(8,10,24,0.82)"
          stroke={orbit.color}
          strokeOpacity={0.55}
          strokeWidth={1}
        />
        <text
          x={0}
          y={3.5}
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          letterSpacing={0.3}
          fill="#e7ecff"
          style={{ fontFamily: "var(--font-body, system-ui)" }}
        >
          {orbit.label}
        </text>
      </g>
    </g>
  );
}

export function FormationSequence() {
  const reduceMotion = useReducedMotion();

  const rings = useMemo(
    () =>
      ORBITS.map((o) => ({
        ...o,
        ry: o.rx * RY_FACTOR,
        path: ellipsePath(o.rx, o.rx * RY_FACTOR, TILT),
      })),
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex h-full min-h-[440px] w-full items-center justify-center overflow-hidden rounded-2xl border border-cyan/15 bg-[#05060f]/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-[2px]"
      aria-label={`${BRAND.shortName} orbit diagram: Lower School, Middle School, and Upper School orbiting one core`}
    >
      {/* HUD corner brackets to match the section frame */}
      <span aria-hidden className="hud-bracket left-2 top-2 border-l border-t opacity-50" />
      <span aria-hidden className="hud-bracket right-2 top-2 border-r border-t opacity-50" />
      <span aria-hidden className="hud-bracket bottom-2 left-2 border-b border-l opacity-50" />
      <span aria-hidden className="hud-bracket bottom-2 right-2 border-b border-r opacity-50" />

      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="h-full w-full max-h-[560px]"
        role="img"
        aria-hidden
      >
        <defs>
          {rings.map((r) => (
            <path key={`p-${r.key}`} id={`orbit-${r.key}`} d={r.path} />
          ))}
          <radialGradient id="coreHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.18" />
            <stop offset="55%" stopColor="#4f46e5" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.32" />
            <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.11" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* soft radial glow behind the center logo — cyan core within an indigo halo */}
        <circle cx={C} cy={C} r={188} fill="url(#coreHalo)" />
        <circle cx={C} cy={C} r={116} fill="url(#coreGlow)" />

        {/* orbit rings — tilted ellipses, decreasing opacity outward */}
        {rings.map((r) => (
          <use
            key={`ring-${r.key}`}
            href={`#orbit-${r.key}`}
            fill="none"
            stroke={r.color}
            strokeOpacity={r.ringOpacity}
            strokeWidth={1.25}
          />
        ))}

        {/* satellites + trailing motes */}
        {rings.map((r) => {
          if (reduceMotion) {
            const frac = r.key === "lower-school" ? 0 : r.key === "middle-school" ? 2 / 3 : 1 / 3;
            const p = pointAt(r.rx, r.ry, TILT, frac);
            return (
              <g key={`sat-${r.key}`} transform={`translate(${p.x} ${p.y})`}>
                <Chip orbit={r} />
              </g>
            );
          }
          return (
            <g key={`sat-${r.key}`}>
              {/* faint drifting mote trailing behind */}
              <circle r={2.6} fill={r.color} opacity={0.4}>
                <animateMotion dur={LOOP} begin={r.moteBegin} repeatCount="indefinite" rotate="0">
                  <mpath href={`#orbit-${r.key}`} />
                </animateMotion>
                <animate
                  attributeName="opacity"
                  values="0.12;0.5;0.12"
                  dur="3.2s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* satellite chip riding the orbit */}
              <g>
                <Chip orbit={r} />
                <animateMotion dur={LOOP} begin={r.begin} repeatCount="indefinite" rotate="0">
                  <mpath href={`#orbit-${r.key}`} />
                </animateMotion>
              </g>
            </g>
          );
        })}
      </svg>

      {/* CENTER BRAND MARK — the whole center links home. No stock logo for the
          placeholder brand, so a plain icon mark stands in. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Link
          to="/"
          aria-label={`${BRAND.shortName} — back to home`}
          className="pointer-events-auto group relative flex size-16 items-center justify-center rounded-full border border-cyan/30 bg-black/40 outline-none backdrop-blur-md transition-transform duration-300 hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-gold-bright/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          <GraduationCap
            className="size-8 text-cyan-bright drop-shadow-[0_0_12px_rgba(103,232,249,0.32)]"
            strokeWidth={1.5}
            aria-hidden
          />
        </Link>
      </div>

      {/* Caption — pinned to the panel base */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2.5 bg-gradient-to-t from-[#05060f] via-[#05060f]/85 to-transparent px-4 pb-4 pt-8">
        <p className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-gray-mid">
          One school · Three divisions
        </p>
      </div>
    </motion.div>
  );
}
