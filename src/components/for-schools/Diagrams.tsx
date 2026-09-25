import type React from "react";

/**
 * Decorative technical line drawings for the beige drafting-sheet bands.
 * Purely presentational: no text content, hidden from assistive tech.
 */

export type DiagramKind =
  "arm" | "mesh" | "gears" | "circuit" | "sensor" | "rocket" | "comet" | "drone" | "robot";

const stroke = "color-mix(in oklab, #1b3a5c 48%, transparent)";
const faint = "color-mix(in oklab, #1b3a5c 26%, transparent)";

function Arm() {
  return (
    <svg viewBox="0 0 240 240" fill="none" className="size-full">
      <circle cx="48" cy="196" r="26" stroke={stroke} strokeWidth="1.2" />
      <circle cx="48" cy="196" r="8" stroke={stroke} strokeWidth="1.2" />
      <path d="M48 196 L108 96" stroke={stroke} strokeWidth="2" />
      <path d="M108 96 L190 66" stroke={stroke} strokeWidth="2" />
      <circle cx="108" cy="96" r="12" stroke={stroke} strokeWidth="1.2" />
      <circle cx="190" cy="66" r="9" stroke={stroke} strokeWidth="1.2" />
      <path d="M190 66 L214 48 M190 66 L212 78" stroke={stroke} strokeWidth="1.6" />
      <path d="M20 222 H220" stroke={faint} strokeWidth="1" strokeDasharray="4 6" />
      <path
        d="M48 196 A 96 96 0 0 1 144 100"
        stroke={faint}
        strokeWidth="1"
        strokeDasharray="3 7"
      />
      <path d="M108 96 L108 40" stroke={faint} strokeWidth="1" strokeDasharray="3 5" />
      <path d="M100 40 H116" stroke={faint} strokeWidth="1" />
    </svg>
  );
}

function Mesh() {
  const cols = [26, 96, 166, 226];
  const rows = [[40, 96, 152, 208], [26, 82, 138, 194, 226], [54, 110, 166], [110]];
  return (
    <svg viewBox="0 0 252 240" fill="none" className="size-full">
      {cols
        .slice(0, 3)
        .map((x, ci) =>
          rows[ci].map((y) =>
            rows[ci + 1].map((y2) => (
              <line
                key={`${ci}-${y}-${y2}`}
                x1={x}
                y1={y}
                x2={cols[ci + 1]}
                y2={y2}
                stroke={faint}
                strokeWidth="0.8"
              />
            )),
          ),
        )}
      {cols.map((x, ci) =>
        rows[ci].map((y) => (
          <circle key={`n-${ci}-${y}`} cx={x} cy={y} r="5" stroke={stroke} strokeWidth="1.2" />
        )),
      )}
    </svg>
  );
}

function Gears() {
  const teeth = (cx: number, cy: number, r: number, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return (
        <line
          key={i}
          x1={cx + Math.cos(a) * r}
          y1={cy + Math.sin(a) * r}
          x2={cx + Math.cos(a) * (r + 10)}
          y2={cy + Math.sin(a) * (r + 10)}
          stroke={stroke}
          strokeWidth="1.4"
        />
      );
    });
  return (
    <svg viewBox="0 0 240 240" fill="none" className="size-full">
      <circle cx="86" cy="104" r="52" stroke={stroke} strokeWidth="1.4" />
      <circle cx="86" cy="104" r="14" stroke={stroke} strokeWidth="1.2" />
      {teeth(86, 104, 52, 16)}
      <circle cx="182" cy="168" r="34" stroke={stroke} strokeWidth="1.4" />
      <circle cx="182" cy="168" r="9" stroke={stroke} strokeWidth="1.2" />
      {teeth(182, 168, 34, 11)}
      <path d="M86 104 L182 168" stroke={faint} strokeWidth="1" strokeDasharray="3 6" />
    </svg>
  );
}

function Circuit() {
  return (
    <svg viewBox="0 0 240 240" fill="none" className="size-full">
      <rect x="76" y="76" width="88" height="88" rx="4" stroke={stroke} strokeWidth="1.4" />
      <rect x="98" y="98" width="44" height="44" rx="2" stroke={faint} strokeWidth="1" />
      {[0, 1, 2, 3].map((i) => {
        const p = 96 + i * 16;
        return (
          <g key={i}>
            <path d={`M76 ${p} H24`} stroke={stroke} strokeWidth="1" />
            <path d={`M164 ${p} H216`} stroke={stroke} strokeWidth="1" />
            <path d={`M${p} 76 V24`} stroke={stroke} strokeWidth="1" />
            <path d={`M${p} 164 V216`} stroke={stroke} strokeWidth="1" />
            <circle cx="24" cy={p} r="2.5" stroke={faint} strokeWidth="1" />
            <circle cx="216" cy={p} r="2.5" stroke={faint} strokeWidth="1" />
            <circle cx={p} cy="24" r="2.5" stroke={faint} strokeWidth="1" />
            <circle cx={p} cy="216" r="2.5" stroke={faint} strokeWidth="1" />
          </g>
        );
      })}
    </svg>
  );
}

function Sensor() {
  return (
    <svg viewBox="0 0 240 240" fill="none" className="size-full">
      <circle cx="120" cy="120" r="12" stroke={stroke} strokeWidth="1.4" />
      {[34, 60, 86, 112].map((r) => (
        <path
          key={r}
          d={`M ${120 - r * 0.72} ${120 - r * 0.72} A ${r} ${r} 0 0 1 ${120 + r * 0.72} ${120 - r * 0.72}`}
          stroke={r % 52 === 34 ? stroke : faint}
          strokeWidth="1"
        />
      ))}
      <path d="M120 120 L120 8" stroke={faint} strokeWidth="1" strokeDasharray="4 6" />
      <path d="M120 120 L214 174" stroke={faint} strokeWidth="1" strokeDasharray="4 6" />
      <path d="M120 120 L26 174" stroke={faint} strokeWidth="1" strokeDasharray="4 6" />
      <path d="M40 200 q 20 -34 40 0 t 40 0 t 40 0 t 40 0" stroke={stroke} strokeWidth="1.2" />
    </svg>
  );
}

function Rocket() {
  return (
    <svg viewBox="0 0 240 240" fill="none" className="size-full">
      <path
        d="M120 16 C150 56 162 104 162 146 H78 C78 104 90 56 120 16 Z"
        stroke={stroke}
        strokeWidth="1.4"
      />
      <circle cx="120" cy="86" r="16" stroke={stroke} strokeWidth="1.2" />
      <circle cx="120" cy="86" r="7" stroke={faint} strokeWidth="1" />
      <path d="M78 118 L44 168 L78 156 Z" stroke={stroke} strokeWidth="1.2" />
      <path d="M162 118 L196 168 L162 156 Z" stroke={stroke} strokeWidth="1.2" />
      <path d="M96 146 H144 L138 172 H102 Z" stroke={stroke} strokeWidth="1.2" />
      <path
        d="M104 178 q 16 26 0 50 M120 178 q 16 30 0 56 M136 178 q -16 26 0 50"
        stroke={faint}
        strokeWidth="1"
      />
      <path d="M120 16 V4" stroke={faint} strokeWidth="1" strokeDasharray="3 5" />
      <path d="M60 146 H24 M24 140 V152" stroke={faint} strokeWidth="1" />
    </svg>
  );
}

function Comet() {
  return (
    <svg viewBox="0 0 240 240" fill="none" className="size-full">
      <circle cx="168" cy="76" r="26" stroke={stroke} strokeWidth="1.4" />
      <circle cx="168" cy="76" r="11" stroke={faint} strokeWidth="1" />
      <path d="M146 92 L34 196 M156 100 L58 210 M136 80 L20 168" stroke={faint} strokeWidth="1" />
      <path d="M168 40 A 36 36 0 0 1 204 76" stroke={faint} strokeWidth="1" strokeDasharray="3 6" />
      <ellipse
        cx="120"
        cy="120"
        rx="112"
        ry="46"
        transform="rotate(-32 120 120)"
        stroke={faint}
        strokeWidth="0.9"
        strokeDasharray="5 7"
      />
      <circle cx="46" cy="44" r="2.5" stroke={stroke} strokeWidth="1" />
      <circle cx="86" cy="26" r="2" stroke={faint} strokeWidth="1" />
      <circle cx="26" cy="102" r="2" stroke={faint} strokeWidth="1" />
    </svg>
  );
}

function Drone() {
  const arm = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <circle cx={x} cy={y} r="30" stroke={faint} strokeWidth="1" strokeDasharray="4 5" />
      <circle cx={x} cy={y} r="9" stroke={stroke} strokeWidth="1.3" />
      <path d={`M${x} ${y} L120 120`} stroke={stroke} strokeWidth="1.6" />
    </g>
  );
  return (
    <svg viewBox="0 0 240 240" fill="none" className="size-full">
      {arm(48, 60)}
      {arm(192, 60)}
      {arm(48, 180)}
      {arm(192, 180)}
      <rect x="94" y="100" width="52" height="40" rx="6" stroke={stroke} strokeWidth="1.4" />
      <circle cx="120" cy="150" r="7" stroke={stroke} strokeWidth="1.2" />
      <path d="M120 157 V196" stroke={faint} strokeWidth="1" strokeDasharray="3 5" />
      <path d="M96 210 H144" stroke={faint} strokeWidth="1" />
    </svg>
  );
}

function Robot() {
  return (
    <svg viewBox="0 0 240 240" fill="none" className="size-full">
      <rect x="76" y="46" width="88" height="66" rx="10" stroke={stroke} strokeWidth="1.4" />
      <circle cx="102" cy="78" r="9" stroke={stroke} strokeWidth="1.2" />
      <circle cx="138" cy="78" r="9" stroke={stroke} strokeWidth="1.2" />
      <path d="M104 98 H136" stroke={faint} strokeWidth="1" />
      <path d="M120 46 V26" stroke={stroke} strokeWidth="1.2" />
      <circle cx="120" cy="20" r="6" stroke={stroke} strokeWidth="1.2" />
      <rect x="66" y="122" width="108" height="64" rx="8" stroke={stroke} strokeWidth="1.4" />
      <rect x="90" y="140" width="60" height="28" rx="3" stroke={faint} strokeWidth="1" />
      <path d="M66 138 H36 V176" stroke={stroke} strokeWidth="1.3" />
      <path d="M174 138 H204 V176" stroke={stroke} strokeWidth="1.3" />
      <circle cx="36" cy="186" r="10" stroke={faint} strokeWidth="1" />
      <circle cx="204" cy="186" r="10" stroke={faint} strokeWidth="1" />
      <path d="M86 186 V212 M154 186 V212" stroke={stroke} strokeWidth="1.3" />
      <path d="M72 216 H100 M140 216 H168" stroke={faint} strokeWidth="1" />
    </svg>
  );
}

const MAP: Record<DiagramKind, () => React.ReactElement> = {
  arm: Arm,
  mesh: Mesh,
  gears: Gears,
  circuit: Circuit,
  sensor: Sensor,
  rocket: Rocket,
  comet: Comet,
  drone: Drone,
  robot: Robot,
};

/** Renders a faint drafting diagram anchored to a corner of a light band. */
export function BandDiagram({
  kind,
  position = "right",
  anchor = "bottom",
}: {
  kind: DiagramKind;
  position?: "left" | "right";
  anchor?: "top" | "bottom";
}) {
  const Shape = MAP[kind];
  return (
    <div
      aria-hidden
      className={
        "pointer-events-none absolute z-0 size-[180px] opacity-[0.55] sm:size-[220px] lg:size-[260px] lg:opacity-[0.7] " +
        (anchor === "top" ? "top-8 lg:top-10 " : "bottom-8 lg:bottom-10 ") +
        (position === "left" ? "left-1 sm:left-2" : "right-1 sm:right-2")
      }
    >
      <Shape />
    </div>
  );
}
