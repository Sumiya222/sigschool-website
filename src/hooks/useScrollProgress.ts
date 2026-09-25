import { useEffect, useState } from "react";
import { sceneState } from "@/components/immersive/sceneState";

/** rAF-throttled page scroll progress (0..1) for HUD telemetry. */
export function useScrollProgress() {
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = -1;
    const loop = () => {
      const v = sceneState.scrollP;
      if (Math.abs(v - last) > 0.0015) {
        last = v;
        setP(v);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return p;
}
