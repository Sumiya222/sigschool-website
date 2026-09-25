import { useScrollProgress } from "@/hooks/useScrollProgress";

function phaseFor(p: number) {
  if (p < 0.12) return "LAUNCH";
  if (p < 0.32) return "ASCENT";
  if (p < 0.52) return "ORBIT";
  if (p < 0.74) return "TRANSIT";
  return "DEEP SPACE";
}

/**
 * Mission Control HUD — a single cohesive frame around the viewport.
 *
 * Corner brackets sit on a consistent inset so they read as one frame that
 * *contains* the page rather than four disconnected marks. All live telemetry
 * (phase, altitude, velocity, mission progress) lives in one compact bottom
 * console so nothing overlaps the content column. The whole HUD fades out as
 * the reader reaches the footer. Entirely non-interactive.
 */
export function HUD() {
  const p = useScrollProgress();
  const alt = Math.round(p * 420);
  const vel = (7.9 + p * 3.1).toFixed(2);
  const pct = Math.round(p * 100);

  // Fade the frame out over the footer so it never clashes with real content.
  const opacity = p > 0.9 ? Math.max(0, 1 - (p - 0.9) / 0.08) : 1;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 hidden select-none transition-opacity duration-300 md:block"
      style={{ opacity }}
    >
      {/* Cohesive corner frame — consistent inset top/bottom/sides */}
      <span className="hud-bracket left-6 top-[5.5rem] border-l border-t" />
      <span className="hud-bracket right-6 top-[5.5rem] border-r border-t" />
      <span className="hud-bracket bottom-6 left-6 border-b border-l" />
      <span className="hud-bracket bottom-6 right-6 border-b border-r" />

      {/* Single bottom console — all telemetry in one place */}
      <div className="absolute inset-x-0 bottom-6 flex justify-center px-6">
        <div className="panel flex w-full max-w-2xl items-center gap-4 rounded-full px-5 py-2.5">
          <span className="flex shrink-0 items-center gap-2">
            <span className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
            <span className="telemetry text-cyan/90">{phaseFor(p)}</span>
          </span>
          <span aria-hidden className="h-3 w-px shrink-0 bg-white/15" />
          <span className="telemetry shrink-0 text-gray-mid">
            ALT <span className="text-offwhite/90">{alt}KM</span>
          </span>
          <span aria-hidden className="hidden h-3 w-px shrink-0 bg-white/15 sm:block" />
          <span className="telemetry hidden shrink-0 text-gray-mid sm:inline">
            VEL <span className="text-offwhite/90">{vel}KM/S</span>
          </span>

          {/* Mission progress track — inline, never overlaps the page */}
          <span className="mx-1 hidden h-px flex-1 bg-white/12 lg:block">
            <span
              className="block h-full bg-cyan shadow-[0_0_8px_var(--cyan)] transition-[width] duration-150"
              style={{ width: `${pct}%` }}
            />
          </span>
          <span className="telemetry ml-auto shrink-0 text-cyan lg:ml-0">
            {String(pct).padStart(3, "0")}%
          </span>
        </div>
      </div>
    </div>
  );
}
