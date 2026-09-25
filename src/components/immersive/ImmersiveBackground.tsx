import { Suspense, lazy, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useReducedMotion } from "framer-motion";
import { setSceneChapter } from "@/components/immersive/sceneState";
import { useIsMobile } from "@/hooks/use-mobile";

const GlobalScene = lazy(() => import("@/components/immersive/GlobalScene"));

/**
 * Site-wide immersive backdrop. Renders a lightweight CSS deep-space gradient
 * on every route (also the SSR / reduced-motion / low-power fallback), and
 * layers the persistent WebGL star system on top for capable desktops. The
 * canvas never unmounts across navigation, so the journey stays continuous.
 */
export function ImmersiveBackground() {
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDashboard = pathname.startsWith("/dashboard");

  useEffect(() => setMounted(true), []);

  // Drive the cinematic camera to the right "chapter" whenever the route changes.
  useEffect(() => {
    setSceneChapter(pathname);
  }, [pathname]);

  const useLiveScene = mounted && !isMobile && !reduceMotion;

  // Dashboard has its own UI and doesn't show the space backdrop, but the
  // canvas below must stay mounted (never torn down) even while hidden here —
  // toggling it on/off via unmount previously caused the WebGL context to be
  // destroyed and recreated on every crossing into/out of the dashboard,
  // which can throw "Context Lost" and disrupt unrelated effects elsewhere on
  // the page (e.g. the boot Preloader's counter freezing at 0%). Hiding via
  // CSS keeps the same context alive the whole session, matching the "never
  // unmounts across navigation" contract this component documents below.
  return (
    <div style={isDashboard ? { display: "none" } : undefined}>
      {/* CSS deep-space base — always present, sits furthest back */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20"
        style={{
          background:
            "radial-gradient(1200px 800px at 72% -10%, color-mix(in oklab, var(--gold) 20%, transparent) 0%, transparent 60%), radial-gradient(900px 700px at 8% 110%, color-mix(in oklab, var(--cyan) 12%, transparent) 0%, transparent 55%), var(--navy-950)",
        }}
      />

      {/* Persistent WebGL star system */}
      {useLiveScene && (
        <Suspense fallback={null}>
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10"
            style={{ position: "fixed", inset: 0, zIndex: -10, pointerEvents: "none" }}
          >
            <GlobalScene />
          </div>
        </Suspense>
      )}

      {/* Readability scrim + fine grain over the whole frame */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[5]"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--navy-950) 42%, transparent) 0%, color-mix(in oklab, var(--navy-950) 18%, transparent) 45%, color-mix(in oklab, var(--navy-950) 48%, transparent) 100%)",
        }}
      />
      <div aria-hidden className="grain pointer-events-none fixed inset-0 z-30 opacity-[0.035]" />
    </div>
  );
}
