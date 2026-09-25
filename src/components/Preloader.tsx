import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import astrobotLogo from "@/assets/astrobot-logo-light.webp";

const ease = [0.22, 1, 0.36, 1] as const;

// Boot checklist — each line "comes online" as the loader climbs past its gate.
const BOOT_LINES = [
  { at: 12, label: "INITIALIZING FLIGHT SYSTEMS", value: "v4.2.1" },
  { at: 30, label: "LOADING NAVIGATION CORE", value: "128 CH" },
  { at: 48, label: "CALIBRATING SENSOR ARRAY", value: "±0.02°" },
  { at: 66, label: "ESTABLISHING GROUND UPLINK", value: "42 MS" },
  { at: 82, label: "RENDERING STAR FIELD", value: "9.4K" },
  { at: 96, label: "ALL SYSTEMS NOMINAL", value: "GO" },
] as const;

const HOLD_AFTER_FULL = 550; // ms to linger on 100% before liftoff

export function Preloader() {
  const reduceMotion = useReducedMotion();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDashboard = pathname.startsWith("/dashboard");
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  // null until the first run; lets us tell "first mount" apart from a real
  // crossing later, without ever needing to unmount/remount this component.
  const prevIsDashboardRef = useRef<boolean | null>(null);

  useEffect(() => {
    const prev = prevIsDashboardRef.current;
    const isFirstRun = prev === null;
    const isCrossing = prev !== null && prev !== isDashboard;
    prevIsDashboardRef.current = isDashboard;

    // Only replay on first load or when actually crossing into/out of the
    // dashboard — not on every ordinary navigation between public pages (or
    // between dashboard sub-pages), which would replay this on every click.
    if (!isFirstRun && !isCrossing) return;

    setDone(false);
    setProgress(0);

    // Read the reduced-motion preference directly here (a one-off check)
    // rather than depending on the `reduceMotion` hook value below: that
    // hook resolves from null -> boolean shortly after mount, and depending
    // on it here would make this effect re-run for that internal resolution
    // too, on top of real dashboard crossings.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced motion: skip the theatrics, clear almost immediately.
    if (prefersReduced) {
      setProgress(100);
      const t = setTimeout(() => setDone(true), 200);
      return () => clearTimeout(t);
    }

    const duration = 2400;
    const start = performance.now();
    let doneTimeout: ReturnType<typeof setTimeout> | undefined;

    // setInterval rather than requestAnimationFrame: this is just a percentage
    // counter, it doesn't need frame-perfect timing, and setInterval runs on
    // the independent JS timer queue rather than being tied to paint/
    // compositor scheduling like rAF is.
    const interval = setInterval(() => {
      const elapsed = performance.now() - start;
      // ease-out so the counter sprints then settles, like a spin-up sequence
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 2.2);
      setProgress(Math.round(eased * 100));
      if (t >= 1) {
        clearInterval(interval);
        doneTimeout = setTimeout(() => setDone(true), HOLD_AFTER_FULL);
      }
    }, 30);

    return () => {
      clearInterval(interval);
      if (doneTimeout) clearTimeout(doneTimeout);
    };
  }, [isDashboard]);

  // Lock scroll while the loader is up.
  useEffect(() => {
    if (done) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [done]);

  const pct = String(progress).padStart(3, "0");

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(10px)", scale: 1.03 }}
          transition={{ duration: 0.7, ease }}
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-navy-950"
          aria-label="Loading mission control"
          role="status"
        >
          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 40%, color-mix(in oklab, var(--gold) 16%, transparent), transparent 70%)",
            }}
          />
          {/* Blueprint grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(color-mix(in oklab, var(--cyan) 9%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--cyan) 9%, transparent) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage: "radial-gradient(75% 65% at 50% 45%, #000 40%, transparent 100%)",
            }}
          />
          {/* Scanline sweep */}
          {!reduceMotion && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 h-24"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--cyan) 12%, transparent), transparent)",
              }}
              initial={{ top: "-10%" }}
              animate={{ top: "110%" }}
              transition={{ duration: 2.6, ease: "linear", repeat: Infinity }}
            />
          )}

          {/* HUD corner brackets */}
          <span aria-hidden className="hud-bracket left-5 top-5 border-l-2 border-t-2" />
          <span aria-hidden className="hud-bracket right-5 top-5 border-r-2 border-t-2" />
          <span aria-hidden className="hud-bracket bottom-5 left-5 border-b-2 border-l-2" />
          <span aria-hidden className="hud-bracket bottom-5 right-5 border-b-2 border-r-2" />

          <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6">
            {/* Top telemetry strip */}
            <div className="mb-8 flex w-full items-center justify-between">
              <span className="telemetry text-cyan/80">STATION · KRC-01</span>
              <span className="telemetry flex items-center gap-1.5 text-gold-bright/90">
                <span className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
                LINK LIVE
              </span>
            </div>

            {/* Logo + wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-full blur-2xl"
                  style={{
                    background:
                      "radial-gradient(circle, color-mix(in oklab, var(--gold) 55%, transparent), transparent 70%)",
                  }}
                />
                <img
                  src={astrobotLogo}
                  alt="AstroBot Academy"
                  width={247}
                  height={66}
                  className="h-14 w-auto object-contain"
                />
              </div>
              <h1 className="mt-4 font-display text-xl font-bold tracking-tight text-foreground">
                ASTROBOT MISSION CONTROL
              </h1>
              <p className="telemetry mt-1 text-gray-mid">PRE-FLIGHT SEQUENCE</p>
            </motion.div>

            {/* Big counter */}
            <div className="mt-9 flex w-full items-end justify-between">
              <span className="font-mono text-6xl font-bold leading-none text-cosmic tabular-nums">
                {pct}
                <span className="ml-1 align-top text-2xl text-cyan-bright">%</span>
              </span>
              <span className="telemetry pb-1 text-right text-gray-mid">
                T-MINUS
                <br />
                <span className="text-cyan-bright">
                  {(100 - progress) / 25 >= 0 ? (((100 - progress) / 100) * 8).toFixed(1) : "0.0"}s
                </span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, var(--gold), var(--cyan-bright))",
                  boxShadow: "0 0 12px color-mix(in oklab, var(--cyan) 60%, transparent)",
                }}
              />
            </div>

            {/* Boot checklist */}
            <ul className="mt-7 w-full space-y-2">
              {BOOT_LINES.map((line) => {
                const online = progress >= line.at;
                return (
                  <li
                    key={line.label}
                    className={
                      "flex items-center justify-between font-mono text-[0.7rem] tracking-wide transition-colors duration-300 " +
                      (online ? "text-offwhite/85" : "text-gray-mid/40")
                    }
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={
                          "inline-block size-1.5 rounded-full transition-all duration-300 " +
                          (online ? "bg-cyan shadow-[0_0_8px_var(--cyan)]" : "bg-white/20")
                        }
                      />
                      {line.label}
                    </span>
                    <span className="flex items-center gap-2.5">
                      <span
                        className={
                          "telemetry tabular-nums transition-colors duration-300 " +
                          (online ? "text-offwhite/70" : "text-gray-mid/25")
                        }
                      >
                        {online ? line.value : "----"}
                      </span>
                      <span
                        className={
                          "telemetry w-9 text-right transition-colors duration-300 " +
                          (online ? "text-cyan" : "text-gray-mid/30")
                        }
                      >
                        {online ? "OK" : "···"}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
