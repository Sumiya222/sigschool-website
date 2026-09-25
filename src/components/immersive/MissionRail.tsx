import { useScrollProgress } from "@/hooks/useScrollProgress";

function phaseFor(p: number) {
  if (p < 0.12) return "LAUNCH";
  if (p < 0.32) return "ASCENT";
  if (p < 0.52) return "ORBIT";
  if (p < 0.74) return "TRANSIT";
  return "DEEP SPACE";
}

/**
 * Mission Rail — a fixed horizontal telemetry console pinned to the bottom.
 *
 * It stays put while the reader scrolls and its readouts (phase, altitude,
 * velocity, mission progress) update live. Compact, centered, non-interactive,
 * and fades out over the footer so it never clashes with real content. Hidden
 * on small screens where horizontal space is tight.
 */
export function MissionRail() {
  const p = useScrollProgress();
  const alt = Math.round(p * 420);
  const vel = (7.9 + p * 3.1).toFixed(2);
  const pct = Math.round(p * 100);

  // Ease the console out over the last stretch so it never clashes with the footer.
  const opacity = p > 0.94 ? Math.max(0, 1 - (p - 0.94) / 0.06) : 1;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-5 z-40 hidden justify-center px-6 transition-opacity duration-300 md:flex"
      style={{ opacity }}
    >
      <div className="panel flex w-full max-w-2xl items-center gap-4 rounded-full px-5 py-2.5">
        <span className="flex shrink-0 items-center gap-2">
          <span className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
          <span className="telemetry text-cyan/90">{phaseFor(p)}</span>
        </span>
        <span aria-hidden className="h-3 w-px shrink-0 bg-white/15" />
        <span className="telemetry shrink-0 text-gray-mid">
          ALT <span className="tabular-nums text-offwhite/90">{alt}KM</span>
        </span>
        <span aria-hidden className="hidden h-3 w-px shrink-0 bg-white/15 sm:block" />
        <span className="telemetry hidden shrink-0 text-gray-mid sm:inline">
          VEL <span className="tabular-nums text-offwhite/90">{vel}KM/S</span>
        </span>

        {/* Mission progress track — inline, never overlaps the page */}
        <span className="mx-1 hidden h-px flex-1 bg-white/12 lg:block">
          <span
            className="block h-full bg-cyan shadow-[0_0_8px_var(--cyan)] transition-[width] duration-150"
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="telemetry ml-auto shrink-0 tabular-nums text-cyan lg:ml-0">
          {String(pct).padStart(3, "0")}%
        </span>
      </div>
    </div>
  );
}
