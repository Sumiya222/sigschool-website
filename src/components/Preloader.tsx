import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

const ease = [0.22, 1, 0.36, 1] as const;

const HOLD_AFTER_FULL = 450; // ms to linger on 100% before fading out

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

    const duration = 1400;
    const start = performance.now();
    let doneTimeout: ReturnType<typeof setTimeout> | undefined;

    // setInterval rather than requestAnimationFrame: this is just a percentage
    // counter, it doesn't need frame-perfect timing, and setInterval runs on
    // the independent JS timer queue rather than being tied to paint/
    // compositor scheduling like rAF is.
    const interval = setInterval(() => {
      const elapsed = performance.now() - start;
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

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(10px)", scale: 1.03 }}
          transition={{ duration: 0.6, ease }}
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-navy-950"
          aria-label={`Loading ${BRAND.shortName}`}
          role="status"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 40%, color-mix(in oklab, var(--gold) 14%, transparent), transparent 70%)",
            }}
          />

          <div className="relative z-10 flex w-full max-w-sm flex-col items-center px-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="flex flex-col items-center"
            >
              <Logo variant="light" withWordmark={false} className="scale-[1.8]" />
              <h1 className="mt-6 font-display text-xl font-semibold tracking-tight text-foreground">
                {BRAND.shortName}
              </h1>
              <p className="mt-1 text-small text-gray-mid">{BRAND.tagline}</p>
            </motion.div>

            <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, var(--gold), var(--gold-bright))",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
