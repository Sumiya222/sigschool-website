// SSR-safe shared state for the immersive Mission Control scene.
// Read directly inside useFrame (no React re-renders) and via useScrollProgress
// for HUD telemetry.

export const sceneState = {
  scrollP: 0, // 0..1 whole-page scroll progress
  px: 0, // smoothed pointer x (-1..1)
  py: 0, // smoothed pointer y (-1..1)
  tpx: 0, // target pointer x
  tpy: 0, // target pointer y
  reduced: false,
  // Whole-site cinematic navigation — each route is a "chapter" of the journey.
  chapter: 0, // current smoothed chapter (float)
  targetChapter: 0, // target chapter for the active route
  chapterCount: 1,
};

/**
 * Route -> chapter index mapping. Ordered so scrolling/navigating feels like
 * travelling further out into the system. Unknown routes fall back to 0.
 */
const CHAPTERS: Record<string, number> = {
  "/": 0,
  "/programs": 1,
  "/schools": 2,
  "/students": 3,
  "/about": 5,
  "/contact": 6,
  "/careers": 7,
};

sceneState.chapterCount = Object.keys(CHAPTERS).length;

export function setSceneChapter(pathname: string) {
  const key = pathname.replace(/\/+$/, "") || "/";
  sceneState.targetChapter = CHAPTERS[key] ?? 0;
}

function updateScroll() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  sceneState.scrollP = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

if (typeof window !== "undefined") {
  sceneState.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", updateScroll, { passive: true });
  window.addEventListener(
    "pointermove",
    (e) => {
      sceneState.tpx = (e.clientX / window.innerWidth) * 2 - 1;
      sceneState.tpy = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true },
  );
  updateScroll();
}
